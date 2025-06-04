powershell -Command "Write-Host 'Starting development servers...' -ForegroundColor Green"

powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location -Path \"$PSScriptRoot\"; npm run dev'"
powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location -Path \"$PSScriptRoot\server\"; npm start'"

powershell -Command "Write-Host 'Development servers started!' -ForegroundColor Green"
