@echo off
cd /d "%~dp0"
title GodotLaunch Python AI Service
set VENV_PATH=%USERPROFILE%\venv-godot-launch
echo Activating Virtual Environment...
call "%VENV_PATH%\Scripts\activate"
echo Starting FastAPI AI Service on http://127.0.0.1:8001 ...
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause
