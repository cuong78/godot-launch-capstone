@echo off
title GodotLaunch Development

echo ======================================
echo Starting GodotLaunch Development...
echo ======================================

set PROJECT=E:\godot-launch-capstone

REM ===========================
REM Backend
REM ===========================
echo Starting Backend...

start "GodotLaunch Backend" cmd /k "cd /d %PROJECT%\backend && mvn spring-boot:run"

timeout /t 8 > nul

REM ===========================
REM Frontend
REM ===========================
echo Starting Frontend...

start "GodotLaunch Frontend" cmd /k "cd /d %PROJECT%\frontend && npm run dev"

timeout /t 5 > nul

REM ===========================
REM Ngrok
REM ===========================
echo Starting Ngrok...

start "Ngrok" cmd /k "cd /d E:\ && ngrok.exe http 8080"

timeout /t 3 > nul

REM ===========================
REM Open Browser
REM ===========================
start http://127.0.0.1:4040

echo.
echo ======================================
echo Backend  : http://localhost:8080
echo Frontend : http://localhost:5173
echo Ngrok UI : http://127.0.0.1:4040
echo ======================================

pause