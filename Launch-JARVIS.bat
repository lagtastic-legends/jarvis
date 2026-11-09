@echo off
title JARVIS AI Holographic Command Center
cls
echo ========================================================
echo   [JARVIS AI] Booting Command Center & Neural Engine...
echo ========================================================
echo.

cd /d "%~dp0"
node scripts\start-jarvis.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] JARVIS encountered an unexpected startup exit code.
  pause
)
