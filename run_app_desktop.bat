@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "APP_DIR=%~dp0"
set "APP_DATA_DIR=%APPDATA%\CountThatShi"
set "PROFILE_DIR=%APP_DATA_DIR%\BrowserProfile"
set "VENV_DIR=%APP_DIR%.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"

if not exist "%APP_DATA_DIR%" mkdir "%APP_DATA_DIR%"
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

if not exist "%VENV_PYTHON%" (
  set "BASE_PYTHON="

  where py >nul 2>nul
  if not errorlevel 1 set "BASE_PYTHON=py -3"

  if not defined BASE_PYTHON (
    where python >nul 2>nul
    if not errorlevel 1 set "BASE_PYTHON=python"
  )

  if not defined BASE_PYTHON (
    echo Python was not found. Install Python or add it to PATH.
    pause
    exit /b 1
  )

  !BASE_PYTHON! -m venv "%VENV_DIR%"
)

if not exist "%VENV_PYTHON%" (
  echo Could not create the local virtual environment at "%VENV_DIR%".
  pause
  exit /b 1
)

set "BROWSER="
if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if not defined BROWSER (
  echo Microsoft Edge or Google Chrome was not found.
  pause
  exit /b 1
)

cd /d "%APP_DIR%"
"%VENV_PYTHON%" "%APP_DIR%desktop_server.py" --browser "%BROWSER%" --profile-dir "%PROFILE_DIR%"
set "SERVER_EXIT=%ERRORLEVEL%"

echo.
if "%SERVER_EXIT%"=="0" (
  echo CountThatShi server stopped.
) else (
  echo CountThatShi server exited with error code %SERVER_EXIT%.
)
pause

endlocal
