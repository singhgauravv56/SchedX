@echo off
title SchedX - Smart Timetable Generator
cd /d "%~dp0"

echo ==============================================================================
echo                      SCHEDX - 1-CLICK LAUNCHER
echo ==============================================================================
echo.

:: Check if server is already running on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] SchedX server is already running on port 3000!
    echo [OK] Opening website in your default browser...
    start http://localhost:3000
    echo.
    echo Website opened: http://localhost:3000
    exit /b 0
)

:: If server not running, start it
echo [*] Starting SchedX Node.js server...
start "SchedX Server (Port 3000)" cmd /k "cd /d \"%~dp0\" && node server.js"

echo [*] Waiting for server to initialize...
ping 127.0.0.1 -n 3 >nul

echo [OK] Opening http://localhost:3000 in your browser...
start http://localhost:3000

echo.
echo ==============================================================================
echo  SchedX is now running! 
echo  Open anytime in browser: http://localhost:3000
echo  Keep the server window open while using SchedX.
echo ==============================================================================
exit /b 0
