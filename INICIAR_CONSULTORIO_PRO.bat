@echo off
chcp 65001 >nul
title Consultorio-Pro - Sistema Medico y WhatsApp IA
color 0B

echo =========================================================
echo   INICIANDO CONSULTORIO-PRO (SISTEMA MEDICO Y ASISTENTE IA)
echo =========================================================
echo.
echo  Directorio: C:\Users\Familia\Documents\antigravity\lucid-hopper\consultorio-pro
echo  Servidor:   http://localhost:3000
echo  Panel:      http://localhost:3000/panel
echo.
echo  Iniciando servidor y conectando con WhatsApp...
echo.

cd /d "C:\Users\Familia\Documents\antigravity\lucid-hopper\consultorio-pro"

:: Abrir el panel de control en el navegador en segundo plano
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000/panel'"

:: Ejecutar el servidor con Node directamente
node dist/server.js

echo.
echo =========================================================
echo  El servidor se ha detenido.
echo =========================================================
pause
