"""Persistent Service Launcher for GIOS Backend & Frontend.
Spawns FastAPI (port 8000) and Vite (port 5173) as fully detached background processes
that persist across agent runs and terminal sessions.
"""
import os
import sys
import time
import socket
import subprocess
import urllib.request

GIOS_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_DIR = os.path.join(GIOS_DIR, "gios-react")
BACKEND_OUT = os.path.join(GIOS_DIR, "backend_out.log")
BACKEND_ERR = os.path.join(GIOS_DIR, "backend_err.log")
VITE_OUT = os.path.join(GIOS_DIR, "vite.log")
VITE_ERR = os.path.join(GIOS_DIR, "vite.err")

# Windows process creation flags for detached background processes
DETACHED_FLAGS = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP

def is_port_listening(port: int, host: str = "127.0.0.1", timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def start_backend():
    if is_port_listening(8000):
        print("Backend already listening on port 8000.")
        return

    print("Launching FastAPI backend on port 8000 (detached)...")
    out_f = open(BACKEND_OUT, "a", encoding="utf-8")
    err_f = open(BACKEND_ERR, "a", encoding="utf-8")
    
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=GIOS_DIR,
        stdout=out_f,
        stderr=err_f,
        creationflags=DETACHED_FLAGS if os.name == "nt" else 0,
        close_fds=True
    )
    print(f"Backend spawned with PID: {proc.pid}")

def start_frontend():
    if is_port_listening(5173):
        print("Frontend already listening on port 5173.")
        return

    print("Launching Vite frontend on port 5173 (detached)...")
    out_f = open(VITE_OUT, "a", encoding="utf-8")
    err_f = open(VITE_ERR, "a", encoding="utf-8")
    
    cmd = ["npm.cmd" if os.name == "nt" else "npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
    proc = subprocess.Popen(
        cmd,
        cwd=REACT_DIR,
        stdout=out_f,
        stderr=err_f,
        creationflags=DETACHED_FLAGS if os.name == "nt" else 0,
        close_fds=True
    )
    print(f"Frontend spawned with PID: {proc.pid}")

def probe_endpoint(name: str, url: str):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GIOS-HealthProber/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read()
            print(f"  [OK] {name} ({url}) -> Status {resp.status}, {len(data)} bytes")
            return True
    except Exception as e:
        print(f"  [FAIL] {name} ({url}) -> {e}")
        return False

def main():
    start_backend()
    start_frontend()

    print("Waiting 6 seconds for services to initialize...")
    time.sleep(6)

    b_ok = is_port_listening(8000)
    f_ok = is_port_listening(5173)
    print(f"Port 8000 listening: {b_ok}")
    print(f"Port 5173 listening: {f_ok}")

    print("\nProbing live endpoints:")
    probe_endpoint("Backend Health", "http://127.0.0.1:8000/health")
    probe_endpoint("Frontend Root", "http://127.0.0.1:5173/")
    probe_endpoint("Frontend /health Proxy", "http://127.0.0.1:5173/health")
    probe_endpoint("XYZ Tile Server", "http://127.0.0.1:8000/api/v1/tiles/sentinel-2-l2a/test/10/163/395.png")

if __name__ == "__main__":
    main()
