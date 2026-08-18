# Runs the backend forever: restarts uvicorn if it ever exits/crashes.
#
# Deliberately NOT using --reload: on Windows, uvicorn's --reload spawns its worker via Python's
# multiprocessing (spawn), which inherits the listening socket into a *second* process whose
# command line is generic multiprocessing boilerplate (no project path in it at all). If that
# parent is ever killed without also killing this child, the child survives independently,
# invisible to any process search for this project, silently serving stale code forever while
# still answering on the port. This cost a lot of debugging time twice — not worth the
# auto-reload convenience for a personal dev tool. Restart this script after backend code changes.
$backendDir = "D:\self_developed_system\samson_personal_dashboard\backend"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
$logFile = Join-Path $backendDir "keepalive.log"

# Set-Location matters: DATABASE_URL defaults to the relative path "sqlite:///./personalverse.db"
# (see app/core/config.py), so the process's actual working directory must be $backendDir or it
# will silently create/open a fresh, empty database wherever it happens to be launched from
# (e.g. C:\Windows\System32 when started by Task Scheduler) instead of the real one.
Set-Location $backendDir

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Starting backend..."
    & $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8090 --app-dir $backendDir *>> $logFile
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Backend exited (code $LASTEXITCODE). Restarting in 3s..."
    Start-Sleep -Seconds 3
}
