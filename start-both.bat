@echo off
echo Starting Unified Server and Frontend...

REM Start the unified server in a new window
echo Starting Unified Server...
start "Unified Server" node unifiedServer.js

REM Wait a moment for the server to initialize
timeout /t 3 /nobreak >nul

REM Start the frontend in a new window
echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Both services are starting...
echo Unified Server will run in one window
echo Frontend will run in another window

