$serverProcess = Start-Process -FilePath "node" -ArgumentList "unifiedServer.js" -NoNewWindow -PassThru
Write-Host "Started Unified Server with PID: $($serverProcess.Id)"

# Navigate to frontend directory and start React app
Set-Location -Path ".\frontend"
npm start

# When npm start is terminated, also stop the Node.js server
Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "Stopped Unified Server"
