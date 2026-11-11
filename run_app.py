import os
import sys
import time
import signal
import subprocess
import webbrowser
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
DIST_DIR = os.path.join(FRONTEND_DIR, 'dist')
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')

def build_frontend_if_needed():
    if "--no-build" in sys.argv or "--quick" in sys.argv:
        return
    index_html = os.path.join(DIST_DIR, 'index.html')
    needs_build = not os.path.exists(DIST_DIR) or not os.path.exists(index_html)

    if not needs_build:
        dist_mtime = os.path.getmtime(index_html)
        src_dir = os.path.join(FRONTEND_DIR, 'src')
        for root, _, files in os.walk(src_dir):
            for f in files:
                f_path = os.path.join(root, f)
                if os.path.getmtime(f_path) > dist_mtime:
                    needs_build = True
                    break
            if needs_build:
                break

    if needs_build:
        print(">> Detected frontend source updates. Building frontend static bundle...")
        cmd = ["npm.cmd" if os.name == 'nt' else "npm", "run", "build"]
        subprocess.run(cmd, cwd=FRONTEND_DIR, check=True)
        print(">> Frontend build complete.")

def kill_proc_tree(pid):
    """Forcefully kills a process and all its child processes on Windows/Unix instantly."""
    if not pid:
        return
    if sys.platform == 'win32':
        try:
            # /F = force, /T = entire process tree (uvicorn reloader + worker processes)
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, timeout=3)
        except Exception:
            pass
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except Exception:
            try:
                os.kill(pid, signal.SIGKILL)
            except Exception:
                pass

def free_port(port=8000):
    """Ensures port 8000 is clean and not locked by any zombie python process."""
    if sys.platform == 'win32':
        try:
            cmd = f'Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess'
            res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=3)
            pids = set(res.stdout.strip().split())
            curr_pid = str(os.getpid())
            for p in pids:
                if p.isdigit() and p != curr_pid and p != '0':
                    subprocess.run(["taskkill", "/F", "/PID", p], capture_output=True, timeout=2)
        except Exception:
            pass

def main():
    print("=" * 65)
    print("  OTM Option Screener & Pattern Radar (Pro Seller Studio)")
    print("  (Nifty OTM Reversals • Sep 2026 -> Dec 2027 Expiries)")
    print("  (Microstructure Radar • 4-Quadrant Matrix • NSE 7PM Participant OI)")
    print("=" * 65)

    build_frontend_if_needed()

    port = 8000
    app_url = f"http://127.0.0.1:{port}"

    # Free port 8000 in case a previous process was left behind
    free_port(port)

    def open_browser():
        import urllib.request
        start = time.time()
        ready = False
        while time.time() - start < 15.0:
            try:
                with urllib.request.urlopen(f"{app_url}/api/status", timeout=1.0) as resp:
                    if resp.status == 200:
                        ready = True
                        break
            except Exception:
                time.sleep(0.15)

        elapsed = time.time() - start
        if ready:
            print(f">> Backend online in {elapsed:.1f}s. Opening {app_url} in your default browser...\n")
        else:
            print(f">> Opening {app_url} in your default browser...\n")
        webbrowser.open(app_url)

    threading.Thread(target=open_browser, daemon=True).start()

    print(f"\n>> Launching FastAPI server & serving client at {app_url} ...\n")
    print(">> Press Ctrl+C at any time to shut down cleanly.\n")

    cmd = [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "127.0.0.1",
        "--port", str(port),
        "--app-dir", BACKEND_DIR,
        "--reload"
    ]

    # Use CREATE_NEW_PROCESS_GROUP on Windows so Ctrl+C is caught cleanly by parent
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
    proc = subprocess.Popen(cmd, creationflags=creationflags)

    def force_exit(signum=None, frame=None):
        print("\n>> Stopping server and all worker processes immediately...")
        if proc and proc.poll() is None:
            kill_proc_tree(proc.pid)
        free_port(port)
        print(">> Server stopped cleanly.")
        os._exit(0)

    # Register OS signal handlers for instant termination
    signal.signal(signal.SIGINT, force_exit)
    signal.signal(signal.SIGTERM, force_exit)
    if hasattr(signal, 'SIGBREAK'):
        signal.signal(signal.SIGBREAK, force_exit)

    # Non-blocking poll loop allows Python to process signals and Ctrl+C in < 200ms
    try:
        while proc.poll() is None:
            try:
                proc.wait(timeout=0.2)
            except subprocess.TimeoutExpired:
                pass
    except (KeyboardInterrupt, SystemExit):
        force_exit()

    force_exit()

if __name__ == '__main__':
    main()
