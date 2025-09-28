# Copilot Instructions for DEVICE_LAB

## Architektura projektu

- Główne pliki backendu to `server.py`, `database.py`, `init_database.py`.
- Frontend znajduje się w katalogu `data/app/` (podkatalogi: `database`, `devices`, `home`, `storage`).
- Pliki HTML i JS dla poszczególnych sekcji aplikacji są rozdzielone według funkcjonalności.
- Pliki CSS są w `data/css/`, z podziałem na główny styl (`stylesheet.css`) i style zewnętrzne (`tailwindcss/`, `tabulator/`).

## Przepływ danych

- Backend obsługuje bazę danych SQLite (`dashboard.db`).
- Komunikacja między frontendem a backendem odbywa się przez serwer (`server.py`).
- Frontend ładuje dane dynamicznie z backendu, korzystając z plików JS w odpowiednich podkatalogach.

## Kluczowe workflow

- Uruchamianie aplikacji: użyj `start_app.bat` (Windows) lub bezpośrednio `server.py`.
- Inicjalizacja bazy danych: uruchom `init_database.py`.
- Instalacja zależności: `install.bat` lub `pip install -r requirements.txt`.

## Konwencje projektowe

- Każda sekcja aplikacji (np. `devices`, `database`, `home`) ma własne pliki `app.html` i `app.js`.
- Pliki JS są podzielone na logikę inicjalizacji (`js_init.js`), logikę końcową (`js_end.js`) i rdzeń (`core.js`).
- Zasoby multimedialne są w `data/media/images/`.
- Języki interfejsu w `data/js/languages/` (np. `polski.json`).

## Wzorce i integracje

- Frontend korzysta z Tabulator.js (`data/js/tabulator/`) do tabel i TailwindCSS do stylów.
- Backend nie używa frameworków webowych, komunikacja odbywa się przez prosty serwer Python.
- Baza danych SQLite jest inicjowana i obsługiwana przez dedykowane skrypty.

## Przykłady

- Dodając nową sekcję, utwórz podkatalog w `data/app/`, dodaj `app.html` i `app.js`.
- Nowe style dodawaj do `data/css/stylesheet.css` lub jako osobny plik w `tailwindcss/`.
- Nowe endpointy backendu dodawaj w `server.py` zgodnie z istniejącą strukturą.

## Debugowanie

- Sprawdź logi serwera w konsoli po uruchomieniu `server.py`.
- W przypadku problemów z bazą danych, usuń `dashboard.db` i zainicjuj ponownie przez `init_database.py`.

## Zależności

- Wszystkie zależności Python są w `requirements.txt`.
- Zewnętrzne biblioteki JS/CSS są w `data/js/` i `data/css/`.

---

Dostosuj powyższe instrukcje, jeśli pojawią się nowe pliki lub zmiany w architekturze. Zgłaszaj nietypowe wzorce lub workflow do aktualizacji tego dokumentu.
