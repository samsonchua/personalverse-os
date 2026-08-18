# Runs the frontend dev server forever: restarts Vite if it ever exits/crashes.
$frontendDir = "D:\self_developed_system\samson_personal_dashboard\frontend"
$logFile = Join-Path $frontendDir "keepalive.log"

Set-Location $frontendDir

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Starting frontend..."
    cmd /c "npm run dev" *>> $logFile
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] Frontend exited (code $LASTEXITCODE). Restarting in 3s..."
    Start-Sleep -Seconds 3
}
