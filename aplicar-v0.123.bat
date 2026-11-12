@echo off
rem PokeArena TCG - aplicar la v0.123.0. Doble clic desde la raiz del repo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0aplicar-v0.123.ps1"
set RC=%ERRORLEVEL%
echo.
if not "%RC%"=="0" (
  echo Algo ha fallado. El detalle esta en aplicar-v0.123.log
  pause
  exit /b %RC%
)
pause
if exist "%~dp0aplicar-v0.123.log" del "%~dp0aplicar-v0.123.log"
(goto) 2>nul & del "%~f0"
