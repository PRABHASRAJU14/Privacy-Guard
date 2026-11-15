"""Security inspection script for PrivacyGuard.
Searches all SQLite database tables, rows, and columns for any sensitive raw values.
"""
import sqlite3
import os

FORBIDDEN_VALUES = [
    "4821 0098 7712",
    "482100987712",
    "rahul@bank",
    "rahul@example.com",
    "john.doe@okicici",
    "9876543210123456",
]

def check_db(db_path: str):
    print(f"=== Inspecting Database: {db_path} ===")
    if not os.path.exists(db_path):
        print(f"File {db_path} does not exist. (Clean)")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall() if not r[0].startswith("sqlite_")]
    print(f"Tables found: {tables}")

    matches = []
    for table in tables:
        cur.execute(f"SELECT * FROM {table}")
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        print(f"  Scanning table '{table}': {len(rows)} rows, columns: {columns}")
        for row in rows:
            for col_name, val in zip(columns, row):
                val_str = str(val)
                for target in FORBIDDEN_VALUES:
                    if target.lower() in val_str.lower():
                        matches.append((table, col_name, target))

    conn.close()

    if matches:
        print(f"CRITICAL PRIVACY FAILURE: Found matches: {matches}")
        raise SystemExit(1)
    else:
        print("SECURITY CHECK PASSED: 0 matches found! ZERO raw PII stored in SQLite.")

if __name__ == "__main__":
    check_db("backend/privacyguard.db")
    if os.path.exists("backend/test_privacyguard.db"):
        check_db("backend/test_privacyguard.db")
