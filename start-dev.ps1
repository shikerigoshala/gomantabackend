Write-Host "Starting development servers..." -ForegroundColor Green

# Start the client
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot'; npm run dev"

# Start the server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot\server'; npm start"

Write-Host "Development servers started!" -ForegroundColor Green
