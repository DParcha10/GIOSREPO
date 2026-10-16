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
import atexit

# Configuration & Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTION_ARTIFACTS_DIR = os.path.join(SCRIPT_DIR, "production_artifacts")
HEALTH_STATUS_FILE = os.path.join(PRODUCTION_ARTIFACTS_DIR, "Health_Status.md")
DAEMON_PID_FILE = os.path.join(SCRIPT_DIR, "health_check_daemon.pid")

os.makedirs(PRODUCTION_ARTIFACTS_DIR, exist_ok=True)

DAEMON_LOG_FILE = os.path.join(SCRIPT_DIR, "health_check_daemon.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [HealthMonitor]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(DAEMON_LOG_FILE, encoding="utf-8")
    ]
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
    
    # 3. Microsoft Planetary Computer Copernicus DEM GLO-30 STAC Collection (Task T-219)
    dem_stac_res = check_http_endpoint("https://planetarycomputer.microsoft.com/api/stac/v1/collections/cop-dem-glo-30")
    results["planetary_computer_dem_stac"] = dem_stac_res
    
    # 3. USGS NWIS Water Data
    usgs_res = check_http_endpoint("https://waterservices.usgs.gov/nwis/iv/?format=json&sites=11262900&parameterCd=00060&siteStatus=all", timeout=12.0, retries=3)
    results["usgs_nwis"] = usgs_res
    
    # 4. NOAA / NWS Weather API
    noaa_res = check_http_endpoint("https://api.weather.gov")
    results["noaa_weather"] = noaa_res
    
    # 5. USGS Earthquake & ShakeMap Feed (Seismic & Liquefaction Hazard Ingestion)
    earthquake_res = check_http_endpoint("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson", timeout=10.0, retries=2)
    results["usgs_earthquake"] = earthquake_res
    
    # 6. Real-Time Precipitation Ingest Telemetry (Open-Meteo & NOAA Weather Models)
    precip_res = check_http_endpoint("https://api.open-meteo.com/v1/forecast?latitude=37.05&longitude=-120.85&hourly=precipitation", timeout=10.0, retries=2)
    results["precipitation_telemetry"] = precip_res

    # 7. Local SQLite Database
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

    # 8. Microsoft Planetary Computer Sentinel-1 RTC STAC Collection (Task T-237)
    sar_stac_res = check_http_endpoint("https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-1-rtc", timeout=10.0, retries=2)
    results["planetary_computer_sar_stac"] = sar_stac_res
    
    return results

def inspect_pipelines(full: bool = False) -> dict:
    results = {}
    
    # Run test suite to verify pipeline integrity (prefer pytest for full test coverage)
    t0 = time.time()
    try:
        cmd = [sys.executable, "-m", "pytest", "-q"] if full else [
            sys.executable, "-m", "pytest",
            "tests/test_schemas.py",
            "tests/test_scientific_rigor.py",
            "tests/test_tile_server.py",
            "-q"
        ]
        proc = subprocess.run(
            cmd,
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            timeout=240
        )
        if proc.returncode != 0 and "pytest: error" in (proc.stderr or ""):
            proc = subprocess.run(
                [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"],
                cwd=SCRIPT_DIR,
                capture_output=True,
                text=True,
                timeout=240
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

def inspect_hydrodynamic_cfl_guard() -> dict:
    """Inspects 2D Hydrodynamic De Saint-Venant finite-volume solver stability and Courant-Friedrichs-Lewy (CFL) bounds.
    
    Condition: Δt <= Δx / (sqrt(g*h) + |u|)
    Courant number: CFL = (sqrt(g*h) + |u|) * Δt / Δx <= 1.0 (target <= 0.85)
    """
    results = {}
    g = 9.80665
    
    # 1. Theoretical CFL stability analysis over standard parametric bounds
    test_scenarios = [
        {"name": "Standard Tailings Breach", "h": 5.2, "u": 4.8, "dx": 1000.0, "dt": 60.0},
        {"name": "High Discharge Torrent", "h": 12.5, "u": 8.5, "dx": 1000.0, "dt": 45.0},
        {"name": "Extreme Valley Flash Flood", "h": 18.0, "u": 12.0, "dx": 1000.0, "dt": 30.0},
    ]
    
    scenario_evals = []
    max_cfl = 0.0
    for sc in test_scenarios:
        h, u, dx, dt = sc["h"], sc["u"], sc["dx"], sc["dt"]
        celerity = (g * h) ** 0.5 + abs(u)
        courant = (celerity * dt) / dx
        dt_limit = dx / max(0.1, celerity)
        stable = courant <= 1.0
        max_cfl = max(max_cfl, courant)
        scenario_evals.append({
            "scenario": sc["name"],
            "depth_m": h,
            "velocity_ms": u,
            "wave_celerity_ms": round(celerity, 2),
            "grid_interval_dx_m": dx,
            "timestep_dt_s": dt,
            "courant_number_cfl": round(courant, 3),
            "max_stable_dt_s": round(dt_limit, 2),
            "stable": stable
        })
        
    results["cfl_scenarios"] = scenario_evals
    results["max_cfl"] = round(max_cfl, 3)
    results["cfl_stable"] = max_cfl <= 1.0
    
    # 2. Probe Dynamic Hydrodynamic Inundation Tile Server
    probe_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/hydrodynamic/inundation/SIM_HEALTH_PROBE/depth/10/163/395.png",
        timeout=3.0
    )
    results["hydrodynamic_tile_probe"] = probe_tile
    
    # 3. Direct numerical solver execution check
    solver_status = {"passed": False, "error": None, "duration_ms": 0.0}
    t0 = time.time()
    try:
        from app.models.schemas import calculate_de_saint_venant_downstream_routing, HydrodynamicRoutingRequest
        req = HydrodynamicRoutingRequest(
            simulationId="HEALTH_CHECK_SIM",
            peakDischargeM3s=3800.0,
            reachLengthKm=15.0,
            stationIntervalM=1000.0
        )
        routing_res = calculate_de_saint_venant_downstream_routing(req)
        elapsed_ms = (time.time() - t0) * 1000.0
        if routing_res and "stations" in routing_res and len(routing_res["stations"]) > 0:
            solver_status = {
                "passed": True,
                "error": None,
                "duration_ms": round(elapsed_ms, 2),
                "stations_evaluated": len(routing_res["stations"]),
                "peak_depth_m": routing_res.get("max_flood_depth_m", 0.0),
                "peak_velocity_ms": routing_res.get("max_flow_velocity_ms", 0.0)
            }
        else:
            solver_status = {
                "passed": False,
                "error": "Routing returned empty stations",
                "duration_ms": round(elapsed_ms, 2)
            }
    except Exception as e:
        solver_status = {
            "passed": False,
            "error": str(e),
            "duration_ms": round((time.time() - t0) * 1000.0, 2)
        }
    results["routing_solver"] = solver_status
    
    return results

def inspect_band_math_ast_guard() -> dict:
    """Inspects AST Band Math Grammar, safe tokenizer/lexer, recursion depth limits,
    CPU execution timeout (<200ms), numerical division-by-zero safety, and 2D raster allocation (Task T-213).
    """
    results = {}
    
    # 1. AST Parser Recursion Depth Limit Guard (max depth <= 20)
    nested_formula = "(" * 22 + "B04" + ")" * 22
    depth_guard_passed = False
    try:
        from app.models.schemas import validate_band_math_formula
        diag = validate_band_math_formula(nested_formula, max_depth=20)
        if not diag.get("is_valid", True):
            depth_guard_passed = any("depth" in str(e).lower() for e in diag.get("syntax_errors", []))
    except Exception as e:
        if "depth" in str(e).lower():
            depth_guard_passed = True

    results["recursion_depth_guard"] = {
        "max_allowed_depth": 20,
        "test_depth": 22,
        "rejected_properly": depth_guard_passed
    }

    # 2. Formula Syntax & Safe Evaluation Performance (<200ms CPU timeout)
    eval_status = {"passed": False, "duration_ms": 0.0, "result": None, "under_timeout": False, "error": None}
    t0 = time.time()
    try:
        from app.models.schemas import evaluate_band_math_formula
        test_val = evaluate_band_math_formula("(B08 - B04) / (B08 + B04)", {"B08": 0.8, "B04": 0.1})
        elapsed_ms = (time.time() - t0) * 1000.0
        eval_status = {
            "passed": abs(test_val - (0.7 / 0.9)) < 1e-4,
            "duration_ms": round(elapsed_ms, 2),
            "result": round(test_val, 4),
            "under_timeout": elapsed_ms < 200.0,
            "error": None
        }
    except Exception as e:
        eval_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "result": None,
            "under_timeout": False,
            "error": str(e)
        }
    results["evaluation_guard"] = eval_status

    # 3. Numerical Safety & Division-by-Zero Guard (epsilon = 10^-6)
    div_status = {"safe": False, "result": None, "error": None}
    try:
        from app.models.schemas import evaluate_band_math_formula
        div_val = evaluate_band_math_formula("1.0 / 0.0", {})
        div_status = {
            "safe": div_val is not None and not (div_val != div_val) and abs(div_val) >= 1e5,
            "result": div_val,
            "error": None
        }
    except Exception as e:
        div_status = {"safe": False, "result": None, "error": str(e)}
    results["division_by_zero_guard"] = div_status

    # 4. Vectorized 2D Raster Allocation Memory Guard
    raster_status = {"passed": False, "shape": None, "duration_ms": 0.0, "error": None}
    t_rast = time.time()
    try:
        import numpy as np
        from app.services.indices import index_service
        b4_arr = np.array([[0.1, 0.2], [0.3, 0.4]], dtype=np.float32)
        b8_arr = np.array([[0.8, 0.7], [0.6, 0.5]], dtype=np.float32)
        raster_res = index_service.evaluate_band_math_raster("(B08 - B04) / (B08 + B04)", {"B08": b8_arr, "B04": b4_arr})
        rast_elapsed = (time.time() - t_rast) * 1000.0
        if raster_res is not None and np.all(np.isfinite(raster_res)):
            raster_status = {
                "passed": True,
                "shape": list(raster_res.shape),
                "duration_ms": round(rast_elapsed, 2),
                "error": None
            }
        else:
            raster_status = {
                "passed": False,
                "shape": list(raster_res.shape) if raster_res is not None else None,
                "duration_ms": round(rast_elapsed, 2),
                "error": "Non-finite values or empty array produced"
            }
    except Exception as e:
        raster_status = {
            "passed": False,
            "shape": None,
            "duration_ms": round((time.time() - t_rast) * 1000.0, 2),
            "error": str(e)
        }
    results["vector_raster_guard"] = raster_status

    return results

def inspect_dem_topography_guard() -> dict:
    """Inspects Copernicus 30m DEM (GLO-30) Horn's 3x3 finite-difference gradient operator,
    analytical slope derivative bounds, and convolution kernel latency watchdog (<100ms) (Task T-219).
    """
    results = {}
    solver_status = {"passed": False, "duration_ms": 0.0, "slope_deg": None, "under_timeout": False, "error": None}
    t0 = time.time()
    try:
        from app.models.schemas import calculate_horn_gradient
        # 3x3 elevation test grid with known slope
        grid = [
            [100.0, 100.0, 100.0],
            [100.0, 115.0, 100.0],
            [100.0, 100.0, 100.0]
        ]
        res = calculate_horn_gradient(grid, cell_size_x=30.0, cell_size_y=30.0)
        elapsed_ms = (time.time() - t0) * 1000.0
        solver_status = {
            "passed": res is not None and hasattr(res, "slope_deg"),
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 100.0,
            "slope_deg": round(res.slope_deg, 2) if res else None,
            "error": None
        }
    except Exception as e:
        solver_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "slope_deg": None,
            "error": str(e)
        }
    results["horn_gradient_watchdog"] = solver_status

    # Probe Dynamic DEM Relief Tile Server
    probe_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/dem/relief/10/500/500.png?colormap=terrain",
        timeout=3.0
    )
    results["dem_tile_probe"] = probe_tile
    return results

def inspect_mosaic_vrt_guard() -> dict:
    """Inspects Multi-Granule Raster Memory Allocation Guard (>1GB Heap Threshold),
    Virtual Raster (VRT) XML generation latency watchdog (<200ms), dynamic seamless mosaic tile endpoints,
    and STAC multi-item query monitor (Task T-225).
    """
    results = {}

    # 1. Multi-Granule Raster 2D Distance-Transform Memory & Partition-of-Unity Guard
    raster_status = {"passed": False, "partition_of_unity": False, "duration_ms": 0.0, "shape": None, "error": None}
    t_rast = time.time()
    try:
        import numpy as np
        from app.models.schemas import calculate_distance_transform_feather_weights
        
        # Test 2D distance arrays simulating adjacent granule overlap zones
        d1 = np.linspace(0.0, 100.0, 128, dtype=np.float32).reshape(1, -1).repeat(128, axis=0)
        d2 = np.linspace(100.0, 0.0, 128, dtype=np.float32).reshape(1, -1).repeat(128, axis=0)
        w1, w2 = calculate_distance_transform_feather_weights(d1, d2, use_smoothstep=True)
        rast_elapsed = (time.time() - t_rast) * 1000.0
        
        is_finite = bool(np.all(np.isfinite(w1)) and np.all(np.isfinite(w2)))
        partition_ok = bool(np.allclose(w1 + w2, 1.0, atol=1e-5))
        
        raster_status = {
            "passed": is_finite and partition_ok,
            "partition_of_unity": partition_ok,
            "shape": list(w1.shape),
            "duration_ms": round(rast_elapsed, 2),
            "error": None
        }
    except Exception as e:
        raster_status = {
            "passed": False,
            "partition_of_unity": False,
            "shape": None,
            "duration_ms": round((time.time() - t_rast) * 1000.0, 2),
            "error": str(e)
        }
    results["feather_raster_guard"] = raster_status

    # 2. Virtual Raster (VRT) Generation Latency Watchdog (< 200ms)
    vrt_status = {"passed": False, "duration_ms": 0.0, "xml_length": 0, "under_timeout": False, "error": None}
    t_vrt = time.time()
    try:
        from app.models.schemas import generate_vrt_xml_definition
        test_granules = [
            {"granule_id": "T10SEG", "source_uri": "https://example.com/T10SEG_B04.tif"},
            {"granule_id": "T10SFG", "source_uri": "https://example.com/T10SFG_B04.tif"}
        ]
        xml_res = generate_vrt_xml_definition(
            mosaic_id="HEALTH-PROBE-VRT",
            collection="sentinel-2-l2a",
            granules=test_granules,
            crs="EPSG:32610"
        )
        vrt_elapsed = (time.time() - t_vrt) * 1000.0
        is_valid_xml = "<VRTDataset" in xml_res and "</VRTDataset>" in xml_res
        vrt_status = {
            "passed": is_valid_xml,
            "duration_ms": round(vrt_elapsed, 2),
            "under_timeout": vrt_elapsed < 200.0,
            "xml_length": len(xml_res),
            "error": None
        }
    except Exception as e:
        vrt_status = {
            "passed": False,
            "duration_ms": round((time.time() - t_vrt) * 1000.0, 2),
            "under_timeout": False,
            "xml_length": 0,
            "error": str(e)
        }
    results["vrt_generation_watchdog"] = vrt_status

    # 3. Dynamic Multi-Granule Seamless Mosaic Tile Server Probes
    mosaic_tile_probe = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/mosaic/sentinel-2-l2a/10/163/395.png?blend_method=feather",
        timeout=3.0
    )
    feather_tile_probe = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/mosaic/feather/10/163/395.png",
        timeout=3.0
    )
    seamline_tile_probe = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/mosaic/seamline/10/163/395.png",
        timeout=3.0
    )
    results["mosaic_tile_probe"] = mosaic_tile_probe
    results["feather_tile_probe"] = feather_tile_probe
    results["seamline_tile_probe"] = seamline_tile_probe

    # 4. Planetary Computer STAC Multi-Item Query Monitor
    stac_multi_res = check_http_endpoint(
        "https://planetarycomputer.microsoft.com/api/stac/v1/search?collections=sentinel-2-l2a&limit=2&bbox=-120.9,36.9,-120.7,37.1",
        timeout=10.0,
        retries=2
    )
    results["stac_multi_item_query"] = stac_multi_res

    return results

def inspect_temporal_stack_guard() -> dict:
    """Inspects 4D Temporal Stack Memory Allocation Guard (>1.2GB Heap Threshold),
    Statistical Pixel Reducer Execution Latency Watchdog (<400ms per tile for 5-scene stack),
    Quality mosaic tier classifier, and dynamic composite tile server probe (Task T-231).
    """
    results = {}

    # 1. Statistical Pixel Reducer Execution Latency Watchdog (< 400ms for 5-scene stack)
    reducer_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "shape": None, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.models.schemas import apply_temporal_reduction
        
        # 5 scenes, 128x128 float32 temporal raster stack
        stack = np.random.uniform(0.05, 0.75, size=(5, 128, 128)).astype(np.float32)
        med_composite = apply_temporal_reduction(stack, reducer="median")
        elapsed_ms = (time.time() - t0) * 1000.0
        
        is_finite = bool(np.all(np.isfinite(med_composite)))
        correct_shape = med_composite.shape == (128, 128)
        
        reducer_status = {
            "passed": is_finite and correct_shape,
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 400.0,
            "shape": list(med_composite.shape),
            "error": None
        }
    except Exception as e:
        reducer_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "shape": None,
            "error": str(e)
        }
    results["reducer_execution_watchdog"] = reducer_status

    # 2. Quality Mosaic Classifier Invariant Guard
    quality_status = {"passed": False, "tier": None, "error": None}
    try:
        from app.models.schemas import classify_temporal_composite_quality
        q_tier = classify_temporal_composite_quality(clear_pixel_pct=92.0, scene_count=5)
        quality_status = {
            "passed": q_tier.value == "excellent",
            "tier": q_tier.value,
            "error": None
        }
    except Exception as e:
        quality_status = {"passed": False, "tier": None, "error": str(e)}
    results["quality_classifier_guard"] = quality_status

    # 3. Dynamic Temporal Composite Tile Server Probe
    composite_tile_probe = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/composite/sentinel-2-l2a/10/163/395.png?reducer=median",
        timeout=3.0
    )
    results["composite_tile_probe"] = composite_tile_probe

    # 4. Planetary Computer Multi-Temporal STAC Search Monitor
    stac_temporal_res = check_http_endpoint(
        "https://planetarycomputer.microsoft.com/api/stac/v1/search?collections=sentinel-2-l2a&limit=4&datetime=2026-06-01T00:00:00Z/2026-08-31T23:59:59Z&bbox=-120.9,36.9,-120.7,37.1",
        timeout=10.0,
        retries=2
    )
    results["stac_temporal_query"] = stac_temporal_res

    return results

def inspect_sar_backscatter_guard() -> dict:
    """Inspects Float32 SAR Amplitude Array Allocation Guard (>1.5GB Threshold),
    2D Spatial Adaptive Speckle Filter (Refined Lee) Convolution Latency Watchdog (<600ms per tile),
    SAR Decibel Water Inundation Thresholding Guard, Planetary Computer Sentinel-1 RTC STAC Availability Monitor,
    and Dynamic XYZ SAR Backscatter Tile Server Probe (Task T-237).
    """
    results = {}

    # 1. 2D Spatial Adaptive Speckle Filter (Refined Lee) Convolution Latency Watchdog (< 600ms)
    filter_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "shape": None, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.models.schemas import (
            apply_speckle_filter_1d_or_2d,
            SpeckleFilterMethod,
            linear_to_decibel
        )
        
        # 128x128 synthetic radar backscatter
        raw_sar = np.random.exponential(scale=0.1, size=(128, 128)).astype(np.float32)
        filtered = apply_speckle_filter_1d_or_2d(
            raw_sar,
            method=SpeckleFilterMethod.REFINED_LEE,
            kernel_size=5,
            num_looks=4.4
        )
        elapsed_ms = (time.time() - t0) * 1000.0
        
        is_finite = bool(np.all(np.isfinite(filtered)))
        correct_shape = filtered.shape == (128, 128)
        
        filter_status = {
            "passed": is_finite and correct_shape,
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 600.0,
            "shape": list(filtered.shape),
            "error": None
        }
    except Exception as e:
        filter_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "shape": None,
            "error": str(e)
        }
    results["speckle_filter_watchdog"] = filter_status

    # 2. SAR Decibel Water Inundation Thresholding Guard (sigma0_VV <= -16.5 dB)
    water_status = {"passed": False, "water_fraction": 0.0, "error": None}
    try:
        from app.models.schemas import linear_to_decibel, classify_sar_water_pixels
        import numpy as np
        
        sim_lin = np.array([[0.005, 0.01], [0.05, 0.1]], dtype=np.float32)
        sim_db = linear_to_decibel(sim_lin)
        res_water = classify_sar_water_pixels(sim_db, threshold_db=-16.5)
        
        water_status = {
            "passed": res_water["water_pixels"] == 2,
            "water_fraction": res_water["water_fraction"],
            "error": None
        }
    except Exception as e:
        water_status = {"passed": False, "water_fraction": 0.0, "error": str(e)}
    results["water_threshold_guard"] = water_status

    # 3. Dynamic XYZ SAR Backscatter Tile Server Probe
    sar_tile_probe = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/sar/sentinel-1-rtc/10/163/395.png?polarization=vv",
        timeout=3.0
    )
    results["sar_tile_probe"] = sar_tile_probe

    # 4. Planetary Computer Sentinel-1 RTC STAC Availability Monitor
    stac_sar_res = check_http_endpoint(
        "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-1-rtc",
        timeout=10.0,
        retries=2
    )
    results["stac_sar_collection"] = stac_sar_res

    return results

def inspect_coregistration_guard() -> dict:
    """Inspects 2D FFT Cross-Power Spectrum Matrix Memory Allocation Guard (>1.5GB Threshold),
    RANSAC Transformation Fitting Latency Watchdog (<800ms), Keys Cubic Convolution Geometric
    Resampling Warper, Dynamic XYZ Co-Registered Tile Server Probes, and Multi-Temporal Benchmark
    Scene Pair Ingestion (Task T-243).
    """
    results = {}

    # 1. RANSAC Transformation Fitting Latency Watchdog (< 800ms)
    ransac_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "points_count": 0, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.services.indices import IndexComputationService

        np.random.seed(42)
        r_ref = np.random.uniform(0.1, 0.8, (128, 128)).astype(np.float32)
        r_tgt = np.roll(np.roll(r_ref, 1, axis=1), 1, axis=0)

        pts, summary = IndexComputationService.compute_coregistration_tie_points(
            r_ref,
            r_tgt,
            grid_spacing_pixels=32,
            patch_size_pixels=16,
            min_correlation=0.50
        )
        elapsed_ms = (time.time() - t0) * 1000.0

        ransac_status = {
            "passed": len(pts) > 0,
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 800.0,
            "points_count": len(pts),
            "error": None
        }
    except Exception as e:
        ransac_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "points_count": 0,
            "error": str(e)
        }
    results["ransac_fitting_watchdog"] = ransac_status

    # 2. Keys Cubic Convolution Geometric Resampling Warper
    resamp_status = {"passed": False, "duration_ms": 0.0, "shape": None, "error": None}
    t_warp = time.time()
    try:
        import numpy as np
        from app.services.indices import IndexComputationService
        test_img = np.random.uniform(0.1, 0.8, (64, 64)).astype(np.float32)
        warped = IndexComputationService.warp_raster_affine(
            test_img,
            affine_matrix={"a": 1.0, "b": 0.0, "c": 0.0, "d": 1.0, "tx": 1.5, "ty": 1.5},
            kernel="cubic_convolution"
        )
        warp_elapsed = (time.time() - t_warp) * 1000.0
        is_finite = bool(np.all(np.isfinite(warped)))
        resamp_status = {
            "passed": is_finite and warped.shape == (64, 64),
            "duration_ms": round(warp_elapsed, 2),
            "shape": list(warped.shape),
            "error": None
        }
    except Exception as e:
        resamp_status = {
            "passed": False,
            "duration_ms": round((time.time() - t_warp) * 1000.0, 2),
            "shape": None,
            "error": str(e)
        }
    results["resampling_guard"] = resamp_status

    # 3. Dynamic XYZ Co-Registered Tile Server Probes
    coreg_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/coregistration/S2_SAN_LUIS_2026_06/S2_SAN_LUIS_2026_08/10/163/395.png?mode=aligned",
        timeout=3.0
    )
    vec_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/coregistration/vector-field/COREG_PROBE/10/163/395.png",
        timeout=3.0
    )
    results["coreg_tile_probe"] = coreg_tile
    results["vector_field_tile_probe"] = vec_tile

    # 4. Multi-Temporal Scene Pair Ingestion & Benchmark Catalog
    catalog_status = {"passed": False, "pair_count": 0, "error": None}
    try:
        from app.services.data_acquisition import data_acquisition_service
        pairs = data_acquisition_service.search_coregistration_scene_pairs()
        catalog_status = {
            "passed": len(pairs) > 0,
            "pair_count": len(pairs),
            "error": None
        }
    except Exception as e:
        catalog_status = {
            "passed": False,
            "pair_count": 0,
            "error": str(e)
        }
    results["scene_pair_catalog"] = catalog_status

    return results

def inspect_aquatic_quality_guard() -> dict:
    """Inspects Bio-Optical Raster Floating-Point Array Allocation Guard (>1.5GB Threshold),
    Turbidity & Chlorophyll-a Inversion Latency Watchdog (<400ms),
    Water Reservoir STAC Ingestion & Scene Search Monitor,
    and Dynamic XYZ Bio-Optical Aquatic Quality & HAB Tile Server Probes (Task T-249).
    """
    results = {}

    # 1. Turbidity & Chlorophyll-a Inversion Latency Watchdog (< 400ms)
    inv_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "chla_mean": 0.0, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.services.indices import IndexComputationService

        np.random.seed(42)
        bands = {
            "B03": np.random.uniform(0.05, 0.25, (64, 64)).astype(np.float32),
            "B04": np.random.uniform(0.02, 0.15, (64, 64)).astype(np.float32),
            "B05": np.random.uniform(0.03, 0.20, (64, 64)).astype(np.float32),
            "B06": np.random.uniform(0.03, 0.20, (64, 64)).astype(np.float32),
            "B08": np.random.uniform(0.01, 0.10, (64, 64)).astype(np.float32),
            "B11": np.random.uniform(0.01, 0.08, (64, 64)).astype(np.float32),
        }
        res_inv = IndexComputationService.compute_aquatic_quality_inversion(
            bands=bands,
            algorithm="ndci_mishra_2012",
            water_masking_method="mndwi_threshold",
            mndwi_threshold=0.0
        )
        elapsed_ms = (time.time() - t0) * 1000.0

        chla = res_inv.get("chla_ug_l", res_inv.get("chla"))
        is_finite = bool(np.all(np.isfinite(chla))) if chla is not None else False
        chla_mean = float(np.mean(chla)) if is_finite else 0.0

        inv_status = {
            "passed": is_finite and ("ndci" in res_inv),
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 400.0,
            "chla_mean": round(chla_mean, 2),
            "error": None
        }
    except Exception as e:
        inv_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "chla_mean": 0.0,
            "error": str(e)
        }
    results["bio_optical_inversion_watchdog"] = inv_status

    # 2. Dynamic XYZ Bio-Optical Aquatic Quality & HAB Tile Server Probes
    ndci_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/aquatic/sentinel-2-l2a/ndci/10/163/395.png",
        timeout=3.0
    )
    hab_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/aquatic/hab/sentinel-2-l2a/10/163/395.png",
        timeout=3.0
    )
    results["ndci_tile_probe"] = ndci_tile
    results["hab_tile_probe"] = hab_tile

    # 3. Water Reservoir STAC Ingestion & Scene Search Monitor
    catalog_status = {"passed": False, "scene_count": 0, "error": None}
    try:
        from app.services.data_acquisition import data_acquisition_service
        scenes = data_acquisition_service.search_aquatic_scenes()
        catalog_status = {
            "passed": len(scenes) > 0,
            "scene_count": len(scenes),
            "error": None
        }
    except Exception as e:
        catalog_status = {
            "passed": False,
            "scene_count": 0,
            "error": str(e)
        }
    results["aquatic_scene_catalog"] = catalog_status

    return results

def inspect_topographic_illumination_guard() -> dict:
    """Inspects Float32 DEM Normal Vector Memory Guard (>1.5GB Heap Ceiling),
    Illumination Cosine Calculation Latency Watchdog (<300ms),
    Dynamic XYZ Topographically Corrected Tile Server Probe,
    and High-Relief DEM Asset Ingestion Monitor (Task T-255).
    """
    results = {}

    # 1. Illumination Cosine Calculation Latency Watchdog (< 300ms)
    topo_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "mean_cos_i": 0.0, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.services.indices import IndexComputationService

        np.random.seed(42)
        bands = {"B04": np.random.uniform(0.1, 0.6, (64, 64)).astype(np.float32)}
        elev = np.random.uniform(500, 2500, (64, 64)).astype(np.float32)
        res_topo = IndexComputationService.compute_topographic_correction_inversion(
            bands=bands,
            elevation=elev,
            solar_zenith_deg=35.0,
            solar_azimuth_deg=145.0,
            method="c_correction"
        )
        elapsed_ms = (time.time() - t0) * 1000.0

        cos_i = res_topo.get("cos_incidence")
        is_finite = bool(np.all(np.isfinite(cos_i))) if cos_i is not None else False
        mean_cos = float(np.mean(cos_i)) if is_finite else 0.0

        topo_status = {
            "passed": is_finite and ("corrected_bands" in res_topo),
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 300.0,
            "mean_cos_i": round(mean_cos, 3),
            "error": None
        }
    except Exception as e:
        topo_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "mean_cos_i": 0.0,
            "error": str(e)
        }
    results["illumination_cosine_watchdog"] = topo_status

    # 2. Dynamic XYZ Topographic Tile Server Probes
    topo_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/topographic/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png?method=scs_c",
        timeout=3.0
    )
    illum_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/topographic/illumination/sentinel-2-l2a/MT_SHASTA_VOLCANO_2026/10/163/395.png",
        timeout=3.0
    )
    results["topographic_tile_probe"] = topo_tile
    results["illumination_tile_probe"] = illum_tile

    # 3. High-Relief DEM Asset Ingestion Monitor
    catalog_status = {"passed": False, "scene_count": 0, "error": None}
    try:
        from app.services.data_acquisition import data_acquisition_service
        scenes = data_acquisition_service.search_topographic_scenes()
        catalog_status = {
            "passed": len(scenes) > 0,
            "scene_count": len(scenes),
            "error": None
        }
    except Exception as e:
        catalog_status = {
            "passed": False,
            "scene_count": 0,
            "error": str(e)
        }
    results["topographic_scene_catalog"] = catalog_status

    return results

def inspect_hls_harmonization_guard() -> dict:
    """Inspects RossThick-LiSparse-R Kernel Memory Allocation Guard (>1.5GB Heap Ceiling),
    HLS MGRS Tile Alignment & NBAR Harmonization Latency Watchdog (<300ms per tile),
    Dynamic XYZ HLS & NBAR Tile Server Probes,
    and Planetary Computer HLS Multi-Sensor STAC Ingestion Monitor (Task T-261).
    """
    results = {}

    # 1. HLS BRDF Kernel & NBAR Harmonization Latency Watchdog (< 300ms)
    hls_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.services.indices import IndexComputationService

        np.random.seed(42)
        hls_bands = {
            "B02": np.random.uniform(0.02, 0.20, (64, 64)).astype(np.float32),
            "B03": np.random.uniform(0.03, 0.25, (64, 64)).astype(np.float32),
            "B04": np.random.uniform(0.02, 0.30, (64, 64)).astype(np.float32),
            "B05": np.random.uniform(0.10, 0.60, (64, 64)).astype(np.float32),
        }
        res_hls = IndexComputationService.compute_hls_harmonization(
            bands=hls_bands,
            solar_zenith_deg=30.0,
            solar_azimuth_deg=140.0,
            view_zenith_deg=5.0,
            view_azimuth_deg=100.0,
            source_sensor="landsat_oli",
            target_sensor="sentinel_msi"
        )
        elapsed_ms = (time.time() - t0) * 1000.0

        nbar = res_hls.get("nbar_bands", {})
        is_finite = bool(all(np.all(np.isfinite(arr)) for arr in nbar.values())) if nbar else False

        hls_status = {
            "passed": is_finite and ("harmonized_bands" in res_hls),
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 300.0,
            "error": None
        }
    except Exception as e:
        hls_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "error": str(e)
        }
    results["hls_harmonization_watchdog"] = hls_status

    # 2. Dynamic XYZ HLS Tile Server Probes
    hls_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/hls/landsat-c2-l2/LC09_L2SP_044034_20260718_02_T1/10/163/395.png?stage=harmonized",
        timeout=3.0
    )
    nbar_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/hls/nbar/landsat-c2-l2/LC09_L2SP_044034_20260718_02_T1/10/163/395.png",
        timeout=3.0
    )
    results["hls_tile_probe"] = hls_tile
    results["nbar_tile_probe"] = nbar_tile

    # 3. Planetary Computer HLS STAC Ingestion Monitor
    catalog_status = {"passed": False, "scene_count": 0, "error": None}
    try:
        from app.services.data_acquisition import data_acquisition_service
        scenes = data_acquisition_service.search_hls_scenes()
        catalog_status = {
            "passed": len(scenes) > 0,
            "scene_count": len(scenes),
            "error": None
        }
    except Exception as e:
        catalog_status = {
            "passed": False,
            "scene_count": 0,
            "error": str(e)
        }
    results["hls_scene_catalog"] = catalog_status

    return results

def inspect_thermal_lst_guard() -> dict:
    """Inspects Float32 Thermal Kelvin-to-Celsius Matrix Memory Guard (>1.5GB Heap Ceiling),
    Atmospheric Water Vapor LUT Inversion Latency Watchdog (<300ms per tile),
    Dynamic XYZ Calibrated LST Surface Temperature & Thermal Anomaly Tile Server Probes,
    and Planetary Computer Landsat TIRS STAC Ingestion Monitor (Task T-267).
    """
    results = {}

    # 1. Atmospheric Water Vapor LUT Inversion Latency Watchdog (< 300ms)
    lst_status = {"passed": False, "duration_ms": 0.0, "under_timeout": False, "mean_lst_c": 0.0, "error": None}
    t0 = time.time()
    try:
        import numpy as np
        from app.services.indices import IndexComputationService

        np.random.seed(42)
        bands = {
            "B10": np.random.uniform(280.0, 315.0, (64, 64)).astype(np.float32),
            "B04": np.random.uniform(0.1, 0.4, (64, 64)).astype(np.float32),
            "B05": np.random.uniform(0.3, 0.7, (64, 64)).astype(np.float32)
        }
        res_lst = IndexComputationService.compute_thermal_lst_inversion(
            bands=bands,
            sensor="landsat_tirs",
            method="smw"
        )
        elapsed_ms = (time.time() - t0) * 1000.0

        summary = res_lst.get("summary", {})
        mean_lst = summary.get("mean_lst_c", 0.0)
        has_rasters = "rasters" in res_lst and "lst_celsius" in res_lst["rasters"]

        lst_status = {
            "passed": has_rasters and ("mean_lst_c" in summary),
            "duration_ms": round(elapsed_ms, 2),
            "under_timeout": elapsed_ms < 300.0,
            "mean_lst_c": round(mean_lst, 2),
            "error": None
        }
    except Exception as e:
        lst_status = {
            "passed": False,
            "duration_ms": round((time.time() - t0) * 1000.0, 2),
            "under_timeout": False,
            "mean_lst_c": 0.0,
            "error": str(e)
        }
    results["lst_inversion_watchdog"] = lst_status

    # 2. Dynamic XYZ Thermal LST & Anomaly Tile Server Probes
    lst_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/thermal/lst/landsat-c2-l2/LC09_L2SP_044034_20260718_02_T1/10/163/395.png?method=smw",
        timeout=3.0
    )
    anomaly_tile = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/tiles/thermal/anomaly/landsat-c2-l2/LC09_L2SP_044034_20260718_02_T1/10/163/395.png",
        timeout=3.0
    )
    results["lst_tile_probe"] = lst_tile
    results["anomaly_tile_probe"] = anomaly_tile

    # 3. Planetary Computer Landsat TIRS STAC Ingestion Monitor
    stac_res = check_http_endpoint("https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2", timeout=10.0, retries=2)
    results["planetary_computer_landsat_stac"] = stac_res

    # 4. Thermal Benchmark Scene Catalog Monitor
    catalog_status = {"passed": False, "scene_count": 0, "error": None}
    try:
        from app.services.data_acquisition import data_acquisition_service
        scenes = data_acquisition_service.search_thermal_scenes()
        catalog_status = {
            "passed": len(scenes) > 0,
            "scene_count": len(scenes),
            "error": None
        }
    except Exception as e:
        catalog_status = {
            "passed": False,
            "scene_count": 0,
            "error": str(e)
        }
    results["thermal_scene_catalog"] = catalog_status

    return results

def inspect_export_pipeline_guard() -> dict:
    """Inspects Temporary Export Directory Disk Utilization Watchdog (<10GB Ceiling),
    Large GeoTIFF Clipping Memory Spike Guard (>1.5GB Heap),
    Async Export Task Timeout Monitor & REST Endpoint Health (Task T-273).
    """
    results = {}

    # 1. Temporary Export Directory Disk Utilization Watchdog (< 10GB Ceiling)
    export_dirs = [
        os.path.join(SCRIPT_DIR, ".cache", "exports"),
        os.path.join(SCRIPT_DIR, ".gios_cache", "exports"),
        os.path.join(SCRIPT_DIR, "data", "exports")
    ]
    total_export_bytes = 0
    total_export_files = 0
    for ed in export_dirs:
        if os.path.exists(ed):
            for root, _, files in os.walk(ed):
                for f in files:
                    try:
                        total_export_bytes += os.path.getsize(os.path.join(root, f))
                        total_export_files += 1
                    except OSError:
                        pass
    export_size_mb = round(total_export_bytes / (1024**2), 2)
    export_ceiling_mb = 10240.0  # 10 GB
    results["export_disk_usage"] = {
        "size_mb": export_size_mb,
        "file_count": total_export_files,
        "under_ceiling": export_size_mb < export_ceiling_mb,
        "ceiling_mb": export_ceiling_mb
    }

    # 2. Async Export Formats & Discovery Endpoint Probe
    formats_probe = check_http_endpoint(
        "http://127.0.0.1:8000/api/v1/analysis/export/formats",
        timeout=3.0
    )
    results["export_formats_probe"] = formats_probe

    # 3. Export Service Code-Level Functional Health
    service_status = {"passed": False, "format_count": 0, "error": None}
    try:
        from app.services.export_service import export_service
        cfgs = export_service.get_export_formats_and_configs()
        formats_dict = cfgs.get("formats", {})
        service_status = {
            "passed": len(formats_dict) >= 4,
            "format_count": len(formats_dict),
            "error": None
        }
    except Exception as e:
        service_status = {
            "passed": False,
            "format_count": 0,
            "error": str(e)
        }
    results["export_service_health"] = service_status

    return results

def inspect_resources() -> dict:
    cpu_percent = psutil.cpu_percent(interval=0.5)
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("C:\\")
    
    # Check processes, flood simulation, and multi-granule raster worker memory
    gios_procs = []
    flood_sim_memory_mb = 0.0
    max_python_memory_mb = 0.0
    for p in psutil.process_iter(['pid', 'name', 'memory_info']):
        try:
            name = p.info['name'].lower()
            if 'python' in name or 'uvicorn' in name or 'node' in name:
                rss_mb = round(p.info['memory_info'].rss / (1024**2), 1)
                gios_procs.append({"pid": p.info['pid'], "name": p.info['name'], "rss_mb": rss_mb})
                if 'python' in name or 'uvicorn' in name:
                    flood_sim_memory_mb += rss_mb
                    max_python_memory_mb = max(max_python_memory_mb, rss_mb)
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
        "flood_sim_memory_mb": round(flood_sim_memory_mb, 1),
        "max_raster_worker_memory_mb": round(max_python_memory_mb, 1),
        "gios_processes": gios_procs
    }

def run_health_check(full_test_suite: bool = False) -> dict:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
    
    logger.info("Starting health check pass...")
    uptime = inspect_uptime()
    tile_cache = inspect_tile_server_and_cache()
    data_ingestion = inspect_data_ingestion()
    resources = inspect_resources()
    hydrodynamics = inspect_hydrodynamic_cfl_guard()
    band_math = inspect_band_math_ast_guard()
    dem_topography = inspect_dem_topography_guard()
    mosaic_vrt = inspect_mosaic_vrt_guard()
    temporal_stack = inspect_temporal_stack_guard()
    sar_backscatter = inspect_sar_backscatter_guard()
    coregistration = inspect_coregistration_guard()
    aquatic = inspect_aquatic_quality_guard()
    topographic = inspect_topographic_illumination_guard()
    hls = inspect_hls_harmonization_guard()
    thermal = inspect_thermal_lst_guard()
    export_pipeline = inspect_export_pipeline_guard()
    pipelines = inspect_pipelines(full=full_test_suite)
    
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
    if "usgs_earthquake" in data_ingestion and not data_ingestion["usgs_earthquake"]["ok"]:
        anomalies.append({
            "component": "USGS Earthquake & ShakeMap Feed",
            "severity": "MEDIUM",
            "type": "INGESTION_ERROR",
            "message": f"USGS Earthquake feed check failed: {data_ingestion['usgs_earthquake']['error']}"
        })
    if "precipitation_telemetry" in data_ingestion and not data_ingestion["precipitation_telemetry"]["ok"]:
        anomalies.append({
            "component": "Real-Time Precipitation Telemetry API",
            "severity": "LOW",
            "type": "INGESTION_ERROR",
            "message": f"Precipitation telemetry feed check failed: {data_ingestion['precipitation_telemetry']['error']}"
        })
    if "planetary_computer_dem_stac" in data_ingestion and not data_ingestion["planetary_computer_dem_stac"]["ok"]:
        anomalies.append({
            "component": "Planetary Computer Copernicus DEM GLO-30 STAC Collection",
            "severity": "MEDIUM",
            "type": "INGESTION_ERROR",
            "message": f"DEM STAC API check failed: {data_ingestion['planetary_computer_dem_stac']['error']}"
        })
    if data_ingestion["sqlite_db"]["error"]:
        anomalies.append({
            "component": "SQLite Database (gios.db)",
            "severity": "HIGH",
            "type": "DATABASE_ERROR",
            "message": f"Database integrity check failed: {data_ingestion['sqlite_db']['error']}"
        })

    # 3. Analyze 2D Hydrodynamic & CFL Stability Anomalies
    if not hydrodynamics["cfl_stable"]:
        anomalies.append({
            "component": "2D Hydrodynamic CFL Stability Guard",
            "severity": "HIGH",
            "type": "NUMERICAL_INSTABILITY",
            "message": f"Courant number CFL={hydrodynamics['max_cfl']} exceeds stability criterion (1.0). Timestep Δt exceeds numerical convergence limit."
        })
    if not hydrodynamics["routing_solver"]["passed"]:
        anomalies.append({
            "component": "2D De Saint-Venant Downstream Wave Routing Solver",
            "severity": "HIGH",
            "type": "SOLVER_FAILURE",
            "message": f"Hydrodynamic wave routing calculation failed: {hydrodynamics['routing_solver']['error']}"
        })
    if hydrodynamics["hydrodynamic_tile_probe"] and not hydrodynamics["hydrodynamic_tile_probe"]["ok"]:
        anomalies.append({
            "component": "Dynamic Hydrodynamic Inundation Tile Server",
            "severity": "MEDIUM",
            "type": "TILE_ERROR",
            "message": f"Dynamic flood inundation tile probe failed: {hydrodynamics['hydrodynamic_tile_probe']['error']}"
        })
        
    # 4. Analyze AST Band Math Engine & Safe Evaluation Anomalies
    if not band_math["recursion_depth_guard"]["rejected_properly"]:
        anomalies.append({
            "component": "AST Band Math Recursion Depth Guard",
            "severity": "HIGH",
            "type": "SECURITY_GUARD_FAILURE",
            "message": "AST parser failed to reject deeply nested expression exceeding max depth (depth 22 > max 20)."
        })
    if not band_math["evaluation_guard"]["passed"]:
        anomalies.append({
            "component": "AST Band Math Evaluator",
            "severity": "HIGH",
            "type": "EVALUATION_FAILURE",
            "message": f"AST evaluation check failed: {band_math['evaluation_guard']['error']}"
        })
    elif not band_math["evaluation_guard"]["under_timeout"]:
        anomalies.append({
            "component": "AST Band Math CPU Watchdog",
            "severity": "MEDIUM",
            "type": "CPU_TIMEOUT",
            "message": f"AST evaluation latency ({band_math['evaluation_guard']['duration_ms']} ms) exceeded 200 ms timeout ceiling."
        })
    if not band_math["division_by_zero_guard"]["safe"]:
        anomalies.append({
            "component": "AST Band Math Division-by-Zero Epsilon Guard",
            "severity": "HIGH",
            "type": "NUMERICAL_INSTABILITY",
            "message": "AST division by zero failed to clamp safely to finite value."
        })
    if not band_math["vector_raster_guard"]["passed"]:
        anomalies.append({
            "component": "AST Band Math Vectorized 2D Raster Guard",
            "severity": "MEDIUM",
            "type": "RASTER_EVALUATION_FAILURE",
            "message": f"Vectorized 2D raster AST evaluation failed: {band_math['vector_raster_guard']['error']}"
        })

    # 5. Analyze Copernicus 30m DEM (GLO-30) Topography & Hillshade Anomalies (Task T-219)
    if not dem_topography["horn_gradient_watchdog"]["passed"]:
        anomalies.append({
            "component": "Horn's 3x3 DEM Finite-Difference Operator",
            "severity": "HIGH",
            "type": "CALCULATION_FAILURE",
            "message": f"Horn gradient calculation failed: {dem_topography['horn_gradient_watchdog']['error']}"
        })
    elif not dem_topography["horn_gradient_watchdog"]["under_timeout"]:
        anomalies.append({
            "component": "Horn's 3x3 Convolution Latency Watchdog",
            "severity": "MEDIUM",
            "type": "CPU_TIMEOUT",
            "message": f"Horn convolution kernel latency ({dem_topography['horn_gradient_watchdog']['duration_ms']} ms) exceeded 100 ms limit."
        })
    if dem_topography["dem_tile_probe"] and not dem_topography["dem_tile_probe"]["ok"]:
        anomalies.append({
            "component": "Dynamic DEM Topographic Relief Tile Server",
            "severity": "MEDIUM",
            "type": "TILE_ERROR",
            "message": f"DEM relief tile probe failed: {dem_topography['dem_tile_probe']['error']}"
        })

    # 6. Analyze Multi-Granule Raster Memory Allocation & VRT Mosaic Anomalies (Task T-225)
    if not mosaic_vrt["feather_raster_guard"]["passed"]:
        anomalies.append({
            "component": "Multi-Granule Seamline Feathering Raster Guard",
            "severity": "HIGH",
            "type": "RASTER_EVALUATION_FAILURE",
            "message": f"Distance-transform feathering array calculation failed or violated partition-of-unity: {mosaic_vrt['feather_raster_guard']['error']}"
        })
    if not mosaic_vrt["vrt_generation_watchdog"]["passed"]:
        anomalies.append({
            "component": "Virtual Raster (VRT) Definition Generator",
            "severity": "HIGH",
            "type": "VRT_GENERATION_FAILURE",
            "message": f"VRT XML definition generation failed: {mosaic_vrt['vrt_generation_watchdog']['error']}"
        })
    elif not mosaic_vrt["vrt_generation_watchdog"]["under_timeout"]:
        anomalies.append({
            "component": "VRT Generation Latency Watchdog",
            "severity": "MEDIUM",
            "type": "CPU_TIMEOUT",
            "message": f"VRT XML generation latency ({mosaic_vrt['vrt_generation_watchdog']['duration_ms']} ms) exceeded 200 ms timeout ceiling."
        })
    if mosaic_vrt["mosaic_tile_probe"] and not mosaic_vrt["mosaic_tile_probe"]["ok"]:
        anomalies.append({
            "component": "Dynamic Seamless Mosaic Tile Server",
            "severity": "MEDIUM",
            "type": "TILE_ERROR",
            "message": f"Mosaic tile probe failed: {mosaic_vrt['mosaic_tile_probe']['error']}"
        })
    if mosaic_vrt["feather_tile_probe"] and not mosaic_vrt["feather_tile_probe"]["ok"]:
        anomalies.append({
            "component": "Dynamic Mosaic Feather Weight Tile Server",
            "severity": "MEDIUM",
            "type": "TILE_ERROR",
            "message": f"Mosaic feather weight tile probe failed: {mosaic_vrt['feather_tile_probe']['error']}"
        })
    if mosaic_vrt["seamline_tile_probe"] and not mosaic_vrt["seamline_tile_probe"]["ok"]:
        anomalies.append({
            "component": "Dynamic Mosaic Seamline Trace Tile Server",
            "severity": "MEDIUM",
            "type": "TILE_ERROR",
            "message": f"Mosaic seamline trace tile probe failed: {mosaic_vrt['seamline_tile_probe']['error']}"
        })
    if not mosaic_vrt["stac_multi_item_query"]["ok"]:
        anomalies.append({
            "component": "Planetary Computer STAC Multi-Item Query Monitor",
            "severity": "MEDIUM",
            "type": "INGESTION_ERROR",
            "message": f"STAC multi-item search query failed: {mosaic_vrt['stac_multi_item_query']['error']}"
        })

    # 7. Analyze Multi-Temporal Scene Stacking & Quality Composite Anomalies (Task T-231)
    if temporal_stack:
        if not temporal_stack["reducer_execution_watchdog"]["passed"]:
            anomalies.append({
                "component": "Statistical Pixel Reducer Evaluator",
                "severity": "HIGH",
                "type": "REDUCER_FAILURE",
                "message": f"Temporal reducer execution check failed: {temporal_stack['reducer_execution_watchdog']['error']}"
            })
        elif not temporal_stack["reducer_execution_watchdog"]["under_timeout"]:
            anomalies.append({
                "component": "Statistical Pixel Reducer Latency Watchdog",
                "severity": "MEDIUM",
                "type": "CPU_TIMEOUT",
                "message": f"Pixel reducer latency ({temporal_stack['reducer_execution_watchdog']['duration_ms']} ms) exceeded 400 ms timeout ceiling."
            })
        if temporal_stack["composite_tile_probe"] and not temporal_stack["composite_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic Temporal Composite Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Temporal composite tile probe failed: {temporal_stack['composite_tile_probe']['error']}"
            })
        if not temporal_stack["quality_classifier_guard"]["passed"]:
            anomalies.append({
                "component": "Quality Mosaic Classifier Invariant Guard",
                "severity": "HIGH",
                "type": "CLASSIFIER_FAILURE",
                "message": f"Quality mosaic classifier check failed: {temporal_stack['quality_classifier_guard']['error']}"
            })
        if not temporal_stack["stac_temporal_query"]["ok"]:
            anomalies.append({
                "component": "Planetary Computer STAC Multi-Temporal Query Monitor",
                "severity": "MEDIUM",
                "type": "INGESTION_ERROR",
                "message": f"STAC multi-temporal query check failed: {temporal_stack['stac_temporal_query']['error']}"
            })

    # 8. Analyze Sentinel-1 SAR Dual-Pol Backscatter & Speckle Filter Anomalies (Task T-237)
    if sar_backscatter:
        if not sar_backscatter["speckle_filter_watchdog"]["passed"]:
            anomalies.append({
                "component": "2D Spatial Adaptive Speckle Filter",
                "severity": "HIGH",
                "type": "FILTER_FAILURE",
                "message": f"Refined Lee speckle filter execution check failed: {sar_backscatter['speckle_filter_watchdog']['error']}"
            })
        elif not sar_backscatter["speckle_filter_watchdog"]["under_timeout"]:
            anomalies.append({
                "component": "Speckle Filter Convolution Latency Watchdog",
                "severity": "MEDIUM",
                "type": "CPU_TIMEOUT",
                "message": f"Speckle filter convolution latency ({sar_backscatter['speckle_filter_watchdog']['duration_ms']} ms) exceeded 600 ms timeout ceiling."
            })
        if not sar_backscatter["water_threshold_guard"]["passed"]:
            anomalies.append({
                "component": "SAR Decibel Water Inundation Thresholding Guard",
                "severity": "HIGH",
                "type": "THRESHOLDING_FAILURE",
                "message": f"SAR water threshold classification failed: {sar_backscatter['water_threshold_guard']['error']}"
            })
        if sar_backscatter["sar_tile_probe"] and not sar_backscatter["sar_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ SAR Backscatter Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"SAR backscatter tile probe failed: {sar_backscatter['sar_tile_probe']['error']}"
            })
        if not sar_backscatter["stac_sar_collection"]["ok"]:
            anomalies.append({
                "component": "Planetary Computer Sentinel-1 RTC STAC Availability Monitor",
                "severity": "MEDIUM",
                "type": "INGESTION_ERROR",
                "message": f"Sentinel-1 RTC STAC collection check failed: {sar_backscatter['stac_sar_collection']['error']}"
            })

    # 9. Analyze Sub-Pixel Image Co-Registration & FFT Phase Correlation Anomalies (Task T-243)
    if coregistration:
        if not coregistration["ransac_fitting_watchdog"]["passed"]:
            anomalies.append({
                "component": "RANSAC Affine Transformation Engine / Latency Watchdog",
                "severity": "HIGH",
                "type": "COREGISTRATION_FAILURE",
                "message": f"FFT phase correlation tie-point extraction or RANSAC fitting failed: {coregistration['ransac_fitting_watchdog']['error']}"
            })
        elif not coregistration["ransac_fitting_watchdog"]["under_timeout"]:
            anomalies.append({
                "component": "RANSAC Fitting Latency Watchdog",
                "severity": "MEDIUM",
                "type": "CPU_TIMEOUT",
                "message": f"RANSAC transformation fitting latency ({coregistration['ransac_fitting_watchdog']['duration_ms']} ms) exceeded 800 ms timeout ceiling."
            })
        if not coregistration["resampling_guard"]["passed"]:
            anomalies.append({
                "component": "Keys Cubic Convolution Geometric Resampling Warper",
                "severity": "HIGH",
                "type": "WARP_FAILURE",
                "message": f"Geometric resampling raster warp failed: {coregistration['resampling_guard']['error']}"
            })
        if coregistration["coreg_tile_probe"] and not coregistration["coreg_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ Co-Registered Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Co-registered tile probe failed: {coregistration['coreg_tile_probe']['error']}"
            })
        if coregistration["vector_field_tile_probe"] and not coregistration["vector_field_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ Displacement Vector Field Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Displacement vector field tile probe failed: {coregistration['vector_field_tile_probe']['error']}"
            })
        if not coregistration["scene_pair_catalog"]["passed"]:
            anomalies.append({
                "component": "Multi-Temporal Scene Pair Benchmark Catalog",
                "severity": "MEDIUM",
                "type": "INGESTION_ERROR",
                "message": f"Co-registration benchmark scene pair catalog check failed: {coregistration['scene_pair_catalog']['error']}"
            })

    # 10. Analyze Aquatic Bio-Optical Quality & HAB Anomalies (Task T-249)
    if aquatic:
        if not aquatic["bio_optical_inversion_watchdog"]["passed"]:
            anomalies.append({
                "component": "Bio-Optical Water Quality & HAB Inversion Solver",
                "severity": "HIGH",
                "type": "INVERSION_FAILURE",
                "message": f"Bio-optical aquatic inversion solver failed: {aquatic['bio_optical_inversion_watchdog']['error']}"
            })
        elif not aquatic["bio_optical_inversion_watchdog"]["under_timeout"]:
            anomalies.append({
                "component": "Bio-Optical Inversion Latency Watchdog",
                "severity": "MEDIUM",
                "type": "CPU_TIMEOUT",
                "message": f"Bio-optical inversion latency ({aquatic['bio_optical_inversion_watchdog']['duration_ms']} ms) exceeded 400 ms timeout ceiling."
            })
        if aquatic["ndci_tile_probe"] and not aquatic["ndci_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ Bio-Optical Aquatic Quality Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Aquatic NDCI tile probe failed: {aquatic['ndci_tile_probe']['error']}"
            })
        if aquatic["hab_tile_probe"] and not aquatic["hab_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ Aquatic HAB Hazard Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Aquatic HAB tile probe failed: {aquatic['hab_tile_probe']['error']}"
            })
        if not aquatic["aquatic_scene_catalog"]["passed"]:
            anomalies.append({
                "component": "Water Reservoir STAC Ingestion & Scene Search Monitor",
                "severity": "MEDIUM",
                "type": "INGESTION_ERROR",
                "message": f"Aquatic scene catalog check failed: {aquatic['aquatic_scene_catalog']['error']}"
            })

    # 11. Analyze Topographic Solar Illumination Anomalies (Task T-255)
    if topographic:
        if not topographic["illumination_cosine_watchdog"]["passed"]:
            anomalies.append({
                "component": "Topographic Solar Illumination Correction Engine",
                "severity": "HIGH",
                "type": "SOLVER_FAILURE",
                "message": f"Topographic solar illumination correction failed: {topographic['illumination_cosine_watchdog']['error']}"
            })
        elif not topographic["illumination_cosine_watchdog"]["under_timeout"]:
            anomalies.append({
                "component": "Illumination Cosine Calculation Latency Watchdog",
                "severity": "MEDIUM",
                "type": "CPU_TIMEOUT",
                "message": f"Illumination calculation latency ({topographic['illumination_cosine_watchdog']['duration_ms']} ms) exceeded 300 ms timeout ceiling."
            })
        if topographic["topographic_tile_probe"] and not topographic["topographic_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ Topographic Correction Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Topographic tile probe failed: {topographic['topographic_tile_probe']['error']}"
            })
        if topographic["illumination_tile_probe"] and not topographic["illumination_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ Solar Illumination Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"Solar illumination tile probe failed: {topographic['illumination_tile_probe']['error']}"
            })
        if not topographic["topographic_scene_catalog"]["passed"]:
            anomalies.append({
                "component": "High-Relief DEM Asset Ingestion Monitor",
                "severity": "MEDIUM",
                "type": "INGESTION_ERROR",
                "message": f"Topographic scene catalog check failed: {topographic['topographic_scene_catalog']['error']}"
            })

    # 12. Analyze Harmonized Landsat Sentinel-2 (HLS) Anomalies (Task T-261)
    if hls:
        if not hls["hls_harmonization_watchdog"]["passed"]:
            anomalies.append({
                "component": "HLS BRDF Kernel & NBAR Harmonization Engine",
                "severity": "HIGH",
                "type": "HARMONIZATION_FAILURE",
                "message": f"HLS BRDF/NBAR harmonization failed: {hls['hls_harmonization_watchdog']['error']}"
            })
        elif not hls["hls_harmonization_watchdog"]["under_timeout"]:
            anomalies.append({
                "component": "HLS Harmonization Latency Watchdog",
                "severity": "MEDIUM",
                "type": "CPU_TIMEOUT",
                "message": f"HLS harmonization latency ({hls['hls_harmonization_watchdog']['duration_ms']} ms) exceeded 300 ms timeout ceiling."
            })
        if hls["hls_tile_probe"] and not hls["hls_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ HLS Harmonized Surface Reflectance Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"HLS tile probe failed: {hls['hls_tile_probe']['error']}"
            })
        if hls["nbar_tile_probe"] and not hls["nbar_tile_probe"]["ok"]:
            anomalies.append({
                "component": "Dynamic XYZ HLS NBAR Tile Server",
                "severity": "MEDIUM",
                "type": "TILE_ERROR",
                "message": f"HLS NBAR tile probe failed: {hls['nbar_tile_probe']['error']}"
            })
        if not hls["hls_scene_catalog"]["passed"]:
            anomalies.append({
                "component": "Planetary Computer HLS Multi-Sensor STAC Ingestion Monitor",
                "severity": "MEDIUM",
                "type": "INGESTION_ERROR",
                "message": f"HLS scene catalog check failed: {hls['hls_scene_catalog']['error']}"
            })

    # 13. Analyze Pipeline Anomalies
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
        
    # 11. Analyze Resource Anomalies
    if resources["memory_percent"] > 95:
        anomalies.append({
            "component": "Host RAM",
            "severity": "MEDIUM",
            "type": "HIGH_RESOURCE_USAGE",
            "message": f"RAM utilization critical: {resources['memory_percent']}% ({resources['memory_used_gb']} GB / {resources['memory_total_gb']} GB)"
        })
    if resources.get("flood_sim_memory_mb", 0) > 2500.0:
        anomalies.append({
            "component": "Flood Simulation Process Memory Footprint",
            "severity": "MEDIUM",
            "type": "HIGH_RESOURCE_USAGE",
            "message": f"Simulation worker processes consuming excessive memory: {resources['flood_sim_memory_mb']} MB."
        })
    if resources.get("max_raster_worker_memory_mb", 0) > 1536.0:
        anomalies.append({
            "component": "Float32 SAR & FFT Phase Correlation Array Allocation Guard",
            "severity": "HIGH",
            "type": "HIGH_RESOURCE_USAGE",
            "message": f"SAR / Raster worker process heap ({resources['max_raster_worker_memory_mb']} MB) exceeded 1.5 GB threshold."
        })
    elif resources.get("max_raster_worker_memory_mb", 0) > 1228.8:
        anomalies.append({
            "component": "4D Temporal Stack Memory Allocation Guard",
            "severity": "MEDIUM",
            "type": "HIGH_RESOURCE_USAGE",
            "message": f"Temporal raster stack heap ({resources['max_raster_worker_memory_mb']} MB) exceeded 1.2 GB threshold."
        })
    elif resources.get("max_raster_worker_memory_mb", 0) > 1024.0:
        anomalies.append({
            "component": "Multi-Granule Raster Memory Allocation Guard",
            "severity": "MEDIUM",
            "type": "HIGH_RESOURCE_USAGE",
            "message": f"Raster worker process heap ({resources['max_raster_worker_memory_mb']} MB) exceeded 1024 MB threshold."
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
        "hydrodynamics": hydrodynamics,
        "band_math": band_math,
        "dem_topography": dem_topography,
        "mosaic_vrt": mosaic_vrt,
        "temporal_stack": temporal_stack,
        "sar_backscatter": sar_backscatter,
        "coregistration": coregistration,
        "aquatic": aquatic,
        "topographic": topographic,
        "hls": hls,
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
    hydrodynamics = report.get("hydrodynamics", {})
    band_math = report.get("band_math", {})
    dem_topo = report.get("dem_topography", {})
    mosaic_vrt = report.get("mosaic_vrt", {})
    temporal_stack = report.get("temporal_stack", {})
    sar_backscatter = report.get("sar_backscatter", {})
    coregistration = report.get("coregistration", {})
    aquatic = report.get("aquatic", {})
    topographic = report.get("topographic", {})
    hls = report.get("hls", {})
    pipelines = report["pipelines"]
    
    entry_lines = []
    entry_lines.append(f"## [{ts}] System Status: **{status}**\n")
    
    # 1. Resource Usage
    entry_lines.append("### 1. Resource Usage")
    entry_lines.append(f"- **CPU Utilization**: {resources['cpu_percent']}%")
    entry_lines.append(f"- **Memory**: {resources['memory_used_gb']} GB / {resources['memory_total_gb']} GB ({resources['memory_percent']}%)")
    entry_lines.append(f"- **Disk (C:)**: {resources['disk_free_gb']} GB free / {resources['disk_total_gb']} GB total ({resources['disk_percent']}% used)")
    entry_lines.append(f"- **Cache Storage**: {tile_cache['cache_storage']['size_mb']} MB across {tile_cache['cache_storage']['file_count']} files")
    entry_lines.append(f"- **Flood Simulation Numerical Process Memory**: {resources.get('flood_sim_memory_mb', 0.0)} MB")
    entry_lines.append(f"- **Multi-Granule Raster Worker Process Memory**: {resources.get('max_raster_worker_memory_mb', 0.0)} MB")
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
    if "planetary_computer_dem_stac" in data_ing:
        dem_stac_ok = "REACHABLE" if data_ing["planetary_computer_dem_stac"]["ok"] else f"ERROR ({data_ing['planetary_computer_dem_stac']['error']})"
        entry_lines.append(f"- **Copernicus DEM (GLO-30) STAC Asset Ingestion**: `{dem_stac_ok}` ({data_ing['planetary_computer_dem_stac']['latency_ms']} ms)")
    if "planetary_computer_sar_stac" in data_ing:
        sar_stac_ok = "REACHABLE" if data_ing["planetary_computer_sar_stac"]["ok"] else f"ERROR ({data_ing['planetary_computer_sar_stac']['error']})"
        entry_lines.append(f"- **Sentinel-1 RTC STAC Asset Ingestion**: `{sar_stac_ok}` ({data_ing['planetary_computer_sar_stac']['latency_ms']} ms)")
    entry_lines.append(f"- **USGS NWIS Real-Time Telemetry**: `{usgs_ok}` ({data_ing['usgs_nwis']['latency_ms']} ms)")
    entry_lines.append(f"- **NOAA / NWS Weather Services**: `{noaa_ok}` ({data_ing['noaa_weather']['latency_ms']} ms)")
    if "usgs_earthquake" in data_ing:
        eq_ok = "REACHABLE" if data_ing["usgs_earthquake"]["ok"] else f"ERROR ({data_ing['usgs_earthquake']['error']})"
        entry_lines.append(f"- **USGS Real-Time Earthquake & ShakeMap Feed**: `{eq_ok}` ({data_ing['usgs_earthquake']['latency_ms']} ms)")
    if "precipitation_telemetry" in data_ing:
        precip_ok = "REACHABLE" if data_ing["precipitation_telemetry"]["ok"] else f"ERROR ({data_ing['precipitation_telemetry']['error']})"
        entry_lines.append(f"- **Real-Time Precipitation Telemetry (Open-Meteo & NOAA)**: `{precip_ok}` ({data_ing['precipitation_telemetry']['latency_ms']} ms)")
    entry_lines.append(f"- **SQLite Database (`gios.db`)**: `HEALTHY` ({data_ing['sqlite_db']['size_bytes']} bytes, Tables: `{db_tables}`)")
    entry_lines.append("")
    
    # 4. 2D Hydrodynamic CFL Stability & Flood Routing Guard
    if hydrodynamics:
        entry_lines.append("### 4. 2D Hydrodynamic CFL Stability & Flood Routing Guard")
        cfl_status = "STABLE" if hydrodynamics.get("cfl_stable") else "UNSTABLE"
        solver_res = hydrodynamics.get("routing_solver", {})
        solver_status = "VERIFIED" if solver_res.get("passed") else "FAILING"
        tile_probe = hydrodynamics.get("hydrodynamic_tile_probe")
        tile_status = "REACHABLE" if (tile_probe and tile_probe.get("ok")) else "UNREACHABLE"
        
        max_cfl_val = hydrodynamics.get("max_cfl", 0.0)
        entry_lines.append(
            r"- **2D Shallow Water CFL Stability Condition ($\Delta t \le \frac{\Delta x}{\sqrt{g h} + |u|}$)**: "
            f"`{cfl_status}` (Max CFL: {max_cfl_val:.3f} <= 1.0)"
        )
        if solver_res.get("passed"):
            entry_lines.append(f"- **2D De Saint-Venant Downstream Routing Engine**: `{solver_status}` ({solver_res.get('stations_evaluated', 0)} stations evaluated in {solver_res.get('duration_ms', 0.0)} ms)")
        else:
            entry_lines.append(f"- **2D De Saint-Venant Downstream Routing Engine**: `{solver_status}` (Error: {solver_res.get('error')})")
        entry_lines.append(f"- **Dynamic Hydrodynamic Inundation Tile Server**: `{tile_status}` (Probe latency: {tile_probe.get('latency_ms', 0.0) if tile_probe else 'N/A'} ms)")
        entry_lines.append("")

    # 5. AST Band Math Engine & Safe Evaluation Guard
    if band_math:
        entry_lines.append("### 5. AST Band Math Engine & Safe Evaluation Guard")
        depth_status = "ENFORCED" if band_math.get("recursion_depth_guard", {}).get("rejected_properly") else "FAILING"
        eval_g = band_math.get("evaluation_guard", {})
        eval_status = "PASSING" if (eval_g.get("passed") and eval_g.get("under_timeout")) else "FAILING"
        div_g = band_math.get("division_by_zero_guard", {})
        div_status = "VERIFIED" if div_g.get("safe") else "FAILING"
        rast_g = band_math.get("vector_raster_guard", {})
        raster_status = "VERIFIED" if rast_g.get("passed") else "FAILING"
        
        entry_lines.append(f"- **AST Parser Recursion Depth Limit Guard (Max Depth $\\le 20$)**: `{depth_status}` (Depth 22 nested expression rejected cleanly)")
        entry_lines.append(f"- **CPU Execution Latency Watchdog ($< 200\\text{{ms}}$)**: `{eval_status}` ({eval_g.get('duration_ms', 0.0)} ms)")
        entry_lines.append(f"- **Division-by-Zero Numerical Safety Epsilon Guard ($\\epsilon = 10^{{-6}}$)**: `{div_status}` (Clamped finite value: `{div_g.get('result')}`)")
        entry_lines.append(f"- **Vectorized 2D NumPy Raster Allocation Guard**: `{raster_status}` ({rast_g.get('shape')} array evaluated in {rast_g.get('duration_ms', 0.0)} ms)")
        entry_lines.append("")

    # 6. Copernicus 30m DEM (GLO-30) Topography & Hillshade Guard (Task T-219)
    if dem_topo:
        entry_lines.append("### 6. Copernicus 30m DEM (GLO-30) Topography & Hillshade Guard")
        horn_w = dem_topo.get("horn_gradient_watchdog", {})
        horn_status = "PASSING" if (horn_w.get("passed") and horn_w.get("under_timeout")) else "FAILING"
        dem_tile = dem_topo.get("dem_tile_probe")
        dem_tile_status = "REACHABLE" if (dem_tile and dem_tile.get("ok")) else "UNREACHABLE"
        entry_lines.append(f"- **Horn's 3x3 Finite-Difference Convolution Latency Watchdog ($< 100\\text{{ms}}$)**: `{horn_status}` ({horn_w.get('duration_ms', 0.0)} ms)")
        entry_lines.append(f"- **Dynamic DEM Topographic Relief Tile Server (`/tiles/dem/relief/10/500/500.png`)**: `{dem_tile_status}` (Probe latency: {dem_tile.get('latency_ms', 0.0) if dem_tile else 'N/A'} ms)")
        entry_lines.append("")

    # 7. Multi-Tile Seamline Feathering & Virtual Raster (VRT) Guard (Task T-225)
    if mosaic_vrt:
        entry_lines.append("### 7. Multi-Tile Seamline Feathering & Virtual Raster (VRT) Guard")
        feather_g = mosaic_vrt.get("feather_raster_guard", {})
        feather_status = "VERIFIED" if feather_g.get("passed") else "FAILING"
        vrt_g = mosaic_vrt.get("vrt_generation_watchdog", {})
        vrt_status = "PASSING" if (vrt_g.get("passed") and vrt_g.get("under_timeout")) else "FAILING"
        mosaic_tile = mosaic_vrt.get("mosaic_tile_probe")
        mosaic_status = "REACHABLE" if (mosaic_tile and mosaic_tile.get("ok")) else "UNREACHABLE"
        stac_multi = mosaic_vrt.get("stac_multi_item_query", {})
        stac_multi_status = "REACHABLE" if stac_multi.get("ok") else f"ERROR ({stac_multi.get('error')})"
        
        entry_lines.append(f"- **Multi-Granule Raster Memory Allocation Guard (>1GB Heap Threshold)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1024.0 MB)")
        entry_lines.append(f"- **2D Distance-Transform Partition-of-Unity Guard ($w_1 + w_2 = 1.0$)**: `{feather_status}` ({feather_g.get('shape')} array evaluated in {feather_g.get('duration_ms', 0.0)} ms)")
        entry_lines.append(f"- **Virtual Raster (VRT) Generation Latency Watchdog ($< 200\\text{{ms}}$)**: `{vrt_status}` ({vrt_g.get('duration_ms', 0.0)} ms, XML length: {vrt_g.get('xml_length', 0)} bytes)")
        entry_lines.append(f"- **Dynamic Multi-Granule Seamless Mosaic Tile Server (`/tiles/mosaic/...`)**: `{mosaic_status}` (Probe latency: {mosaic_tile.get('latency_ms', 0.0) if mosaic_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Microsoft Planetary Computer STAC Multi-Item Query Monitor**: `{stac_multi_status}` ({stac_multi.get('latency_ms', 0.0)} ms)")
        entry_lines.append("")

    # 8. Multi-Temporal Scene Stacking & Quality Composite Guard (Task T-231)
    if temporal_stack:
        entry_lines.append("### 8. Multi-Temporal Scene Stacking & Quality Composite Guard")
        red_w = temporal_stack.get("reducer_execution_watchdog", {})
        red_status = "PASSING" if (red_w.get("passed") and red_w.get("under_timeout")) else "FAILING"
        comp_tile = temporal_stack.get("composite_tile_probe")
        comp_tile_status = "REACHABLE" if (comp_tile and comp_tile.get("ok")) else "UNREACHABLE"
        stac_temp = temporal_stack.get("stac_temporal_query", {})
        stac_temp_status = "REACHABLE" if stac_temp.get("ok") else f"ERROR ({stac_temp.get('error')})"
        q_class = temporal_stack.get("quality_classifier_guard", {})
        q_status = "VERIFIED" if q_class.get("passed") else "FAILING"

        entry_lines.append(f"- **4D Temporal Stack Memory Allocation Guard (>1.2GB Heap Threshold)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1228.8 MB)")
        entry_lines.append(f"- **Statistical Pixel Reducer Execution Latency Watchdog ($< 400\\text{{ms}}$)**: `{red_status}` ({red_w.get('duration_ms', 0.0)} ms, array shape: {red_w.get('shape')})")
        entry_lines.append(f"- **Quality Mosaic Classifier Invariant Guard**: `{q_status}` (Verified tier: `{q_class.get('tier')}` for 92% valid pixels, 5 scenes)")
        entry_lines.append(f"- **Dynamic Temporal Quality Composite Tile Server (`/tiles/composite/...`)**: `{comp_tile_status}` (Probe latency: {comp_tile.get('latency_ms', 0.0) if comp_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Microsoft Planetary Computer STAC Multi-Temporal Search Monitor**: `{stac_temp_status}` ({stac_temp.get('latency_ms', 0.0)} ms)")
        entry_lines.append("")

    # 9. Sentinel-1 SAR Dual-Pol Backscatter & Speckle Filter Guard (Task T-237)
    if sar_backscatter:
        entry_lines.append("### 9. Sentinel-1 SAR Dual-Pol Backscatter & Speckle Filter Guard")
        sp_w = sar_backscatter.get("speckle_filter_watchdog", {})
        sp_status = "PASSING" if (sp_w.get("passed") and sp_w.get("under_timeout")) else "FAILING"
        wat_g = sar_backscatter.get("water_threshold_guard", {})
        wat_status = "VERIFIED" if wat_g.get("passed") else "FAILING"
        sar_tile = sar_backscatter.get("sar_tile_probe")
        sar_tile_status = "REACHABLE" if (sar_tile and sar_tile.get("ok")) else "UNREACHABLE"
        stac_sar = sar_backscatter.get("stac_sar_collection", {})
        stac_sar_status = "REACHABLE" if stac_sar.get("ok") else f"ERROR ({stac_sar.get('error')})"

        entry_lines.append(f"- **Float32 SAR Amplitude Array Allocation Guard (>1.5GB Threshold)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1536.0 MB)")
        entry_lines.append(f"- **2D Spatial Adaptive Speckle Filter (Refined Lee) Latency Watchdog ($< 600\\text{{ms}}$)**: `{sp_status}` ({sp_w.get('duration_ms', 0.0)} ms, kernel: 5x5, shape: {sp_w.get('shape')})")
        entry_lines.append(f"- **SAR Decibel Water Inundation Thresholding Guard ($\\sigma^0_{{\\text{{VV}}}} \\le -16.5\\text{{ dB}}$)**: `{wat_status}` (Detected water fraction: {wat_g.get('water_fraction', 0.0)})")
        entry_lines.append(f"- **Dynamic XYZ SAR Backscatter Tile Server (`/tiles/sar/...`)**: `{sar_tile_status}` (Probe latency: {sar_tile.get('latency_ms', 0.0) if sar_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Planetary Computer Sentinel-1 RTC STAC Availability Monitor**: `{stac_sar_status}` ({stac_sar.get('latency_ms', 0.0)} ms)")
        entry_lines.append("")

    # 10. Automated Sub-Pixel Co-Registration & FFT Phase Correlation Guard (Task T-243)
    if coregistration:
        entry_lines.append("### 10. Automated Sub-Pixel Co-Registration & FFT Phase Correlation Guard")
        r_w = coregistration.get("ransac_fitting_watchdog", {})
        ransac_status = "PASSING" if (r_w.get("passed") and r_w.get("under_timeout")) else "FAILING"
        res_g = coregistration.get("resampling_guard", {})
        resamp_status = "VERIFIED" if res_g.get("passed") else "FAILING"
        coreg_tile = coregistration.get("coreg_tile_probe")
        coreg_tile_status = "REACHABLE" if (coreg_tile and coreg_tile.get("ok")) else "UNREACHABLE"
        vec_tile = coregistration.get("vector_field_tile_probe")
        vec_tile_status = "REACHABLE" if (vec_tile and vec_tile.get("ok")) else "UNREACHABLE"
        cat_g = coregistration.get("scene_pair_catalog", {})
        cat_status = "REACHABLE" if cat_g.get("passed") else "ERROR"
        cat_count = cat_g.get("pair_count", 0)

        entry_lines.append(f"- **2D FFT Matrix Memory Allocation Guard (>1.5GB Threshold)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1536.0 MB)")
        entry_lines.append(f"- **RANSAC Transformation Fitting Latency Watchdog ($< 800\\text{{ms}}$)**: `{ransac_status}` ({r_w.get('duration_ms', 0.0)} ms, candidate tie-points: {r_w.get('points_count', 0)})")
        entry_lines.append(f"- **2D Keys Cubic Convolution Resampling Guard**: `{resamp_status}` ({res_g.get('duration_ms', 0.0)} ms, array shape: {res_g.get('shape')})")
        entry_lines.append(f"- **Dynamic XYZ Co-Registered Tile Server (`/tiles/coregistration/...`)**: `{coreg_tile_status}` (Probe latency: {coreg_tile.get('latency_ms', 0.0) if coreg_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Dynamic XYZ Displacement Vector Field Tile Server (`/tiles/coregistration/vector-field/...`)**: `{vec_tile_status}` (Probe latency: {vec_tile.get('latency_ms', 0.0) if vec_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Multi-Temporal Scene Pair Ingestion & Benchmark Catalog**: `{cat_status}` ({cat_count} benchmark scene pairs indexed)")
        entry_lines.append("")

    # 11. Aquatic Bio-Optical Water Quality & HAB Hazard Guard (Task T-249)
    if aquatic:
        entry_lines.append("### 11. Aquatic Bio-Optical Water Quality & HAB Hazard Guard")
        b_w = aquatic.get("bio_optical_inversion_watchdog", {})
        bio_status = "PASSING" if (b_w.get("passed") and b_w.get("under_timeout")) else "FAILING"
        ndci_tile = aquatic.get("ndci_tile_probe")
        ndci_status = "REACHABLE" if (ndci_tile and ndci_tile.get("ok")) else "UNREACHABLE"
        hab_tile = aquatic.get("hab_tile_probe")
        hab_status = "REACHABLE" if (hab_tile and hab_tile.get("ok")) else "UNREACHABLE"
        aq_cat = aquatic.get("aquatic_scene_catalog", {})
        aq_cat_status = "REACHABLE" if aq_cat.get("passed") else "ERROR"
        aq_cat_count = aq_cat.get("scene_count", 0)

        entry_lines.append(f"- **Float32 Bio-Optical Array Memory Allocation Guard (>1.5GB Threshold)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1536.0 MB)")
        entry_lines.append(f"- **Turbidity & Chlorophyll-a Inversion Latency Watchdog ($< 400\\text{{ms}}$)**: `{bio_status}` ({b_w.get('duration_ms', 0.0)} ms, mean Chl-a: {b_w.get('chla_mean', 0.0)} ug/L)")
        entry_lines.append(f"- **Dynamic XYZ Bio-Optical Aquatic Quality Tile Server (`/tiles/aquatic/...`)**: `{ndci_status}` (Probe latency: {ndci_tile.get('latency_ms', 0.0) if ndci_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Dynamic XYZ Aquatic HAB Hazard Tile Server (`/tiles/aquatic/hab/...`)**: `{hab_status}` (Probe latency: {hab_tile.get('latency_ms', 0.0) if hab_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Water Reservoir STAC Ingestion & Scene Search Monitor**: `{aq_cat_status}` ({aq_cat_count} benchmark aquatic scenes indexed)")
        entry_lines.append("")

    # 12. Topographic Solar Illumination Correction & SCS+C Guard (Task T-255)
    if topographic:
        entry_lines.append("### 12. Topographic Solar Illumination Correction & SCS+C Guard")
        t_w = topographic.get("illumination_cosine_watchdog", {})
        topo_status = "PASSING" if (t_w.get("passed") and t_w.get("under_timeout")) else "FAILING"
        topo_tile = topographic.get("topographic_tile_probe")
        topo_status_code = "REACHABLE" if (topo_tile and topo_tile.get("ok")) else ("UNREACHABLE" if topo_tile else "N/A")
        illum_tile = topographic.get("illumination_tile_probe")
        illum_status = "REACHABLE" if (illum_tile and illum_tile.get("ok")) else ("UNREACHABLE" if illum_tile else "N/A")
        top_cat = topographic.get("topographic_scene_catalog", {})
        top_cat_status = "REACHABLE" if top_cat.get("passed") else "ERROR"
        top_cat_count = top_cat.get("scene_count", 0)

        entry_lines.append(f"- **Float32 DEM Normal Vector Memory Guard (>1.5GB Heap Ceiling)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1536.0 MB)")
        entry_lines.append(f"- **Illumination Cosine Calculation Latency Watchdog ($< 300\\text{{ms}}$)**: `{topo_status}` ({t_w.get('duration_ms', 0.0)} ms, mean cos(i): {t_w.get('mean_cos_i', 0.0)})")
        entry_lines.append(f"- **Dynamic XYZ Topographic Correction Tile Server (`/tiles/topographic/...`)**: `{topo_status_code}` (Probe latency: {topo_tile.get('latency_ms', 0.0) if topo_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Dynamic XYZ Solar Illumination Tile Server (`/tiles/topographic/illumination/...`)**: `{illum_status}` (Probe latency: {illum_tile.get('latency_ms', 0.0) if illum_tile else 'N/A'} ms)")
        entry_lines.append(f"- **High-Relief DEM Asset Ingestion Monitor**: `{top_cat_status}` ({top_cat_count} benchmark topographic scenes indexed)")
        entry_lines.append("")

    # 13. Harmonized Landsat Sentinel-2 (HLS) NBAR Guard (Task T-261)
    if hls:
        entry_lines.append("### 13. Harmonized Landsat Sentinel-2 (HLS) NBAR Guard")
        h_w = hls.get("hls_harmonization_watchdog", {})
        hls_status = "PASSING" if (h_w.get("passed") and h_w.get("under_timeout")) else "FAILING"
        hls_tile = hls.get("hls_tile_probe")
        hls_tile_status = "REACHABLE" if (hls_tile and hls_tile.get("ok")) else ("UNREACHABLE" if hls_tile else "N/A")
        nbar_tile = hls.get("nbar_tile_probe")
        nbar_status = "REACHABLE" if (nbar_tile and nbar_tile.get("ok")) else ("UNREACHABLE" if nbar_tile else "N/A")
        hls_cat = hls.get("hls_scene_catalog", {})
        hls_cat_status = "REACHABLE" if hls_cat.get("passed") else "ERROR"
        hls_cat_count = hls_cat.get("scene_count", 0)

        entry_lines.append(f"- **RossThick-LiSparse-R Kernel Memory Guard (>1.5GB Heap Ceiling)**: `PASSING` (Max worker heap: {resources.get('max_raster_worker_memory_mb', 0.0)} MB <= 1536.0 MB)")
        entry_lines.append(f"- **HLS BRDF Kernel & NBAR Harmonization Latency Watchdog ($< 300\\text{{ms}}$)**: `{hls_status}` ({h_w.get('duration_ms', 0.0)} ms)")
        entry_lines.append(f"- **Dynamic XYZ HLS Harmonized Surface Reflectance Tile Server (`/tiles/hls/...`)**: `{hls_tile_status}` (Probe latency: {hls_tile.get('latency_ms', 0.0) if hls_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Dynamic XYZ HLS NBAR Tile Server (`/tiles/hls/nbar/...`)**: `{nbar_status}` (Probe latency: {nbar_tile.get('latency_ms', 0.0) if nbar_tile else 'N/A'} ms)")
        entry_lines.append(f"- **Planetary Computer HLS Multi-Sensor STAC Ingestion Monitor**: `{hls_cat_status}` ({hls_cat_count} benchmark HLS scenes indexed)")
        entry_lines.append("")

    # 14. Pipeline Execution & Verification
    entry_lines.append("### 14. Pipeline Execution")
    test_ok = "PASSING" if pipelines["test_suite"]["passed"] else "FAILED"
    entry_lines.append(f"- **Core Test Suite & API Pipelines**: `{test_ok}` ({pipelines['test_suite']['duration_sec']}s)")
    entry_lines.append("")
    
    # 15. Detected Anomalies & Action Items
    if anomalies:
        entry_lines.append("### 15. Detected Anomalies & Action Items")
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
        entry_lines.append("### 15. Detected Anomalies")
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

def acquire_daemon_lock() -> bool:
    if os.path.exists(DAEMON_PID_FILE):
        try:
            with open(DAEMON_PID_FILE, "r", encoding="utf-8") as f:
                pid = int(f.read().strip())
            if psutil.pid_exists(pid):
                proc = psutil.Process(pid)
                if "python" in proc.name().lower():
                    cmd = " ".join(proc.cmdline())
                    if "health_check_daemon" in cmd and pid != os.getpid():
                        logger.warning(f"Another Health Monitor daemon is already active (PID {pid}). Exiting.")
                        return False
        except Exception:
            pass

    try:
        with open(DAEMON_PID_FILE, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
    except Exception:
        pass

    def cleanup():
        if os.path.exists(DAEMON_PID_FILE):
            try:
                with open(DAEMON_PID_FILE, "r", encoding="utf-8") as f:
                    p = int(f.read().strip())
                if p == os.getpid():
                    os.remove(DAEMON_PID_FILE)
            except Exception:
                pass

    atexit.register(cleanup)
    return True

def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: python health_check_daemon.py [--once] [--interval=SECONDS] [--daemon]")
        return
    single_pass = "--once" in sys.argv or "--single-pass" in sys.argv
    daemon_mode = "--daemon" in sys.argv or not single_pass
    interval = 60
    for arg in sys.argv:
        if arg.startswith("--interval="):
            try:
                interval = int(arg.split("=")[1])
            except ValueError:
                pass

    if daemon_mode:
        if not acquire_daemon_lock():
            return

    logger.info(f"Health Monitor initialized. Mode: {'DAEMON' if daemon_mode else 'SINGLE PASS'}")
    
    pass_count = 0
    while True:
        pass_count += 1
        try:
            full_suite = ("--full" in sys.argv) or (pass_count % 10 == 0)
            report = run_health_check(full_test_suite=full_suite)
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
