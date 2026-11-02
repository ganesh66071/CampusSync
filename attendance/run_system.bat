@echo off
title Smart Attendance System - Master Launcher
echo ========================================================
echo       SMART CLASSROOM ATTENDANCE SYSTEM LAUNCHER
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking & killing any lingering port-locking processes...
powershell -Command "Get-Process -Name 'putty', 'serial-monitor' -ErrorAction SilentlyContinue | Stop-Process -Force"

echo [2/3] Detecting & verifying ESP32 Bluetooth Link...
python connect_esp32_windows.py

echo.
echo [3/3] Launching Backend and Frontend in separate windows...

start "FastAPI Backend (Port 8000)" cmd /k "cd backend_python && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

start "Vite React Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo  All systems launched!
echo  Open browser at: http://localhost:5173
echo ========================================================
pause
