# database.py
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional

class DashboardDB:
    def __init__(self, db_path='dashboard.db', auto_init=True):
        self.db_path = db_path
        self._initialized = False
        
        if auto_init:
            self.init_db()
    
    def init_db(self):
        """Inicjalizacja bazy danych przy pierwszym uruchomieniu"""
        if self._initialized:
            return
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # ALERTY
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT,
            priority INTEGER DEFAULT 1,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # AKTUALNE PRACE
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS works (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority INTEGER DEFAULT 1,
            deadline DATE,
            assigned_to TEXT,
            progress INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # PLANOWANIE
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS planning (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            description TEXT,
            start_date DATE,
            end_date DATE,
            status TEXT DEFAULT 'planned',
            priority INTEGER DEFAULT 1,
            category TEXT,
            estimated_hours INTEGER,
            actual_hours INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # NOTATKI
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            category TEXT DEFAULT 'general',
            tags TEXT,
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # NOWA TABELA: MAGAZYN (WAREHOUSE)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS warehouse (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            quantity INTEGER DEFAULT 0,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # NOWA TABELA: UŻYTKOWNICY (USERS)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
        ''')
        
        # NOWA TABELA: KONFIGURACJA (CONFIG)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Przykładowe dane
        self._seed_example_data(cursor)
        
        conn.commit()
        conn.close()
        self._initialized = True
        print("=== Baza danych zainicjalizowana ===")
    
    def _seed_example_data(self, cursor):
        """Wstaw przykładowe dane przy pierwszym uruchomieniu"""
        # ALERTY
        cursor.execute("SELECT COUNT(*) FROM alerts")
        if cursor.fetchone()[0] == 0:
            alerts = [
                ("System uruchomiony", "Dashboard został uruchomiony pomyślnie", 1),
                ("Brak danych", "Nie znaleziono danych konfiguracyjnych", 2),
                ("Backup", "Zaplanowany backup na dzisiaj 20:00", 1)
            ]
            cursor.executemany(
                "INSERT INTO alerts (title, message, priority) VALUES (?, ?, ?)",
                alerts
            )
        
        # PRACE
        cursor.execute("SELECT COUNT(*) FROM works")
        if cursor.fetchone()[0] == 0:
            works = [
                ("Implementacja API", "Stworzenie endpointów REST", "in_progress", 2, "2024-01-15", "Jan Kowalski", 75),
                ("Testy jednostkowe", "Pokrycie kodu testami", "pending", 1, "2024-01-20", "Anna Nowak", 0),
                ("Dokumentacja", "Przygotowanie dokumentacji API", "completed", 1, "2024-01-10", "Piotr Wiśniewski", 100)
            ]
            cursor.executemany(
                "INSERT INTO works (title, description, status, priority, deadline, assigned_to, progress) VALUES (?, ?, ?, ?, ?, ?, ?)",
                works
            )
        
        # NOTATKI
        cursor.execute("SELECT COUNT(*) FROM notes")
        if cursor.fetchone()[0] == 0:
            notes = [
                ("Spotkanie zespołu", "Omówienie postępów prac nad projektem", "meeting", '["spotkanie", "zespół"]'),
                ("Pomysły na features", "Lista nowych funkcjonalności do implementacji", "ideas", '["feature", "planowanie"]'),
                ("Notatka techniczna", "Informacje o architekturze systemu", "technical", '["tech", "architektura"]')
            ]
            cursor.executemany(
                "INSERT INTO notes (title, content, category, tags) VALUES (?, ?, ?, ?)",
                notes
            )
        
        # MAGAZYN
        cursor.execute("SELECT COUNT(*) FROM warehouse")
        if cursor.fetchone()[0] == 0:
            warehouse_items = [
                ("Rezystor 1kΩ", "MAT/ELE/00123", 150, "Rezystory 1kΩ 0.25W"),
                ("Kondensator 100μF", "MAT/ELE/00234", 75, "Kondensatory elektrolityczne"),
                ("Arduino Uno", "DEV/MCU/00345", 12, "Microcontroller board"),
                ("Czujnik temperatury", "SEN/TMP/00456", 25, "DS18B20 waterproof"),
                ("Przewody połączeniowe", "ACC/CAB/00567", 200, "Przewody męsko-żeńskie 20cm")
            ]
            cursor.executemany(
                "INSERT INTO warehouse (name, code, quantity, note) VALUES (?, ?, ?, ?)",
                warehouse_items
            )
        
        # UŻYTKOWNICY
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            users = [
                ("admin", "admin123", "admin@devicelab.com", 1),
                ("jkowalski", "password123", "j.kowalski@devicelab.com", 1),
                ("anowak", "password123", "a.nowak@devicelab.com", 1)
            ]
            cursor.executemany(
                "INSERT INTO users (username, password, email, active) VALUES (?, ?, ?, ?)",
                users
            )
        
        # KONFIGURACJA (config0 - config20)
        cursor.execute("SELECT COUNT(*) FROM config")
        if cursor.fetchone()[0] == 0:
            config_items = []
            for i in range(21):  # config0 do config20
                config_items.append((f"config{i}", f"value{i}", f"Configuration parameter {i}"))
            
            cursor.executemany(
                "INSERT INTO config (config_key, config_value, description) VALUES (?, ?, ?)",
                config_items
            )
    
    def get_connection(self):
        """Pobierz połączenie z bazą"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ALERTY
    def get_alerts(self, unread_only: bool = False, priority: Optional[int] = None, 
                  limit: Optional[int] = None, order_by: str = "created_at DESC") -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM alerts WHERE 1=1"
        params = []
        
        if unread_only:
            query += " AND is_read = FALSE"
        
        if priority is not None:
            query += " AND priority = ?"
            params.append(priority)
        
        query += f" ORDER BY {order_by}"
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    def mark_alert_read(self, alert_id: int):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE alerts SET is_read = TRUE WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
    
    # PRACE
    def get_works(self, status: Optional[str] = None, priority: Optional[int] = None,
                 assigned_to: Optional[str] = None, overdue_only: bool = False,
                 order_by: str = "created_at DESC") -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM works WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if priority is not None:
            query += " AND priority = ?"
            params.append(priority)
        
        if assigned_to:
            query += " AND assigned_to LIKE ?"
            params.append(f"%{assigned_to}%")
        
        if overdue_only:
            query += " AND deadline < DATE('now') AND status != 'completed'"
        
        query += f" ORDER BY {order_by}"
        
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    # NOTATKI
    def get_notes(self, category: Optional[str] = None, search_text: Optional[str] = None,
                 tags: Optional[List[str]] = None, pinned_only: bool = False,
                 order_by: str = "created_at DESC") -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM notes WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if search_text:
            query += " AND (title LIKE ? OR content LIKE ?)"
            params.extend([f"%{search_text}%", f"%{search_text}%"])
        
        if pinned_only:
            query += " AND is_pinned = TRUE"
        
        query += f" ORDER BY {order_by}"
        
        cursor.execute(query, params)
        results = []
        for row in cursor.fetchall():
            note = dict(row)
            if note['tags']:
                note['tags'] = json.loads(note['tags'])
            results.append(note)
        
        conn.close()
        return results
    
    # PLANOWANIE
    def get_planning(self, status: Optional[str] = None, category: Optional[str] = None,
                    start_date: Optional[str] = None, end_date: Optional[str] = None,
                    order_by: str = "start_date ASC") -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM planning WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if start_date:
            query += " AND start_date >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND end_date <= ?"
            params.append(end_date)
        
        query += f" ORDER BY {order_by}"
        
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    # NOWE METODY: MAGAZYN
    def get_warehouse_items(self, search: Optional[str] = None, 
                           order_by: str = "name ASC") -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM warehouse WHERE 1=1"
        params = []
        
        if search:
            query += " AND (name LIKE ? OR code LIKE ? OR note LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
        query += f" ORDER BY {order_by}"
        
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    def add_warehouse_item(self, name: str, code: str, quantity: int, note: str = "") -> int:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO warehouse (name, code, quantity, note) VALUES (?, ?, ?, ?)",
            (name, code, quantity, note)
        )
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        return item_id
    
    def update_warehouse_quantity(self, item_id: int, new_quantity: int):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE warehouse SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_quantity, item_id)
        )
        conn.commit()
        conn.close()
    
    # NOWE METODY: UŻYTKOWNICY
    def get_users(self, active_only: bool = True) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM users"
        if active_only:
            query += " WHERE active = TRUE"
        
        query += " ORDER BY username ASC"
        
        cursor.execute(query)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()
        conn.close()
        
        return dict(result) if result else None
    
    def create_user(self, username: str, password: str, email: str) -> int:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
            (username, password, email)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id
    
    # NOWE METODY: KONFIGURACJA
    def get_config(self, key: str) -> Optional[str]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT config_value FROM config WHERE config_key = ?", (key,))
        result = cursor.fetchone()
        conn.close()
        
        return result['config_value'] if result else None
    
    def get_all_config(self) -> Dict[str, str]:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT config_key, config_value FROM config")
        results = {row['config_key']: row['config_value'] for row in cursor.fetchall()}
        conn.close()
        
        return results
    
    def set_config(self, key: str, value: str):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT OR REPLACE INTO config (config_key, config_value) VALUES (?, ?)",
            (key, value)
        )
        conn.commit()
        conn.close()

# Globalna instancja bazy
db = DashboardDB()