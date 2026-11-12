@echo off
rem PokeArena TCG - aplicar la v0.120.0. Doble clic desde la raiz del repo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0aplicar-v0.120.ps1"
set RC=%ERRORLEVEL%
echo.
pause
if not "%RC%"=="0" exit /b %RC%
(goto) 2>nul & del "%~f0"
