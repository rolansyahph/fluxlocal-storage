@echo off
echo =========================================
echo FluxLocal Storage - Upload Fix Applied
echo =========================================
echo.
echo Starting server with optimized settings:
echo - File size limit: 100GB
echo - Chunk size: 10MB
echo - Max concurrent uploads: 5
echo - Retry attempts: 10
echo - Timeout: 5 minutes per chunk
echo.
echo =========================================
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install

echo.
echo Building client...
call npm run build

echo.
echo Starting server...
call npm run server

pause
