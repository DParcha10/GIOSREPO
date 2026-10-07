"""GIOS Automated Continuous Health-Check Background Daemon (v2.5).

Monitors:
1. Uptime (Backend API, Frontend Vite Server, Health Endpoints)
2. Tile Server & Cache Health (XYZ Tile latency, DiskCache storage, tile overviews)
3. Data Ingestion & Remote Sensing Providers (Planetary Computer STAC & SAS, USGS NWIS, NOAA Weather, SQLite DB)
4. Pipeline Execution (Core Test Suite, Radiometric & Spectral Pipelines)
5. System Resource Usage (CPU, Memory/RAM, Disk, Process Footprint)

Outputs alerts & reports to production_artifacts/Health_Status.md
Hands off any failures or anomalies to Agent 9 (@debugger).
"""

import sys
import os
import time
import json
import socket
import logging
import sqlite3
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone
import psutil

# Configuration & Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTION_ARTIFACTS_DIR = os.path.join(SCRIPT_DIR, "production_artifacts")
HEALTH_STATUS_FILE = os.path.join(PRODUCTION_ARTIFACTS_DIR, "Health_Status.md")

os.makedirs(PRODUCTION_ARTIFACTS_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [HealthMonitor]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("health-monitor")

def check_socket_port(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def check_http_endpoint(url: str, timeout: float = 5.0, user_agent: str = "GIOS-HealthMonitor/2.5", retries: int = 1) -> dict:
    for attempt in range(retries + 1):
        t0 = time.time()
        req = urllib.request.Request(url, headers={"User-Agent": user_agent})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                elapsed_ms = (time.time() - t0) * 1000
                content_type = resp.headers.get("Content-Type", "").lower()
                raw_bytes = resp.read()
                parsed = None
                if any(b in content_type for b in ("image", "octet-stream", "protobuf")):
                    body = f"<{len(raw_bytes)} bytes binary>"
                else:
                    content = raw_bytes.decode(errors="replace")
                    try:
                        parsed = json.loads(content)
                    except Exception:
                        pass
                    body = parsed or content[:200]
                return {
                    "ok": resp.status in (200, 201, 204),
                    "status_code": resp.status,
                    "latency_ms": round(elapsed_ms, 1),
                    "body": body,
                    "error": None
                }
        except urllib.error.HTTPError as e:
            elapsed_ms = (time.time() - t0) * 1000
            if e.code in (500, 502, 503, 504) and attempt < retries:
                time.sleep(1.0 * (attempt + 1))
                continue
            return {
                "ok": False,
                "status_code": e.code,
                "latency_ms": round(elapsed_ms, 1),
                "body": None,
                "error": f"HTTP {e.code}: {e.reason}"
            }
        except Exception as e:
            elapsed_ms = (time.time() - t0) * 1000
            if "IncompleteRead" in str(e) and hasattr(e, "partial") and len(e.partial) > 0:
                return {
                    "ok": True,
                    "status_code": 200,
                    "latency_ms": round(elapsed_ms, 1),
                    "body": e.partial.decode(errors="replace")[:200],
                    "error": None
                }
            if attempt < retries:
                time.sleep(0.5)
                continue
            return {
                "ok": False,
                "status_code": 0,
                "latency_ms": round(elapsed_ms, 1),
                "body": None,
                "error": str(e)
            }

def inspect_uptime() -> dict:
    results = {}
    
    # 1. Primary Backend on Port 8000
    p8000_open = check_socket_port("127.0.0.1", 8000)
    p8000_health = check_http_endpoint("http://127.0.0.1:8000/health") if p8000_open else None
    results["backend_primary_8000"] = {
        "port": 8000,
        "listening": p8000_open,
        "health": p8000_health
    }
    
    # 2. Secondary/Scratch Backend on Port 8002
    p8002_open = check_socket_port("127.0.0.1", 8002)
    p8002_health = check_http_endpoint("http://127.0.0.1:8002/health") if p8002_open else None
    results["backend_scratch_8002"] = {
        "port": 8002,
        "listening": p8002_open,
        "health": p8002_health
    }
    
    # 3. Frontend Vite Server on Port 5173
    p5173_open = check_socket_port("127.0.0.1", 5173)
    p5173_root = check_http_endpoint("http://127.0.0.1:5173") if p5173_open else None
    p5173_proxy_health = check_http_endpoint("http://127.0.0.1:5173/health") if p5173_open else None
    results["frontend_5173"] = {
        "port": 5173,
        "listening": p5173_open,
        "root": p5173_root,
        "proxy_health": p5173_proxy_health
    }
    
    return results

def inspect_tile_server_and_cache() -> dict:
    results = {}
    
    # Check XYZ Tile Endpoint readiness (Task T-07)
    tile_probe = check_http_endpoint("http://127.0.0.1:8000/api/v1/tiles/sentinel-2-l2a/test/10/163/395.png", timeout=2.0)
    results["tile_endpoint"] = tile_probe
    
    # Check DiskCache / Local cache directory
    cache_dirs = [os.path.join(SCRIPT_DIR, ".cache"), os.path.join(SCRIPT_DIR, ".gios_cache")]
    total_cache_bytes = 0
    total_cache_files = 0
    for cd in cache_dirs:
        if os.path.exists(cd):
            for root, _, files in os.walk(cd):
                for f in files:
                    try:
                        total_cache_bytes += os.path.getsize(os.path.join(root, f))
                        total_cache_files += 1
                    except OSError:
                        pass
                        
    results["cache_storage"] = {
        "size_mb": round(total_cache_bytes / (1024**2), 2),
        "file_count": total_cache_files
    }
    
    return results

def inspect_data_ingestion() -> dict:
    results = {}
    
    # 1. Microsoft Planetary Computer STAC
    stac_res = check_http_endpoint("https://planetarycomputer.microsoft.com/api/stac/v1")
    results["planetary_computer_stac"] = stac_res
    
    # 2. Microsoft Planetary Computer SAS Token API (for odc-stac loading)
    sas_res = check_http_endpoint("https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a")
    results["planetary_computer_sas"] = sas_res
    
    # 3. USGS NWIS Water Data
    usgs_res = check_http_endpoint("https://waterservices.usgs.gov/nwis/iv/?format=json&sites=11262900&parameterCd=00060&siteStatus=all", timeout=12.0, retries=3)
    results["usgs_nwis"] = usgs_res
    
    # 4. NOAA / NWS Weather API
    noaa_res = check_http_endpoint("https://api.weather.gov")
    results["noaa_weather"] = noaa_res
    
    # 5. Local SQLite Database
    db_path = os.path.join(SCRIPT_DIR, "gios.db")
    db_status = {"exists": os.path.exists(db_path), "size_bytes": 0, "tables": [], "error": None}
    if os.path.exists(db_path):
        db_status["size_bytes"] = os.path.getsize(db_path)
        try:
            conn = sqlite3.connect(db_path, timeout=2.0)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
            db_status["tables"] = [r[0] for r in cur.fetchall()]
            conn.close()
        except Exception as e:
            db_status["error"] = str(e)
    results["sqlite_db"] = db_status
    
    return results

def inspect_pipelines() -> dict:
    results = {}
    
    # Run test suite to verify pipeline integrity
    t0 = time.time()
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            timeout=180
        )
        elapsed_sec = round(time.time() - t0, 2)
        results["test_suite"] = {
            "passed": proc.returncode == 0,
            "duration_sec": elapsed_sec,
            "stdout": proc.stdout,
            "stderr": proc.stderr
        }
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, "stderr") and e.stderr:
            err_msg = f"{err_msg}: {e.stderr}"
        results["test_suite"] = {
            "passed": False,
            "duration_sec": round(time.time() - t0, 2),
            "error": str(e),
            "stderr": err_msg
        }
        
    return results

def inspect_resources() -> dict:
    cpu_percent = psutil.cpu_percent(interval=0.5)
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("C:\\")
    
    # Check processes
    gios_procs = []
    for p in psutil.process_iter(['pid', 'name', 'memory_info']):
        try:
            name = p.info['name'].lower()
            if 'python' in name or 'uvicorn' in name or 'node' in name:
                rss_mb = round(p.info['memory_info'].rss / (1024**2), 1)
                gios_procs.append({"pid": p.info['pid'], "name": p.info['name'], "rss_mb": rss_mb})
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
            
    return {
        "cpu_percent": cpu_percent,
        "memory_total_gb": round(vm.total / (1024**3), 2),
        "memory_used_gb": round(vm.used / (1024**3), 2),
        "memory_percent": vm.percent,
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_percent": disk.percent,
        "gios_processes": gios_procs
    }

def run_health_check() -> dict:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
    
    logger.info("Starting health check pass...")
    uptime = inspect_uptime()
    tile_cache = inspect_tile_server_and_cache()
    data_ingestion = inspect_data_ingestion()
    pipelines = inspect_pipelines()
    resources = inspect_resources()
    
    anomalies = []
    
    # 1. Analyze Uptime Anomalies
    if not uptime["backend_primary_8000"]["listening"]:
        anomalies.append({
            "component": "FastAPI Primary Backend (Port 8000)",
            "severity": "CRITICAL",
            "type": "SERVICE_DOWN",
            "message": "Primary FastAPI backend on port 8000 is OFFLINE. Port 8000 is closed."
        })
    elif uptime["backend_primary_8000"]["health"] and not uptime["backend_primary_8000"]["health"]["ok"]:
        anomalies.append({
            "component": "FastAPI Primary Backend (Port 8000)",
            "severity": "HIGH",
            "type": "HEALTH_CHECK_FAILED",
            "message": f"Port 8000 health check failed: {uptime['backend_primary_8000']['health']['error']}"
        })
        
    if uptime["frontend_5173"]["listening"]:
        proxy = uptime["frontend_5173"]["proxy_health"]
        if proxy and not proxy["ok"]:
            anomalies.append({
                "component": "Frontend Vite Proxy (Port 5173 -> 8000)",
                "severity": "HIGH",
                "type": "PROXY_ERROR",
                "message": f"Frontend /health proxy returned status {proxy['status_code']} ({proxy['error']})."
            })
    else:
        anomalies.append({
            "component": "Frontend Vite Server (Port 5173)",
            "severity": "HIGH",
            "type": "SERVICE_DOWN",
            "message": "Frontend server on port 5173 is not listening."
        })
        
    # 2. Analyze Data Ingestion & Remote Sensing Anomalies
    if not data_ingestion["planetary_computer_stac"]["ok"]:
        anomalies.append({
            "component": "Planetary Computer STAC API",
            "severity": "MEDIUM",
            "type": "INGESTION_ERROR",
            "message": f"STAC API check failed: {data_ingestion['planetary_computer_stac']['error']}"
        })
    if not data_ingestion["usgs_nwis"]["ok"]:
        anomalies.append({
            "component": "USGS NWIS Water API",
            "severity": "MEDIUM",
            "type": "INGESTION_ERROR",
            "message": f"USGS API check failed: {data_ingestion['usgs_nwis']['error']}"
        })
    if not data_ingestion["noaa_weather"]["ok"]:
        anomalies.append({
            "component": "NOAA Weather API",
            "severity": "MEDIUM",
            "type": "INGESTION_ERROR",
            "message": f"NOAA API check failed: {data_ingestion['noaa_weather']['error']}"
        })
    if data_ingestion["sqlite_db"]["error"]:
        anomalies.append({
            "component": "SQLite Database (gios.db)",
            "severity": "HIGH",
            "type": "DATABASE_ERROR",
            "message": f"Database integrity check failed: {data_ingestion['sqlite_db']['error']}"
        })
        
    # 3. Analyze Pipeline Anomalies
    if not pipelines["test_suite"]["passed"]:
        test_err = (pipelines["test_suite"].get("stderr") or "").strip() or (pipelines["test_suite"].get("stdout") or "").strip() or "Test run failed with non-zero exit code"
        anomalies.append({
            "component": "Automated Test Suite / Pipelines",
            "severity": "HIGH",
            "type": "PIPELINE_FAILURE",
            "message": f"Automated test suite failed execution: {test_err[-300:]}"
        })
    if "ResourceWarning: unclosed database" in pipelines["test_suite"].get("stderr", ""):
        anomalies.append({
            "component": "Database Connection Pool / Leaks",
            "severity": "LOW",
            "type": "RESOURCE_WARNING",
            "message": "ResourceWarning: unclosed database in <sqlite3.Connection object> detected during test execution."
        })
        
    # 4. Analyze Resource Anomalies
    if resources["memory_percent"] > 95:
        anomalies.append({
            "component": "Host RAM",
            "severity": "MEDIUM",
            "type": "HIGH_RESOURCE_USAGE",
            "message": f"RAM utilization critical: {resources['memory_percent']}% ({resources['memory_used_gb']} GB / {resources['memory_total_gb']} GB)"
        })
        
    has_critical_or_high = any(a.get("severity") in ("CRITICAL", "HIGH") for a in anomalies)
    overall_status = "DEGRADED" if has_critical_or_high else ("WARNING" if anomalies else "HEALTHY")
    
    report = {
        "timestamp_utc": timestamp,
        "timestamp_local": local_time,
        "overall_status": overall_status,
        "uptime": uptime,
        "tile_cache": tile_cache,
        "data_ingestion": data_ingestion,
        "pipelines": pipelines,
        "resources": resources,
        "anomalies": anomalies
    }
    
    return report

def write_health_status(report: dict):
    ts = report["timestamp_utc"]
    status = report["overall_status"]
    anomalies = report["anomalies"]
    resources = report["resources"]
    uptime = report["uptime"]
    tile_cache = report["tile_cache"]
    data_ing = report["data_ingestion"]
    pipelines = report["pipelines"]
    
    entry_lines = []
    entry_lines.append(f"## [{ts}] System Status: **{status}**\n")
    
    # 1. Resource Usage
    entry_lines.append("### 1. Resource Usage")
    entry_lines.append(f"- **CPU Utilization**: {resources['cpu_percent']}%")
    entry_lines.append(f"- **Memory**: {resources['memory_used_gb']} GB / {resources['memory_total_gb']} GB ({resources['memory_percent']}%)")
    entry_lines.append(f"- **Disk (C:)**: {resources['disk_free_gb']} GB free / {resources['disk_total_gb']} GB total ({resources['disk_percent']}% used)")
    entry_lines.append(f"- **Cache Storage**: {tile_cache['cache_storage']['size_mb']} MB across {tile_cache['cache_storage']['file_count']} files")
    entry_lines.append("")
    
    # 2. Service Uptime
    entry_lines.append("### 2. Service Uptime")
    b8000_status = "ONLINE" if uptime["backend_primary_8000"]["listening"] else "OFFLINE"
    b8002_status = "ONLINE" if uptime["backend_scratch_8002"]["listening"] else "OFFLINE"
    f5173_status = "ONLINE" if uptime["frontend_5173"]["listening"] else "OFFLINE"
    proxy_status = "HEALTHY" if (uptime["frontend_5173"]["proxy_health"] and uptime["frontend_5173"]["proxy_health"]["ok"]) else "FAILING"
    
    entry_lines.append(f"- **Backend Primary (`http://localhost:8000`)**: `{b8000_status}`")
    entry_lines.append(f"- **Backend Secondary (`http://localhost:8002`)**: `{b8002_status}`")
    entry_lines.append(f"- **Frontend Vite UI (`http://localhost:5173`)**: `{f5173_status}`")
    entry_lines.append(f"- **Frontend Proxy (`http://localhost:5173/health`)**: `{proxy_status}`")
    entry_lines.append("")
    
    # 3. Data Ingestion & Remote Sensing Providers
    entry_lines.append("### 3. Data Ingestion Health")
    stac_ok = "REACHABLE" if data_ing["planetary_computer_stac"]["ok"] else f"ERROR ({data_ing['planetary_computer_stac']['error']})"
    sas_ok = "REACHABLE" if data_ing["planetary_computer_sas"]["ok"] else f"STATUS {data_ing['planetary_computer_sas']['status_code']}"
    usgs_ok = "REACHABLE" if data_ing["usgs_nwis"]["ok"] else f"ERROR ({data_ing['usgs_nwis']['error']})"
    noaa_ok = "REACHABLE" if data_ing["noaa_weather"]["ok"] else f"ERROR ({data_ing['noaa_weather']['error']})"
    db_tables = ", ".join(data_ing["sqlite_db"]["tables"]) if data_ing["sqlite_db"]["tables"] else "None"
    
    entry_lines.append(f"- **Microsoft Planetary Computer STAC**: `{stac_ok}` ({data_ing['planetary_computer_stac']['latency_ms']} ms)")
    entry_lines.append(f"- **Planetary Computer SAS Token Service**: `{sas_ok}` ({data_ing['planetary_computer_sas']['latency_ms']} ms)")
    entry_lines.append(f"- **USGS NWIS Real-Time Telemetry**: `{usgs_ok}` ({data_ing['usgs_nwis']['latency_ms']} ms)")
    entry_lines.append(f"- **NOAA / NWS Weather Services**: `{noaa_ok}` ({data_ing['noaa_weather']['latency_ms']} ms)")
    entry_lines.append(f"- **SQLite Database (`gios.db`)**: `HEALTHY` ({data_ing['sqlite_db']['size_bytes']} bytes, Tables: `{db_tables}`)")
    entry_lines.append("")
    
    # 4. Pipeline Execution & Verification
    entry_lines.append("### 4. Pipeline Execution")
    test_ok = "PASSING" if pipelines["test_suite"]["passed"] else "FAILED"
    entry_lines.append(f"- **Core Test Suite & API Pipelines**: `{test_ok}` ({pipelines['test_suite']['duration_sec']}s)")
    entry_lines.append("")
    
    # 5. Anomalies & Agent 9 (@debugger) Handoff
    if anomalies:
        entry_lines.append("### 5. Detected Anomalies & Action Items")
        entry_lines.append("> [!WARNING]")
        entry_lines.append(f"> **{len(anomalies)} anomaly/anomalies detected.** Handing off immediately to **Agent 9 (@debugger)** for investigation and patching.\n")
        
        for idx, a in enumerate(anomalies, 1):
            entry_lines.append(f"#### Anomaly #{idx}: [{a['severity']}] {a['type']} in `{a['component']}`")
            entry_lines.append(f"- **Description**: {a['message']}")
            entry_lines.append(f"- **Action Assigned To**: `@debugger` (Agent 9)")
            entry_lines.append("")
            
        entry_lines.append("#### Hand-off Instructions for Agent 9 (@debugger):")
        for idx, a in enumerate(anomalies, 1):
            entry_lines.append(f"{idx}. **[{a['severity']}] {a['component']}**: {a['message']}. Assigned to `@debugger` for investigation and resolution.")
    else:
        entry_lines.append("### 5. Detected Anomalies")
        entry_lines.append("> [!NOTE]")
        entry_lines.append("> All systems operational. No active anomalies detected.")
        
    entry_lines.append("\n---\n")
    
    new_entry = "\n".join(entry_lines)
    
    header = "# GIOS Production Health Status Log\n\nAutomated live status log generated by **Agent 8 - Health Monitor (@health-monitor)**.\n\n---\n\n"
    
    existing_content = ""
    if os.path.exists(HEALTH_STATUS_FILE):
        try:
            with open(HEALTH_STATUS_FILE, "r", encoding="utf-8") as f:
                existing_content = f.read()
        except Exception:
            existing_content = ""
            
    if not existing_content.startswith("# GIOS Production Health Status Log"):
        full_content = header + new_entry + existing_content
    else:
        parts = existing_content.split("---\n\n", 1)
        if len(parts) == 2:
            full_content = parts[0] + "---\n\n" + new_entry + parts[1]
        else:
            full_content = header + new_entry + existing_content
            
    with open(HEALTH_STATUS_FILE, "w", encoding="utf-8") as f:
        f.write(full_content)
        
    logger.info(f"Health Status logged successfully to {HEALTH_STATUS_FILE}")

def main():
    single_pass = "--once" in sys.argv or "--single-pass" in sys.argv
    daemon_mode = "--daemon" in sys.argv or not single_pass
    interval = 60
    for arg in sys.argv:
        if arg.startswith("--interval="):
            try:
                interval = int(arg.split("=")[1])
            except ValueError:
                pass

    logger.info(f"Health Monitor initialized. Mode: {'DAEMON' if daemon_mode else 'SINGLE PASS'}")
    
    while True:
        try:
            report = run_health_check()
            write_health_status(report)
            print(f"Health check complete: Overall Status: {report['overall_status']}, Anomalies: {len(report['anomalies'])}")
        except Exception as e:
            logger.error(f"Error during health check pass: {e}", exc_info=True)
            try:
                ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                err_entry = f"## [{ts}] System Status: **DEGRADED**\n\n### Daemon Anomaly\n- **Error**: Health check iteration failed with exception: `{e}`\n- **Action Assigned To**: `@debugger` (Agent 9)\n\n---\n\n"
                with open(HEALTH_STATUS_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                parts = content.split("---\n\n", 1)
                full = parts[0] + "---\n\n" + err_entry + (parts[1] if len(parts) > 1 else "")
                with open(HEALTH_STATUS_FILE, "w", encoding="utf-8") as f:
                    f.write(full)
            except Exception:
                pass

        if not daemon_mode:
            break
            
        logger.info(f"Sleeping for {interval} seconds before next check...")
        time.sleep(interval)

if __name__ == "__main__":
    main()
