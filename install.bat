@echo off
echo ================================
echo 🐍 Instalacja Dashboard System
echo ================================

echo 📦 Sprawdzanie czy Python jest zainstalowany...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python nie jest zainstalowany lub nie jest w PATH
    echo 🔗 Pobierz Python: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python jest zainstalowany

echo 📦 Aktualizacja pip...
python -m pip install --upgrade pip

echo 📦 Instalacja zależności z requirements.txt...
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Błąd podczas instalacji zależności
    pause
    exit /b 1
)

echo ✅ Wszystkie zależności zostały zainstalowane pomyślnie!

echo 🗃️ Inicjalizacja bazy danych...
python init_database.py

echo.
echo ================================
echo 🎉 Instalacja zakończona sukcesem!
echo ================================
echo.
echo 🚀 Aby uruchomić system:
echo   1. Kliknij dwukrotnie start.bat
echo   2. Lub uruchom ręcznie: python server.py
echo.
echo 🌍 Dashboard będzie dostępny pod: http://localhost:8001
echo.

pause