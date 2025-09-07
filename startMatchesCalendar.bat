@echo off
title Matches Calendar - Development Server
color 0A
echo ============================================
echo   MATCHES CALENDAR APPLICATION
echo   Starting Backend and Frontend servers...
echo ============================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this from the matches-calendar root directory.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Start the application
echo Starting servers...
echo Press Ctrl+C to stop both servers
echo.
call npm start

:: Keep window open if servers crash
echo.
echo Servers stopped.
pause