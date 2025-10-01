# database.py
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
import logging

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # ALERTY - USUŃ KOMENTARZE W ŚRODKU ZAPYTANIA
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
            
            # AKTUALNE PRACE - USUŃ KOMENTARZE
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
            
            # PLANOWANIE - POPRAWIONA STRUKTURA
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS planning (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # NOTATKI
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                text TEXT,
                is_alert BOOLEAN DEFAULT FALSE,
                is_planing BOOLEAN DEFAULT FALSE,
                alert_time TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # MAGAZYN
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
            
            # UŻYTKOWNICY
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
            
            # KONFIGURACJA
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
            logger.info("✅ Baza danych zainicjalizowana pomyślnie")
        
        except Exception as e:
            logger.error(f"❌ Błąd inicjalizacji bazy danych: {e}")
            raise
        
    def _seed_example_data(self, cursor):
        """Wstaw przykładowe dane przy pierwszym uruchomieniu"""
        try:
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
            
            # NOTATKI - ZAKTUALIZOWANE DANE
            cursor.execute("SELECT COUNT(*) FROM notes")
            if cursor.fetchone()[0] == 0:
                notes = [
                    ("Spotkanie zespołu", "Omówienie postępów prac nad projektem", False, False, ""),
                    ("Pomysły na features", "Lista nowych funkcjonalności do implementacji", False, False, ""),
                    ("Notatka techniczna", "Informacje o architekturze systemu", False, False, "")
                ]
                cursor.executemany(
                    "INSERT INTO notes (name, text, is_alert, is_planing, alert_time) VALUES (?, ?, ?, ?, ?)",
                    notes
                )
            
            # PLANOWANIE
            cursor.execute("SELECT COUNT(*) FROM planning")
            if cursor.fetchone()[0] == 0:
                planning_items = [
                    ("Spotkanie projektowe", "Omówienie postępów prac"),
                    ("Przegląd kodu", "Code review nowych funkcjonalności"), 
                    ("Testy integracyjne", "Testy całego systemu")
                ]
                cursor.executemany(
                    "INSERT INTO planning (name, text) VALUES (?, ?)",
                    planning_items
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
            
            logger.info("✅ Przykładowe dane załadowane pomyślnie")
            
        except Exception as e:
            logger.error(f"❌ Błąd ładowania przykładowych danych: {e}")
            raise
    
    def get_connection(self):
        """Pobierz połączenie z bazą"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            logger.error(f"❌ Błąd połączenia z bazą: {e}")
            raise
    
    # ALERTY
    def get_alerts(self, unread_only: bool = False, priority: Optional[int] = None, 
                  limit: Optional[int] = None, order_by: str = "created_at DESC") -> List[Dict]:
        """Pobierz alerty z bazy danych"""
        try:
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
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania alertów: {e}")
            return []
    
    def mark_alert_read(self, alert_id: int):
        """Oznacz alert jako przeczytany"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE alerts SET is_read = TRUE WHERE id = ?", (alert_id,))
            conn.commit()
            conn.close()
            logger.info(f"✅ Alert {alert_id} oznaczony jako przeczytany")
        except Exception as e:
            logger.error(f"❌ Błąd oznaczania alertu: {e}")
            raise
    
    # PRACE
    def get_works(self, status: Optional[str] = None, priority: Optional[int] = None,
                 assigned_to: Optional[str] = None, overdue_only: bool = False,
                 order_by: str = "created_at DESC") -> List[Dict]:
        """Pobierz zadania z bazy danych"""
        try:
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
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania zadań: {e}")
            return []
    
    # NOTATKI - ZAKTUALIZOWANE METODY
    def get_notes(self) -> List[Dict]:
        """Pobierz wszystkie notatki z bazy danych"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM notes ORDER BY created_at DESC")
            results = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return results
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania notatek: {e}")
            return []
    
    def add_note(self, name: str, text: str = "", is_alert: bool = False, 
                is_planing: bool = False, alert_time: str = "") -> int:
        """Dodaj nową notatkę do bazy danych"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                """INSERT INTO notes (name, text, is_alert, is_planing, alert_time) 
                VALUES (?, ?, ?, ?, ?)""",
                (name, text, is_alert, is_planing, alert_time)
            )
            conn.commit()
            note_id = cursor.lastrowid
            conn.close()
            
            logger.info(f"✅ Dodano nową notatkę: {name} (ID: {note_id})")
            return note_id
            
        except Exception as e:
            logger.error(f"❌ Błąd dodawania notatki: {e}")
            raise
    
    def update_note(self, note_id: int, name: Optional[str] = None, text: Optional[str] = None,
                   is_alert: Optional[bool] = None, is_planing: Optional[bool] = None,
                   alert_time: Optional[str] = None) -> bool:
        """Aktualizuje notatkę w bazie danych"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Budujemy zapytanie dynamicznie na podstawie podanych parametrów
            update_fields = []
            params = []
            
            if name is not None:
                update_fields.append("name = ?")
                params.append(name)
            if text is not None:
                update_fields.append("text = ?")
                params.append(text)
            if is_alert is not None:
                update_fields.append("is_alert = ?")
                params.append(1 if is_alert else 0)
            if is_planing is not None:
                update_fields.append("is_planing = ?")
                params.append(1 if is_planing else 0)
            if alert_time is not None:
                update_fields.append("alert_time = ?")
                params.append(alert_time)
            
            if not update_fields:
                logger.warning("⚠️ Brak pól do aktualizacji")
                return False
                
            update_fields.append("updated_at = datetime('now')")
            params.append(note_id)
            
            query = f"UPDATE notes SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Zaktualizowano notatkę ID: {note_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Błąd podczas aktualizacji notatki {note_id}: {e}")
            return False
    
    def delete_note(self, note_id: int) -> bool:
        """Usuwa notatkę z bazy danych"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Usunięto notatkę ID: {note_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Błąd usuwania notatki {note_id}: {e}")
            return False
    
    # PLANOWANIE - ZAKTUALIZOWANE METODY
    def get_planing(self) -> List[Dict]:
        """Pobierz elementy planowania z bazy danych"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM planning ORDER BY created_at DESC")
            results = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return results
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania planowania: {e}")
            return []
    
    def add_planing(self, name: str, text: str = "") -> int:
        """Dodaj nowy element planowania"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO planning (name, text) VALUES (?, ?)",
                (name, text)
            )
            conn.commit()
            planing_id = cursor.lastrowid
            conn.close()
            
            logger.info(f"✅ Dodano element planowania: {name} (ID: {planing_id})")
            return planing_id
            
        except Exception as e:
            logger.error(f"❌ Błąd dodawania elementu planowania: {e}")
            raise
    
    def update_planing(self, planing_id: int, name: Optional[str] = None, text: Optional[str] = None) -> bool:
        """Aktualizuje element planowania"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            update_fields = []
            params = []
            
            if name is not None:
                update_fields.append("name = ?")
                params.append(name)
            if text is not None:
                update_fields.append("text = ?")
                params.append(text)
            
            if not update_fields:
                logger.warning("⚠️ Brak pól do aktualizacji")
                return False
                
            update_fields.append("updated_at = datetime('now')")
            params.append(planing_id)
            
            query = f"UPDATE planning SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Zaktualizowano element planowania ID: {planing_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Błąd aktualizacji elementu planowania {planing_id}: {e}")
            return False
    
    def delete_planing(self, planing_id: int) -> bool:
        """Usuwa element planowania"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM planning WHERE id = ?", (planing_id,))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Usunięto element planowania ID: {planing_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Błąd usuwania elementu planowania {planing_id}: {e}")
            return False
    
    # MAGAZYN
    def get_warehouse_items(self, search: Optional[str] = None, 
                           order_by: str = "name ASC") -> List[Dict]:
        """Pobierz elementy magazynu"""
        try:
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
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania elementów magazynu: {e}")
            return []
        
    # W klasie DashboardDB dodaj te metody:

def add_note(self, name: str, text: str = "", is_alert: bool = False, 
            is_planing: bool = False, alert_time: str = "") -> int:
    """Dodaj nową notatkę do bazy danych"""
    try:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """INSERT INTO notes (name, text, is_alert, is_planing, alert_time) 
            VALUES (?, ?, ?, ?, ?)""",
            (name, text, is_alert, is_planing, alert_time)
        )
        conn.commit()
        note_id = cursor.lastrowid
        conn.close()
        
        logger.info(f"✅ Dodano nową notatkę: {name} (ID: {note_id})")
        return note_id
        
    except Exception as e:
        logger.error(f"❌ Błąd dodawania notatki: {e}")
        raise

def update_note(self, note_id: int, name: Optional[str] = None, text: Optional[str] = None,
               is_alert: Optional[bool] = None, is_planing: Optional[bool] = None,
               alert_time: Optional[str] = None) -> bool:
    """Aktualizuje notatkę w bazie danych"""
    try:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Budujemy zapytanie dynamicznie na podstawie podanych parametrów
        update_fields = []
        params = []
        
        if name is not None:
            update_fields.append("name = ?")
            params.append(name)
        if text is not None:
            update_fields.append("text = ?")
            params.append(text)
        if is_alert is not None:
            update_fields.append("is_alert = ?")
            params.append(1 if is_alert else 0)
        if is_planing is not None:
            update_fields.append("is_planing = ?")
            params.append(1 if is_planing else 0)
        if alert_time is not None:
            update_fields.append("alert_time = ?")
            params.append(alert_time)
        
        if not update_fields:
            logger.warning("⚠️ Brak pól do aktualizacji")
            return False
            
        update_fields.append("updated_at = datetime('now')")
        params.append(note_id)
        
        query = f"UPDATE notes SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Zaktualizowano notatkę ID: {note_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Błąd podczas aktualizacji notatki {note_id}: {e}")
        return False

def delete_note(self, note_id: int) -> bool:
    """Usuwa notatkę z bazy danych"""
    try:
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Usunięto notatkę ID: {note_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Błąd usuwania notatki {note_id}: {e}")
        return False
    
    def add_warehouse_item(self, name: str, code: str, quantity: int, note: str = "") -> int:
        """Dodaj nowy element do magazynu"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO warehouse (name, code, quantity, note) VALUES (?, ?, ?, ?)",
                (name, code, quantity, note)
            )
            conn.commit()
            item_id = cursor.lastrowid
            conn.close()
            
            logger.info(f"✅ Dodano element magazynu: {name} (ID: {item_id})")
            return item_id
            
        except Exception as e:
            logger.error(f"❌ Błąd dodawania elementu magazynu: {e}")
            raise
    
    def update_warehouse_quantity(self, item_id: int, new_quantity: int):
        """Aktualizuj ilość elementu w magazynie"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "UPDATE warehouse SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (new_quantity, item_id)
            )
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Zaktualizowano ilość elementu {item_id}: {new_quantity}")
            
        except Exception as e:
            logger.error(f"❌ Błąd aktualizacji ilości elementu {item_id}: {e}")
            raise
    
    # UŻYTKOWNICY
    def get_users(self, active_only: bool = True) -> List[Dict]:
        """Pobierz użytkowników z bazy danych"""
        try:
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
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania użytkowników: {e}")
            return []
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Pobierz użytkownika po nazwie użytkownika"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            result = cursor.fetchone()
            conn.close()
            
            return dict(result) if result else None
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania użytkownika {username}: {e}")
            return None
    
    def create_user(self, username: str, password: str, email: str) -> int:
        """Utwórz nowego użytkownika"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
                (username, password, email)
            )
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            
            logger.info(f"✅ Utworzono użytkownika: {username} (ID: {user_id})")
            return user_id
            
        except Exception as e:
            logger.error(f"❌ Błąd tworzenia użytkownika: {e}")
            raise
    
    # KONFIGURACJA
    def get_config(self, key: str) -> Optional[str]:
        """Pobierz wartość konfiguracji"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT config_value FROM config WHERE config_key = ?", (key,))
            result = cursor.fetchone()
            conn.close()
            
            return result['config_value'] if result else None
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania konfiguracji {key}: {e}")
            return None
    
    def get_all_config(self) -> Dict[str, str]:
        """Pobierz wszystkie konfiguracje"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT config_key, config_value FROM config")
            results = {row['config_key']: row['config_value'] for row in cursor.fetchall()}
            conn.close()
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Błąd pobierania wszystkich konfiguracji: {e}")
            return {}
    
    def set_config(self, key: str, value: str):
        """Ustaw wartość konfiguracji"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "INSERT OR REPLACE INTO config (config_key, config_value) VALUES (?, ?)",
                (key, value)
            )
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Ustawiono konfigurację {key} = {value}")
            
        except Exception as e:
            logger.error(f"❌ Błąd ustawiania konfiguracji {key}: {e}")
            raise

# Globalna instancja bazy
try:
    db = DashboardDB()
    logger.info("✅ Globalna instancja bazy danych utworzona pomyślnie")
except Exception as e:
    logger.error(f"❌ Błąd tworzenia globalnej instancji bazy: {e}")
    db = None