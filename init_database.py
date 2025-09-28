# init_database.py
from database import DashboardDB

def initialize_database():
    print("=== Inicjalizacja bazy danych ===")
    try:
        db = DashboardDB(auto_init=False)
        db.init_db()
        
        alerts = db.get_alerts()
        works = db.get_works()
        notes = db.get_notes()
        
        print("Przykladowe dane zaladowane:")
        print(f"   Alerty: {len(alerts)}")
        print(f"   Prace: {len(works)}")
        print(f"   Notatki: {len(notes)}")
        print("=== Baza danych gotowa ===")
        
    except Exception as e:
        print(f"BLAD podczas inicjalizacji bazy: {e}")
        return False
    
    return True

if __name__ == '__main__':
    initialize_database()