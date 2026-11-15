@echo off
title PrivacyGuard — Launcher
echo ========================================================
echo        Starting PrivacyGuard Privacy Layer...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Launch local engine using Node.js (installed v24) or Python
echo [1/2] Starting PrivacyGuard Engine at http://127.0.0.1:8000...

where node >nul 2>&1
if not errorlevel 1 (
    start "PrivacyGuard Local Engine" cmd /k "cd /d %~dp0 && title PrivacyGuard Engine (Running) && node server.js"
) else (
    if exist "%~dp0.venv\Scripts\python.exe" (
        start "PrivacyGuard Local Engine" cmd /k "cd /d %~dp0 && title PrivacyGuard Engine (Running) && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
    ) else (
        start "PrivacyGuard Local Engine" cmd /k "cd /d %~dp0 && title PrivacyGuard Engine (Running) && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
    )
)

:: 2. Wait 2 seconds for server to bind port
echo [2/2] Launching application in your browser...
timeout /t 2 /nobreak >nul

:: 3. Open Web Application
start http://127.0.0.1:8000/

echo.
echo ========================================================
echo   PrivacyGuard is RUNNING!
echo   - Local App URL: http://127.0.0.1:8000/
echo   - Keep the "PrivacyGuard Local Engine" window OPEN!
echo ========================================================
echo.
pause
