@echo off
echo Uruchamianie serwera w tle na porcie 8001...
start /B python -m http.server 8001

timeout /t 2 >nul

echo Uruchamianie Chromium w trybie app...
:: Zakładam, że chrome-win jest w tym samym katalogu co skrypt
start "" "%~dp0chrome-win\chrome.exe" --app=http://localhost:8001 --disable-component-update --no-first-run --user-data-dir="%~dp0chrome-profile" --disable-default-apps --start-maximized
