# server.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from database import DashboardDB
import os
import glob
import logging
from typing import Dict, Any, Optional

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Inicjalizacja bazy danych
try:
    db = DashboardDB(auto_init=False)
    logger.info("✅ Baza danych zainicjalizowana pomyślnie")
except Exception as e:
    logger.error(f"❌ Błąd inicjalizacji bazy danych: {e}")
    db = None

# Stała katalogu FILES
FILES_DIRECTORY = "FILES"

def safe_path_check(path: str, base_directory: str) -> bool:
    """Bezpieczne sprawdzenie ścieżki przed path traversal"""
    try:
        full_path = os.path.abspath(path)
        base_path = os.path.abspath(base_directory)
        return full_path.startswith(base_path)
    except Exception:
        return False

def get_db_connection():
    """Bezpieczne pobranie połączenia z bazą danych"""
    if db is None:
        raise Exception("Baza danych nie jest dostępna")
    return db.get_connection()

@app.route('/')
def index():
    """Strona główna - serwuje app.html"""
    try:
        if os.path.exists('app.html'):
            return send_file('app.html')
        else:
            return """
            <html>
                <head>
                    <title>Dashboard System</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        h1 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 10px; }
                        ul { list-style: none; padding: 0; }
                        li { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
                        a { color: #007cba; text-decoration: none; font-weight: bold; }
                        a:hover { text-decoration: underline; }
                        .error { color: #dc3545; background: #f8d7da; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🚀 Dashboard System</h1>
                        <p class="error">Plik app.html nie został znaleziony.</p>
                        <p>API jest dostępne pod:</p>
                        <ul>
                            <li><a href="/api/alerts">/api/alerts</a> - Zarządzanie alertami</li>
                            <li><a href="/api/works">/api/works</a> - Zarządzanie zadaniami</li>
                            <li><a href="/api/notes">/api/notes</a> - Notatki</li>
                            <li><a href="/api/warehouse">/api/warehouse</a> - Magazyn</li>
                            <li><a href="/api/users">/api/users</a> - Użytkownicy</li>
                            <li><a href="/api/config">/api/config</a> - Konfiguracja</li>
                            <li><a href="/api/planing">/api/planing</a> - Planowanie</li>
                            <li><a href="/api/files">/api/files</a> - Pliki</li>
                        </ul>
                    </div>
                </body>
            </html>
            """, 404
    except Exception as e:
        logger.error(f"Błąd strony głównej: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    """Serwuje pliki statyczne (CSS, JS, images) z zabezpieczeniami"""
    try:
        # Podstawowe zabezpieczenie przed path traversal
        if '..' in filename or filename.startswith('/'):
            return "Access denied", 403
        
        if os.path.exists(filename) and os.path.isfile(filename):
            return send_file(filename)
        else:
            return "File not found", 404
    except Exception as e:
        logger.error(f"Błąd serwowania pliku {filename}: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# PLIKI - NOWY ENDPOINT
@app.route('/api/files')
def get_files():
    try:
        # Pobranie parametrów z URL
        file_types = request.args.get('type', '')
        subdirectory = request.args.get('dir', '')
        
        # Budowanie ścieżki do katalogu
        base_path = FILES_DIRECTORY
        if subdirectory:
            # Zabezpieczenie przed path traversal
            safe_subdir = subdirectory.replace('..', '').replace('//', '/').strip('/')
            if safe_subdir:
                base_path = os.path.join(FILES_DIRECTORY, safe_subdir)
        
        # Sprawdzenie czy katalog istnieje i jest bezpieczny
        if not os.path.exists(base_path) or not safe_path_check(base_path, FILES_DIRECTORY):
            return jsonify({
                'success': False,
                'error': 'Directory not found or access denied',
                'data': [],
                'directories': [],
                'total_files': 0,
                'total_dirs': 0
            }), 404
        
        # Lista do przechowywania wyników
        files_list = []
        directories_list = []
        
        # Pobranie listy rozszerzeń do filtrowania
        extensions = []
        if file_types:
            extensions = [ext.strip().lower() for ext in file_types.split(',') if ext.strip()]
            extensions = [ext if ext.startswith('.') else f'.{ext}' for ext in extensions]
        
        # Odczyt katalogu
        try:
            with os.scandir(base_path) as entries:
                for entry in entries:
                    try:
                        if entry.is_dir():
                            directories_list.append({
                                'name': entry.name,
                                'path': entry.path,
                                'type': 'directory',
                                'size': None
                            })
                        elif entry.is_file():
                            file_ext = os.path.splitext(entry.name)[1].lower()
                            
                            # Filtrowanie po rozszerzeniach
                            if extensions and file_ext not in extensions:
                                continue
                            
                            stat_info = entry.stat()
                            files_list.append({
                                'name': entry.name,
                                'path': entry.path,
                                'type': 'file',
                                'extension': file_ext,
                                'size': stat_info.st_size,
                                'modified': stat_info.st_mtime
                            })
                    except (OSError, PermissionError):
                        continue  # Pomijanie problematycznych plików/katalogów
        except (OSError, PermissionError) as e:
            return jsonify({
                'success': False,
                'error': f'Cannot access directory: {str(e)}'
            }), 403
        
        # Sortowanie wyników
        directories_list.sort(key=lambda x: x['name'].lower())
        files_list.sort(key=lambda x: x['name'].lower())
        
        return jsonify({
            'success': True,
            'data': {
                'files': files_list,
                'directories': directories_list,
                'current_directory': base_path,
                'parent_directory': os.path.dirname(base_path) if base_path != FILES_DIRECTORY else None
            },
            'total_files': len(files_list),
            'total_dirs': len(directories_list),
            'filters': {
                'file_types': file_types,
                'extensions': extensions
            }
        })
    
    except Exception as e:
        logger.error(f"Error in get_files: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# ALERTY
@app.route('/api/alerts')
def get_alerts():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        priority = request.args.get('priority', type=int)
        
        alerts = db.get_alerts(
            unread_only=unread_only,
            priority=priority
        )
        
        return jsonify({
            'success': True,
            'data': alerts or [],
            'total': len(alerts) if alerts else 0
        })
    
    except Exception as e:
        logger.error(f"Error in get_alerts: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# PRACE
@app.route('/api/works')
def get_works():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        status = request.args.get('status')
        priority = request.args.get('priority', type=int)
        overdue_only = request.args.get('overdue_only', 'false').lower() == 'true'
        
        works = db.get_works(
            status=status,
            priority=priority,
            overdue_only=overdue_only
        )
        
        return jsonify({
            'success': True,
            'data': works or [],
            'total': len(works) if works else 0
        })
    except Exception as e:
        logger.error(f"Error in get_works: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# NOTATKI - ROZBUDOWANE
@app.route('/api/notes')
def get_notes():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        notes = db.get_notes()
        return jsonify({
            'success': True,
            'data': notes or [],
            'total': len(notes) if notes else 0
        })
    except Exception as e:
        logger.error(f"Error in get_notes: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/notes', methods=['POST'])
def add_note():
    try:
        if db is None:
            logger.error("❌ Baza danych nie jest dostępna")
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        logger.info(f"📝 POST /api/notes - Otrzymane dane: {data}")
        
        # Walidacja wymaganych pól
        if not data.get('name'):
            logger.error("❌ Brak wymaganego pola 'name'")
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        # Walidacja długości
        if len(data['name']) > 255:
            logger.error("❌ Nazwa zbyt długa")
            return jsonify({'success': False, 'error': 'Name too long (max 255 characters)'}), 400
        
        logger.info(f"📝 Wywołanie db.add_note z parametrami: name={data['name']}, text={data.get('text', '')}")
        
        note_id = db.add_note(
            name=data['name'],
            text=data.get('text', ''),
            is_alert=data.get('is_alert', False),
            is_planing=data.get('is_planing', False),
            alert_time=data.get('alert_time', '')
        )
        
        logger.info(f"✅ Notatka dodana pomyślnie, ID: {note_id}")
        
        return jsonify({
            'success': True,
            'message': 'Note added successfully',
            'id': note_id
        })
    
    except Exception as e:
        logger.error(f"❌ Błąd w add_note: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        logger.info(f"📝 PUT /api/notes/{note_id} - Otrzymane dane: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Sprawdź czy notatka istnieje przed aktualizacją
        notes = db.get_notes()
        note_exists = any(note.get('id') == note_id for note in (notes or []))
        if not note_exists:
            logger.error(f"❌ Notatka {note_id} nie istnieje")
            return jsonify({'success': False, 'error': 'Note not found'}), 404
        
        logger.info(f"📝 Wywołanie db.update_note dla ID: {note_id}")
        
        # Użyj metody update_note jeśli istnieje, w przeciwnym razie fallback SQL
        if hasattr(db, 'update_note'):
            success = db.update_note(
                note_id=note_id,
                name=data.get('name'),
                text=data.get('text'),
                is_alert=data.get('is_alert'),
                is_planing=data.get('is_planing'),
                alert_time=data.get('alert_time')
            )
            if not success:
                logger.error(f"❌ db.update_note zwróciło False dla ID: {note_id}")
                return jsonify({'success': False, 'error': 'Failed to update note'}), 500
        else:
            # Fallback: bezpośrednie SQL
            logger.info("🔄 Używam fallback SQL dla update_note")
            conn = get_db_connection()
            cursor = conn.cursor()
            
            update_fields = []
            params = []
            
            if 'name' in data:
                update_fields.append("name = ?")
                params.append(data['name'])
            if 'text' in data:
                update_fields.append("text = ?")
                params.append(data['text'])
            if 'is_alert' in data:
                update_fields.append("is_alert = ?")
                params.append(1 if data['is_alert'] else 0)
            if 'is_planing' in data:
                update_fields.append("is_planing = ?")
                params.append(1 if data['is_planing'] else 0)
            if 'alert_time' in data:
                update_fields.append("alert_time = ?")
                params.append(data['alert_time'])
            
            if not update_fields:
                return jsonify({'success': False, 'error': 'No fields to update'}), 400
                
            update_fields.append("updated_at = datetime('now')")
            params.append(note_id)
            
            query = f"UPDATE notes SET {', '.join(update_fields)} WHERE id = ?"
            logger.info(f"🔄 Wykonuję zapytanie: {query} z parametrami: {params}")
            cursor.execute(query, params)
            conn.commit()
            conn.close()
        
        logger.info(f"✅ Notatka {note_id} zaktualizowana pomyślnie")
        
        return jsonify({
            'success': True,
            'message': 'Note updated successfully'
        })
    
    except Exception as e:
        logger.error(f"❌ Błąd w update_note: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Internal server error: {str(e)}'}), 500
    
@app.route('/api/debug/db-structure')
def debug_db_structure():
    """Endpoint do debugowania struktury bazy danych"""
    try:
        conn = sqlite3.connect('dashboard.db')
        cursor = conn.cursor()
        
        # Pobierz wszystkie tabele
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        structure = {}
        for table in tables:
            table_name = table[0]
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            structure[table_name] = columns
        
        conn.close()
        
        return jsonify({
            'success': True,
            'tables': structure
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/test-note', methods=['POST'])
def test_note():
    """Testowy endpoint do sprawdzenia zapisu notatki"""
    try:
        conn = sqlite3.connect('dashboard.db')
        cursor = conn.cursor()
        
        # Spróbuj bezpośrednio wstawić notatkę
        cursor.execute(
            "INSERT INTO notes (name, text) VALUES (?, ?)",
            ("Testowa notatka", "To jest test")
        )
        conn.commit()
        note_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'success': True, 'id': note_id})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        success = db.delete_note(note_id)
        if not success:
            return jsonify({'success': False, 'error': 'Note not found or could not be deleted'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Note deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"Error in delete_note: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# PLANOWANIE - ROZBUDOWANE
@app.route('/api/planing')
def get_planing():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        planing = db.get_planing()
        return jsonify({
            'success': True,
            'data': planing or [],
            'total': len(planing) if planing else 0
        })
    except Exception as e:
        logger.error(f"Error in get_planing: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/planing', methods=['POST'])
def add_planing():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        planing_id = db.add_planing(
            name=data['name'],
            text=data.get('text', '')
        )
        
        return jsonify({
            'success': True,
            'message': 'Planning item added successfully',
            'id': planing_id
        })
    
    except Exception as e:
        logger.error(f"Error in add_planing: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/planing/<int:planing_id>', methods=['PUT'])
def update_planing(planing_id):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        success = db.update_planing(
            planing_id=planing_id,
            name=data.get('name'),
            text=data.get('text')
        )
        
        if not success:
            return jsonify({'success': False, 'error': 'Planning item not found or could not be updated'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Planning item updated successfully'
        })
    
    except Exception as e:
        logger.error(f"Error in update_planing: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/planing/<int:planing_id>', methods=['DELETE'])
def delete_planing(planing_id):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        success = db.delete_planing(planing_id)
        if not success:
            return jsonify({'success': False, 'error': 'Planning item not found or could not be deleted'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Planning item deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"Error in delete_planing: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# NOWE ENDPOINTY: MAGAZYN
@app.route('/api/warehouse')
def get_warehouse():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        search = request.args.get('search')
        
        items = db.get_warehouse_items(search=search)
        
        return jsonify({
            'success': True,
            'data': items or [],
            'total': len(items) if items else 0
        })
    
    except Exception as e:
        logger.error(f"Error in get_warehouse: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@app.route('/api/warehouse', methods=['POST'])
def add_warehouse_item():
    """Dodaj nowy element do magazynu"""
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        logger.info(f"📦 POST /api/warehouse - Otrzymane dane: {data}")
        
        # Walidacja wymaganych pól
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        if not data.get('code'):
            return jsonify({'success': False, 'error': 'Code is required'}), 400
        
        # Sprawdź czy kod już istnieje
        existing_items = db.get_warehouse_items()
        if existing_items:
            code_exists = any(item.get('code') == data['code'] for item in existing_items)
            if code_exists:
                return jsonify({'success': False, 'error': 'Item with this code already exists'}), 400
        
        # Dodaj do bazy
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO warehouse (name, code, quantity, note) VALUES (?, ?, ?, ?)",
            (
                data['name'],
                data['code'],
                int(data.get('quantity', 0)),
                data.get('note', '')
            )
        )
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()
        
        logger.info(f"✅ Dodano nowy element magazynu ID: {item_id}")
        
        return jsonify({
            'success': True,
            'message': 'Item added successfully',
            'id': item_id
        })
    
    except Exception as e:
        logger.error(f"❌ Błąd w add_warehouse_item: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/warehouse/<int:item_id>/quantity', methods=['PUT'])
def update_warehouse_quantity(item_id):
    """Aktualizuj ilość elementu w magazynie"""
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        logger.info(f"🔄 PUT /api/warehouse/{item_id}/quantity - Dane: {data}")
        
        if 'quantity' not in data:
            return jsonify({'success': False, 'error': 'Quantity is required'}), 400
        
        # Walidacja ilości
        try:
            quantity = int(data['quantity'])
            if quantity < 0:
                return jsonify({'success': False, 'error': 'Quantity cannot be negative'}), 400
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Quantity must be a number'}), 400
        
        # Sprawdź czy element istnieje
        items = db.get_warehouse_items()
        item_exists = any(item.get('id') == item_id for item in (items or []))
        if not item_exists:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        # Aktualizuj w bazie
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE warehouse SET quantity = ?, updated_at = datetime('now') WHERE id = ?",
            (quantity, item_id)
        )
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Zaktualizowano ilość elementu {item_id}: {quantity}")
        
        return jsonify({
            'success': True,
            'message': 'Quantity updated successfully'
        })
    
    except Exception as e:
        logger.error(f"❌ Błąd w update_warehouse_quantity: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/warehouse/<int:item_id>', methods=['DELETE'])
def delete_warehouse_item(item_id):
    """Usuń element z magazynu"""
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        logger.info(f"🗑️ DELETE /api/warehouse/{item_id}")
        
        # Sprawdź czy element istnieje
        items = db.get_warehouse_items()
        item_exists = any(item.get('id') == item_id for item in (items or []))
        if not item_exists:
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        # Usuń z bazy
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM warehouse WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Usunięto element magazynu ID: {item_id}")
        
        return jsonify({
            'success': True,
            'message': 'Item deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"❌ Błąd w delete_warehouse_item: {str(e)}")
        return jsonify({'success': False, 'error': f'Internal server error: {str(e)}'}), 500

# NOWE ENDPOINTY: UŻYTKOWNICY
@app.route('/api/users')
def get_users():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        users = db.get_users(active_only=active_only)
        
        # Ukryj hasła dla bezpieczeństwa
        safe_users = []
        for user in (users or []):
            safe_user = user.copy()
            safe_user.pop('password', None)
            safe_users.append(safe_user)
        
        return jsonify({
            'success': True,
            'data': safe_users,
            'total': len(safe_users)
        })
    
    except Exception as e:
        logger.error(f"Error in get_users: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/users/<username>')
def get_user(username):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        user = db.get_user_by_username(username)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Ukryj hasło
        safe_user = user.copy()
        safe_user.pop('password', None)
        
        return jsonify({
            'success': True,
            'data': safe_user
        })
    
    except Exception as e:
        logger.error(f"Error in get_user: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        
        if not data.get('username') or not data.get('password') or not data.get('email'):
            return jsonify({'success': False, 'error': 'Username, password and email are required'}), 400
        
        # Podstawowa walidacja
        if len(data['username']) < 3:
            return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
        if len(data['password']) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
        user_id = db.create_user(
            username=data['username'],
            password=data['password'],  # W produkcji powinno być hashowane!
            email=data['email']
        )
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'id': user_id
        })
    
    except Exception as e:
        logger.error(f"Error in create_user: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# NOWE ENDPOINTY: KONFIGURACJA
@app.route('/api/config')
def get_all_config():
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        config = db.get_all_config()
        
        return jsonify({
            'success': True,
            'data': config or [],
            'total': len(config) if config else 0
        })
    
    except Exception as e:
        logger.error(f"Error in get_all_config: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/config/<key>')
def get_config(key):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        value = db.get_config(key)
        
        if value is None:
            return jsonify({'success': False, 'error': 'Config key not found'}), 404
        
        return jsonify({
            'success': True,
            'data': {
                'key': key,
                'value': value
            }
        })
    
    except Exception as e:
        logger.error(f"Error in get_config: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/config/<key>', methods=['PUT'])
def set_config(key):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        
        if 'value' not in data:
            return jsonify({'success': False, 'error': 'Value is required'}), 400
        
        db.set_config(key, data['value'])
        
        return jsonify({
            'success': True,
            'message': 'Config updated successfully'
        })
    
    except Exception as e:
        logger.error(f"Error in set_config: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
    
@app.route('/api/file-content')
def serve_file_content():
    """Serwuje zawartość pliku (dla galerii zdjęć)"""
    try:
        file_path = request.args.get('path')
        thumbnail = request.args.get('thumbnail', 'false').lower() == 'true'
        
        if not file_path:
            return "Path parameter is required", 400
        
        # Zabezpieczenie przed path traversal
        safe_path = os.path.normpath(file_path)
        if not safe_path_check(safe_path, FILES_DIRECTORY):
            return "Access denied", 403
        
        if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
            return "File not found", 404
        
        # Sprawdź rozszerzenie pliku
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.pdf', '.txt'}
        file_ext = os.path.splitext(safe_path)[1].lower()
        if file_ext not in allowed_extensions:
            return "File type not allowed", 403
        
        return send_file(safe_path)
    
    except Exception as e:
        logger.error(f"Error in serve_file_content: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
    
@app.route('/api/alerts/<int:alert_id>/read', methods=['POST'])
def mark_alert_as_read(alert_id):
    try:
        if db is None:
            return jsonify({'success': False, 'error': 'Database not available'}), 503
            
        data = request.get_json(silent=True) or {}
        read_value = data.get('read', 1)
        
        if read_value not in (0, 1):
            return jsonify({'success': False, 'error': 'Read value must be 0 or 1'}), 400
        
        # Aktualizacja w bazie
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE alerts SET is_read = ? WHERE id = ?",
            (bool(read_value), alert_id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'id': alert_id,
            'is_read': read_value
        })
    
    except Exception as e:
        logger.error(f"Error in mark_alert_as_read: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# Endpoint diagnostyczny
@app.route('/api/health')
def health_check():
    """Endpoint do sprawdzania statusu API"""
    db_status = "available" if db is not None else "unavailable"
    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'timestamp': datetime.now().isoformat()
    })

# Obsługa błędów 404
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

# Obsługa błędów 500
@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("=== Serwer Dashboard API ===")
    print("Adres: http://localhost:8001") 
    print("Status bazy danych:", "✅ Dostępna" if db is not None else "❌ Niedostępna")
    print("\nEndpointy API:")
    print("  GET    /api/alerts")
    print("  GET    /api/works") 
    print("  GET    /api/notes")
    print("  POST   /api/notes")
    print("  PUT    /api/notes/{id}")
    print("  DELETE /api/notes/{id}")
    print("  GET    /api/planing")
    print("  POST   /api/planing")
    print("  PUT    /api/planing/{id}")
    print("  DELETE /api/planing/{id}")
    print("  GET    /api/warehouse")
    print("  POST   /api/warehouse")
    print("  PUT    /api/warehouse/{id}/quantity")
    print("  GET    /api/users")
    print("  GET    /api/users/{username}")
    print("  POST   /api/users")
    print("  GET    /api/config")
    print("  GET    /api/config/{key}")
    print("  PUT    /api/config/{key}")
    print("  GET    /api/files")
    print("  GET    /api/health")
    print("\n🚀 Serwer uruchomiony pomyślnie!")
    
    app.run(port=8001, debug=False)