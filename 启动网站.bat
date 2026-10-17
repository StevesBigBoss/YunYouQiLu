@echo off
chcp 65001 >nul
title Local Site Launcher
cd /d "%~dp0"

rem Starts the built site on http://localhost:4173/ and opens the browser.
rem All user-facing messages are printed by scripts\serve-public.mjs (UTF-8).
set "NODE_EXE=D:\PCL2\NODEjs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" "%~dp0scripts\serve-public.mjs" --no-tunnel %*
start "" "http://localhost:4173/"
echo.
pause
