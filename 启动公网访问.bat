@echo off
chcp 65001 >nul
title Public Access Launcher - Shandong Yellow River Platform
cd /d "%~dp0"

rem Node on this machine is not on PATH, so point at the known location and
rem fall back to PATH if that install ever moves.
rem All user-facing messages are printed by scripts\serve-public.mjs (UTF-8).
set "NODE_EXE=D:\PCL2\NODEjs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" "%~dp0scripts\serve-public.mjs" %*
echo.
pause
