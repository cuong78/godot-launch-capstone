@echo off
cd /d "%~dp0"
title Setup Python Virtual Environment

set VENV_PATH=%USERPROFILE%\venv-godot-launch

echo ==============================================
echo Setting up Python Virtual Environment (venv)
echo Path: %VENV_PATH%
echo ==============================================

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH.
    echo Please install Python recommended 3.10+ and make sure to check "Add Python to PATH".
    pause
    exit /b 1
)

:: Create virtual environment if it does not exist
if not exist "%VENV_PATH%" (
    echo Creating virtual environment...
    python -m venv "%VENV_PATH%"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo Virtual environment already exists.
)

:: Activate virtual environment
echo Activating virtual environment...
call "%VENV_PATH%\Scripts\activate"

:: Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

:: Install cmake (required to compile dlib for face_recognition)
echo Installing cmake...
pip install cmake

:: Install PyTorch (CPU-only version)
echo Installing PyTorch (CPU-only version)...
pip install torch --index-url https://download.pytorch.org/whl/cpu

:: Install precompiled dlib for Python 3.14 on Windows
echo Installing precompiled dlib for Python 3.14...
pip install "https://github.com/z-mahmud22/Dlib_Windows_Python3.x/raw/main/dlib-20.0.99-cp314-cp314-win_amd64.whl"

:: Install other requirements
echo Installing requirements from requirements.txt...
pip install -r requirements.txt

echo ==============================================
echo Setup completed successfully!
echo ==============================================
pause
