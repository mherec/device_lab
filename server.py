# server.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from database import DashboardDB
import os

app = Flask(__name__)
CORS(app)

# Inicjalizacja bazy
db = DashboardDB(auto_init=False)

@app.route('/')
def index():
    """Strona główna - serwuje app.html"""
    if os.path.exists('app.html'):
        return send_file('app.html')
    else:
        return """
        <html>
            <head><title>Dashboard System</title></head>
            <body>
                <h1>🚀 Dashboard System</h1>
                <p>Plik app.html nie został znaleziony.</p>
                <p>API jest dostępne pod:</p>
                <ul>
                    <li><a href="/api/alerts">/api/alerts</a></li>
                    <li><a href="/api/works">/api/works</a></li>
                    <li><a href="/api/notes">/api/notes</a></li>
                    <li><a href="/api/warehouse">/api/warehouse</a></li>
                    <li><a href="/api/users">/api/users</a></li>
                    <li><a href="/api/config">/api/config</a></li>
                </ul>
            </body>
        </html>
        """

@app.route('/<path:filename>')
def serve_static(filename):
    """Serwuje pliki statyczne (CSS, JS, images)"""
    if os.path.exists(filename):
        return send_file(filename)
    else:
        return "File not found", 404

# ALERTY
@app.route('/api/alerts')
def get_alerts():
    try:
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        priority = request.args.get('priority', type=int)
        
        alerts = db.get_alerts(
            unread_only=unread_only,
            priority=priority
        )
        
        return jsonify({
            'success': True,
            'data': alerts,
            'total': len(alerts)
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# PRACE
@app.route('/api/works')
def get_works():
    try:
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
            'data': works,
            'total': len(works)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# NOTATKI
@app.route('/api/notes')
def get_notes():
    try:
        category = request.args.get('category')
        search = request.args.get('search')
        pinned_only = request.args.get('pinned_only', 'false').lower() == 'true'
        
        notes = db.get_notes(
            category=category,
            search_text=search,
            pinned_only=pinned_only
        )
        
        return jsonify({
            'success': True,
            'data': notes,
            'total': len(notes)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# PLANOWANIE
@app.route('/api/planning')
def get_planning():
    try:
        planning = db.get_planning()
        return jsonify({
            'success': True,
            'data': planning,
            'total': len(planning)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# NOWE ENDPOINTY: MAGAZYN
@app.route('/api/warehouse')
def get_warehouse():
    try:
        search = request.args.get('search')
        
        items = db.get_warehouse_items(search=search)
        
        return jsonify({
            'success': True,
            'data': items,
            'total': len(items)
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/warehouse', methods=['POST'])
def add_warehouse_item():
    try:
        data = request.json
        
        # Walidacja wymaganych pól
        if not data.get('name') or not data.get('code'):
            return jsonify({'success': False, 'error': 'Name and code are required'}), 400
        
        item_id = db.add_warehouse_item(
            name=data['name'],
            code=data['code'],
            quantity=data.get('quantity', 0),
            note=data.get('note', '')
        )
        
        return jsonify({
            'success': True,
            'message': 'Item added successfully',
            'id': item_id
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/warehouse/<int:item_id>/quantity', methods=['PUT'])
def update_warehouse_quantity(item_id):
    try:
        data = request.json
        
        if 'quantity' not in data:
            return jsonify({'success': False, 'error': 'Quantity is required'}), 400
        
        db.update_warehouse_quantity(item_id, data['quantity'])
        
        return jsonify({
            'success': True,
            'message': 'Quantity updated successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# NOWE ENDPOINTY: UŻYTKOWNICY
@app.route('/api/users')
def get_users():
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        users = db.get_users(active_only=active_only)
        
        # Ukryj hasła dla bezpieczeństwa
        for user in users:
            if 'password' in user:
                del user['password']
        
        return jsonify({
            'success': True,
            'data': users,
            'total': len(users)
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<username>')
def get_user(username):
    try:
        user = db.get_user_by_username(username)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Ukryj hasło
        if 'password' in user:
            del user['password']
        
        return jsonify({
            'success': True,
            'data': user
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.json
        
        # Walidacja
        if not data.get('username') or not data.get('password') or not data.get('email'):
            return jsonify({'success': False, 'error': 'Username, password and email are required'}), 400
        
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
        return jsonify({'success': False, 'error': str(e)}), 500

# NOWE ENDPOINTY: KONFIGURACJA
@app.route('/api/config')
def get_all_config():
    try:
        config = db.get_all_config()
        
        return jsonify({
            'success': True,
            'data': config,
            'total': len(config)
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config/<key>')
def get_config(key):
    try:
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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config/<key>', methods=['PUT'])
def set_config(key):
    try:
        data = request.json
        
        if 'value' not in data:
            return jsonify({'success': False, 'error': 'Value is required'}), 400
        
        db.set_config(key, data['value'])
        
        return jsonify({
            'success': True,
            'message': 'Config updated successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/alerts/<int:alert_id>/read', methods=['POST'])
def mark_alert_as_read(alert_id):
    try:
        # Możesz opcjonalnie pobrać "read" z body, np. 0 lub 1
        data = request.json or {}
        read_value = data.get('read', 1)  # default 1 = przeczytany
        
        if read_value not in (0, 1):
            return jsonify({'success': False, 'error': 'Read value must be 0 or 1'}), 400
        
        # Aktualizacja w bazie
        conn = db.get_connection()
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
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("=== Serwer Dashboard API ===")
    print("Adres: http://localhost:8001")
    print("Strona główna: app.html")
    print("Endpointy API:")
    print("  GET  /api/alerts")
    print("  GET  /api/works") 
    print("  GET  /api/notes")
    print("  GET  /api/planning")
    print("  GET  /api/warehouse")
    print("  POST /api/warehouse")
    print("  PUT  /api/warehouse/{id}/quantity")
    print("  GET  /api/users")
    print("  GET  /api/users/{username}")
    print("  POST /api/users")
    print("  GET  /api/config")
    print("  GET  /api/config/{key}")
    print("  PUT  /api/config/{key}")
    app.run(port=8001, debug=False)