@echo off
chcp 65001 >nul
title YunYouQiLu - One-click Launcher
cd /d "%~dp0"

rem Double-click this file to open the site at http://localhost:4173/
rem It installs Node.js if missing, installs npm packages on the first run,
rem builds the site, starts the server and opens the browser.

set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE_EXE%" goto run

for /f "delims=" %%i in ('where node 2^>nul') do call :use "%%i"
if defined NODE_EXE goto run

echo Node.js not found. Installing Node.js 22 automatically (needs internet, about 1 minute)...
where winget >nul 2>nul
if errorlevel 1 goto manual
winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE_EXE%" goto run

:manual
echo.
echo Automatic installation failed. Please install Node.js 22 from https://nodejs.org/zh-cn/download
echo Then double-click this file again; everything else is automatic.
echo.
pause
exit /b 1

:use
set "NODE_EXE=%~1"
exit /b 0

:run
"%NODE_EXE%" "%~dp0scripts\serve-public.mjs" --no-tunnel %*
if errorlevel 1 goto fail
start "" "http://localhost:4173/"
echo.
echo Browser opened at http://localhost:4173/ - you can close this window.
pause
exit /b 0

:fail
echo.
echo Startup failed. Read the messages above.
pause
exit /b 1
