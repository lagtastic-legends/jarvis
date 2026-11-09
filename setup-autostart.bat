@echo off
echo ========================================================
echo   Setting up JARVIS 24/7 Background Startup
echo ========================================================

set SCRIPT_PATH=%~dp0start-jarvis-background.vbs
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT=%STARTUP_FOLDER%\JARVIS-AI-Command-Center.vbs

copy "%SCRIPT_PATH%" "%SHORTCUT%" /Y

echo.
echo [SUCCESS] JARVIS background daemon has been registered to Windows Startup!
echo It will now launch automatically in the background whenever you boot your PC.
echo.
echo Local Access: http://localhost:3001
echo ========================================================
pause
