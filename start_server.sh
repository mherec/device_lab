#!/bin/bash
# start_server.sh - uruchamia lokalny serwer i Chromium w trybie app/fullscreen

# katalog projektu
PROJECT_DIR="$(pwd)"

echo "Uruchamianie lokalnego serwera na porcie 8001..."
python3 -m http.server 8001 &   # serwer w tle
SERVER_PID=$!

sleep 2  # chwilowe oczekiwanie na start serwera

echo "Uruchamianie Chromium w trybie app..."
# użyj chromium-browser lub wskaz pełną ścieżkę do chrome w katalogu projektu
# lokalny profil w katalogu projektu, aby ograniczyć komunikaty
chromium-browser \
  --app=http://localhost:8001 \
  --disable-component-update \
  --no-first-run \
  --user-data-dir="$PROJECT_DIR/chrome-profile" \
  --disable-default-apps \
  --start-maximized &

CHROMIUM_PID=$!

echo "Serwer PID=$SERVER_PID, Chromium PID=$CHROMIUM_PID"
echo "Aby zakończyć, użyj: kill $SERVER_PID $CHROMIUM_PID"
