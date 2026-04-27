@echo off
setlocal

set "ROOT=%~dp0.."

echo Starting TIMBS backend and frontend...
start "TIMBS API" cmd /k "cd /d "%ROOT%\backend" && npm run start"
start "TIMBS WEB" cmd /k "cd /d "%ROOT%" && npx serve frontend/public -s -l 3000"

echo.
echo Open http://localhost:3000
echo API health: http://localhost:5000/api/health

endlocal
