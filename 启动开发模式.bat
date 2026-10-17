@echo off
chcp 65001 >nul
title Dev Mode Launcher (hot reload)
cd /d "%~dp0"

rem Development mode: http://localhost:5173/ with hot reload.
rem Use this when you are editing code and want the page to update by itself.
rem For normal viewing / demo, use "启动网站.bat" instead.
set "NODE_EXE=D:\PCL2\NODEjs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

start "sd-dev-server" /min cmd /c ""%NODE_EXE%" "%~dp0node_modules\vite\bin\vite.js" --host 0.0.0.0"
ping -n 6 127.0.0.1 >nul
start "" "http://localhost:5173/"
echo.
echo Dev server is starting in the minimized window "sd-dev-server".
echo Close that window to stop it.
echo.
pause
