import subprocess
import sys
import os

def main():
    print("=" * 60)
    print("  PERSONALVERSE - AI PERSONAL OPERATING SYSTEM")
    print("=" * 60)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    # 1. Ensure backend Python dependencies are installed
    print("\n[1/4] Checking Backend Dependencies...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", "-r", "requirements.txt"],
        cwd=backend_dir,
        check=True,
    )

    # 2. Ensure backend seed data is present
    print("\n[2/4] Checking Database & Seeding Initial State...")
    try:
        subprocess.run([sys.executable, "seed_data.py"], cwd=backend_dir, check=True)
    except Exception as e:
        print(f"Seed note: {e}")

    # 3. Check node_modules in frontend
    node_modules = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("\n[3/4] Installing Frontend Dependencies (npm install)...")
        subprocess.run("npm install", shell=True, cwd=frontend_dir, check=True)
    else:
        print("\n[3/4] Frontend dependencies verified.")

    # 4. Launching FastAPI Backend and Vite Frontend
    print("\n[4/4] Starting PersonalVerse Servers:")
    print("  * Backend API: http://127.0.0.1:8088/docs")
    print("  * Frontend UI: http://localhost:3080")
    print("  * Demo login:  demo@personalverse.ai / demo123")
    print("=" * 60)

    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8088", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=backend_dir)

    frontend_cmd = "npm run dev"
    frontend_proc = subprocess.Popen(frontend_cmd, shell=True, cwd=frontend_dir)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down PersonalVerse services...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
