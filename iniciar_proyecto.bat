@echo off
chcp 65001 >nul
title Lanzador de PPE Safety Detection
cd /d "%~dp0"

echo ===================================================
echo    Iniciando PPE Safety Detection System
echo ===================================================
echo.

echo [1/3] Iniciando Backend (FastAPI + YOLO en puerto 8000)...
start "Backend (FastAPI)" "%~dp0backend\iniciar_backend.bat"

:: Esperar 2 segundos para que el Backend inicie primero
ping 127.0.0.1 -n 3 >nul

echo [2/3] Iniciando Frontend (Next.js en puerto 3000)...
start "Frontend (Next.js)" "%~dp0frontend\iniciar_frontend.bat"

:: Esperar 6 segundos para que Next.js compile y el backend termine de montar YOLO
echo [3/3] Esperando 6 segundos para abrir el navegador...
ping 127.0.0.1 -n 7 >nul
start http://localhost:3000

echo.
echo ===================================================
echo    Ambos servicios estan ejecutandose:
echo    - Backend:  http://localhost:8000
echo    - Frontend: http://localhost:3000
echo.
echo    Para detener todo, haz doble clic en:
echo    detener_proyecto.bat
echo ===================================================
ping 127.0.0.1 -n 4 >nul
exit
