@echo off
chcp 65001 >nul
title Dashboard System

echo =================================
echo    Uruchamianie Dashboard System
echo =================================

echo Sprawdzanie zaleznosci...
python -c "import flask, sqlite3" >nul 2>&1
if errorlevel 1 (
    echo BLAD: Brak wymaganych bibliotek
    pause
    exit /b 1
)

echo OK: Wszystkie zaleznosci sa dostepne

echo Sprawdzanie bazy danych...
if not exist "dashboard.db" (
    echo Inicjalizacja bazy danych...
    python init_database.py
) else (
    echo OK: Baza danych istnieje
)

echo Uruchamianie serwera...
echo Serwer: http://localhost:8001
echo.

timeout /t 1 >nul

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
   --app=http://localhost:8001 ^
   --disable-features=ThirdPartyStoragePartitioning ^ 
   --user-data-dir="%TEMP%\dashboard_app"

echo System gotowy!
python server.py

echo.
echo Serwer zatrzymany
pause