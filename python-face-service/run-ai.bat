@echo off
cd /d "%~dp0"
title GodotLaunch Python AI Service
set "VENV_PATH=%~dp0.venv"
if not exist "%VENV_PATH%\Scripts\python.exe" (
    echo [ERROR] Virtual environment was not found at:
    echo %VENV_PATH%
    echo Run setup-venv.bat first.
    pause
    exit /b 1
)
echo Activating Virtual Environment...
call "%VENV_PATH%\Scripts\activate"
echo Starting FastAPI AI Service on http://127.0.0.1:8001 ...
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause
