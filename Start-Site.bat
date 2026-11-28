@echo off
cd /d "%~dp0"
rem All logic lives in scripts\launch.ps1; -NoExit keeps the window open on failure.
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0scripts\launch.ps1"
