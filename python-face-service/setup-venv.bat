@echo off
cd /d "%~dp0"
title Setup Python Virtual Environment

set "VENV_PATH=%~dp0.venv"

echo ==============================================
echo Setting up Python Virtual Environment (venv)
echo Path: %VENV_PATH%
echo ==============================================

:: Check if Python 3.14 is installed and selected by the python command
python --version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python was not found in PATH.
    pause
    exit /b 1
)

python -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 14) else 1)"
if errorlevel 1 (
    echo [ERROR] Python 3.14 was not found.
    echo Current version:
    python --version
    echo Please make sure the python command points to Python 3.14.
    pause
    exit /b 1
)

:: Create virtual environment if it does not exist
if not exist "%VENV_PATH%" (
    echo Creating virtual environment...
    python -m venv "%VENV_PATH%"
    if errorlevel 1 (
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
python -m pip install cmake

:: Install PyTorch (CPU-only version)
echo Installing PyTorch (CPU-only version)...
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu

:: Install precompiled dlib for Python 3.14 on Windows
echo Installing precompiled dlib for Python 3.14...
python -m pip install "https://github.com/z-mahmud22/Dlib_Windows_Python3.x/raw/main/dlib-20.0.99-cp314-cp314-win_amd64.whl"

:: Install other requirements
echo Installing requirements from requirements.txt...
python -m pip install -r requirements.txt

echo ==============================================
echo Setup completed successfully!
echo ==============================================
pause
