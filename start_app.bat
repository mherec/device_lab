@echo off
echo Uruchamianie serwera Livereload na porcie 8001...
start /B python server.py

timeout /t 2 >nul

echo Uruchamianie Chromium w trybie app...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
   --app=http://localhost:8001 ^
   --user-data-dir="%USERPROFILE_DIR%" ^
   --disable-component-update ^
   --no-first-run ^
   --disable-default-apps ^
   --disable-cache ^
   --start-maximized
