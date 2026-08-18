# Launches the backend and frontend keepalive loops as detached, hidden background
# processes, then exits. The child processes are NOT tied to this script's process or to
# whatever session launched it (terminal, Task Scheduler, etc.) — they keep running after
# this script exits and after the launching terminal closes.
$scriptsDir = "D:\self_developed_system\samson_personal_dashboard\scripts"

Start-Process powershell -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
    "-File", (Join-Path $scriptsDir "backend-keepalive.ps1")
) -WindowStyle Hidden

Start-Process powershell -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
    "-File", (Join-Path $scriptsDir "frontend-keepalive.ps1")
) -WindowStyle Hidden

Write-Host "PersonalVerse backend + frontend keepalive loops launched (detached, hidden)."
