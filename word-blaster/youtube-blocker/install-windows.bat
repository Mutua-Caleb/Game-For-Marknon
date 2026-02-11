@echo off
REM Word Blaster YouTube Blocker - Windows Installation Script
REM Right-click this file and select "Run as administrator"

echo === Word Blaster YouTube Blocker Setup (Windows) ===
echo.

REM Check admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

REM Get server URL and learner ID
set /p SERVER_URL="Enter Word Blaster server URL (e.g., https://your-app.onrender.com): "
set /p LEARNER_ID="Enter Learner ID (number from registration): "

if "%SERVER_URL%"=="" (
    echo ERROR: Server URL is required
    pause
    exit /b 1
)
if "%LEARNER_ID%"=="" (
    echo ERROR: Learner ID is required
    pause
    exit /b 1
)

REM Create install directory
echo Installing blocker script...
if not exist "C:\WordBlasterBlocker" mkdir "C:\WordBlasterBlocker"
copy /Y blocker.py "C:\WordBlasterBlocker\blocker.py" >nul

REM Create a launcher VBS script (runs hidden, no console window)
echo Creating hidden launcher...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "python ""C:\WordBlasterBlocker\blocker.py"" --server-url %SERVER_URL% --learner-id %LEARNER_ID%", 0, False
) > "C:\WordBlasterBlocker\launcher.vbs"

REM Create scheduled task that runs at logon as SYSTEM (admin)
echo Creating scheduled task (runs on startup)...
schtasks /delete /tn "WordBlasterYouTubeBlocker" /f >nul 2>&1
schtasks /create /tn "WordBlasterYouTubeBlocker" /tr "wscript.exe \"C:\WordBlasterBlocker\launcher.vbs\"" /sc onlogon /rl highest /ru SYSTEM /f

if %errorlevel% equ 0 (
    echo.
    echo === Setup Complete ===
    echo YouTube is now blocked until the daily quiz quota is met.
    echo The blocker will start automatically when Windows starts.
    echo.
    echo Starting the blocker now...
    wscript.exe "C:\WordBlasterBlocker\launcher.vbs"
    echo.
    echo Useful commands (run as Administrator):
    echo   schtasks /query /tn "WordBlasterYouTubeBlocker"    - Check status
    echo   schtasks /run /tn "WordBlasterYouTubeBlocker"      - Start manually
    echo   schtasks /end /tn "WordBlasterYouTubeBlocker"      - Stop
    echo   schtasks /delete /tn "WordBlasterYouTubeBlocker" /f - Remove completely
) else (
    echo ERROR: Failed to create scheduled task.
)

echo.
pause
