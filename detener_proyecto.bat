@echo off
chcp 65001 >nul
title Detener PPE Safety Detection
cd /d "%~dp0"

echo ===================================================
echo    Deteniendo PPE Safety Detection...
echo ===================================================
echo.

echo [1/3] Finalizando procesos de Backend (Python)...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM pythonw.exe /T 2>nul

echo [2/3] Finalizando procesos de Frontend (Node)...
taskkill /F /IM node.exe /T 2>nul

echo [3/3] Cerrando ventanas de terminal del proyecto...
taskkill /F /FI "WINDOWTITLE eq Backend (FastAPI)*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend (Next.js)*" 2>nul
taskkill /F /FI "WINDOWTITLE eq *FastAPI*" 2>nul
taskkill /F /FI "WINDOWTITLE eq *Next.js*" 2>nul

:: Liberar puertos 8000 y 3000 si continuan ocupados
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

echo.
echo ===================================================
echo    Servicios detenidos y ventanas cerradas.
echo ===================================================
ping 127.0.0.1 -n 3 >nul
exit
