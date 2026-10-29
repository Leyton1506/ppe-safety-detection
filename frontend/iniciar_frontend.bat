@echo off
chcp 65001 >nul
title Frontend (Next.js)
cd /d "%~dp0"

echo ===================================================
echo       Servidor Frontend (Next.js)
echo ===================================================
echo Directorio: %CD%
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo ===================================================
    echo [ERROR] El servidor Frontend se detuvo con errores.
    echo ===================================================
    pause
)
