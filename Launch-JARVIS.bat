@echo off
title JARVIS AI Holographic Command Center
cls
echo ========================================================
echo   [JARVIS AI] Booting Command Center & Neural Engine...
echo ========================================================
echo.

cd /d "%~dp0"

:: Open the browser immediately to the frontend
start "" http://localhost:5173

:: Start the unified dev server (Vite + Auto-Backend on 3001)
npm run dev
