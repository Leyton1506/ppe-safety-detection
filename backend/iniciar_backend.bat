@echo off
chcp 65001 >nul
title Backend (FastAPI)
cd /d "%~dp0"

echo ===================================================
echo       Servidor Backend (FastAPI + YOLO)
echo ===================================================
echo Directorio: %CD%
echo.

if exist venv\Scripts\python.exe (
    echo Entorno virtual detectado: backend\venv
    venv\Scripts\python.exe main.py
) else (
    echo Usando Python del sistema...
    python main.py
)

if errorlevel 1 (
    echo.
    echo ===================================================
    echo [ERROR] El servidor Backend se detuvo con errores.
    echo ===================================================
    pause
)
