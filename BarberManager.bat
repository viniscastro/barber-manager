@echo off
title Inicializador - Barber Manager
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

timeout /t 10 /nobreak >nul

cd /d "%~dp0"

docker compose up -d

start "" "frontend\login.html"

pause