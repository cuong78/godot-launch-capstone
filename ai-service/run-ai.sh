#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_EXE="$SCRIPT_DIR/.venv/Scripts/python.exe"

if [[ ! -f "$PYTHON_EXE" ]]; then
  echo "[ERROR] Virtual environment not found: $PYTHON_EXE"
  echo "Run cmd.exe /c setup-venv.bat first."
  exit 1
fi

cd "$SCRIPT_DIR"
echo "Starting GodotLaunch AI Service on http://127.0.0.1:8001 ..."
exec "$PYTHON_EXE" -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
