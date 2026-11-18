"""
PrivacyGuard Relational Database Service & SQL JOIN Queries (PostgreSQL / SQLite).

Demonstrates:
1. Relational schema design with Primary Keys (PK) and Foreign Keys (FK).
2. INNER JOIN (Retrieving documents that have corresponding scans).
3. LEFT OUTER JOIN (Retrieving all users including those with 0 uploads).
4. Multi-Table JOIN with GROUP BY and aggregate functions (COUNT, AVG, MAX).
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "relational_demo.db")


def init_relational_db(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Initialize relational schema with PK/FK constraints enabled."""
    conn = sqlite3.connect(db_path or DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        department TEXT DEFAULT 'General',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        risk_score INTEGER NOT NULL DEFAULT 0,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        detected_count INTEGER NOT NULL DEFAULT 0,
        scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_events_relational (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id INTEGER NOT NULL,
        action_taken TEXT NOT NULL,
        pii_type TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    );
    """)

    # Populate baseline demo data if empty
    cursor.execute("SELECT COUNT(*) AS cnt FROM users;")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("INSERT INTO users (name, email, department) VALUES ('Prabhas Raju', 'prabhas@privacyguard.local', 'Engineering');")
        cursor.execute("INSERT INTO users (name, email, department) VALUES ('Ananya Sharma', 'ananya@privacyguard.local', 'Finance');")
        cursor.execute("INSERT INTO users (name, email, department) VALUES ('Karthik V', 'karthik@privacyguard.local', 'Legal');")

        cursor.execute("INSERT INTO documents (user_id, filename, file_hash) VALUES (1, 'expense_receipt.pdf', 'hash_01a');")
        cursor.execute("INSERT INTO documents (user_id, filename, file_hash) VALUES (1, 'medical_report.png', 'hash_02b');")
        cursor.execute("INSERT INTO documents (user_id, filename, file_hash) VALUES (2, 'salary_slip.pdf', 'hash_03c');")

        cursor.execute("INSERT INTO scans (document_id, risk_score, risk_level, detected_count) VALUES (1, 35, 'LOW', 2);")
        cursor.execute("INSERT INTO scans (document_id, risk_score, risk_level, detected_count) VALUES (2, 85, 'HIGH', 5);")
        cursor.execute("INSERT INTO scans (document_id, risk_score, risk_level, detected_count) VALUES (3, 60, 'MEDIUM', 3);")

        cursor.execute("INSERT INTO audit_events_relational (scan_id, action_taken, pii_type) VALUES (1, 'REDACT', 'BANK_ACCOUNT');")
        cursor.execute("INSERT INTO audit_events_relational (scan_id, action_taken, pii_type) VALUES (2, 'REDACT', 'AADHAAR');")
        cursor.execute("INSERT INTO audit_events_relational (scan_id, action_taken, pii_type) VALUES (2, 'REDACT', 'PHONE');")
        cursor.execute("INSERT INTO audit_events_relational (scan_id, action_taken, pii_type) VALUES (3, 'REDACT', 'PAN');")
        conn.commit()

    return conn


def execute_inner_join(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    SQL INNER JOIN:
    Fetches documents that have a corresponding scan record.
    Filters out any orphaned documents without scans.
    """
    conn = init_relational_db(db_path)
    try:
        cursor = conn.cursor()
        sql = """
        SELECT 
            d.id AS document_id,
            d.filename,
            d.file_hash,
            s.id AS scan_id,
            s.risk_score,
            s.risk_level,
            s.detected_count,
            s.scanned_at
        FROM documents d
        INNER JOIN scans s 
            ON d.id = s.document_id
        ORDER BY s.risk_score DESC;
        """
        cursor.execute(sql)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def execute_left_join(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    SQL LEFT OUTER JOIN:
    Returns ALL users, joined with their uploaded documents.
    If a user has 0 uploaded documents (like user 'Karthik V'),
    the document fields will be NULL rather than dropping the user record.
    """
    conn = init_relational_db(db_path)
    try:
        cursor = conn.cursor()
        sql = """
        SELECT 
            u.id AS user_id,
            u.name,
            u.email,
            u.department,
            COUNT(d.id) AS total_documents_uploaded,
            COALESCE(MAX(d.uploaded_at), 'None') AS last_upload_timestamp
        FROM users u
        LEFT JOIN documents d 
            ON u.id = d.user_id
        GROUP BY u.id, u.name, u.email, u.department
        ORDER BY total_documents_uploaded DESC;
        """
        cursor.execute(sql)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def execute_multi_table_audit_join(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    SQL Multi-Table JOIN:
    Traverses the full entity relationship:
    users (PK) -> documents (FK) -> scans (FK) -> audit_events (FK).
    Produces an end-to-end provenance audit record.
    """
    conn = init_relational_db(db_path)
    try:
        cursor = conn.cursor()
        sql = """
        SELECT 
            u.name AS owner_name,
            u.department,
            d.filename,
            s.risk_level,
            s.risk_score,
            a.action_taken,
            a.pii_type,
            a.timestamp AS audited_at
        FROM users u
        INNER JOIN documents d 
            ON u.id = d.user_id
        INNER JOIN scans s 
            ON d.id = s.document_id
        INNER JOIN audit_events_relational a 
            ON s.id = a.scan_id
        ORDER BY a.timestamp DESC;
        """
        cursor.execute(sql)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


if __name__ == "__main__":
    print("--- INNER JOIN ---")
    print(execute_inner_join())
    print("\n--- LEFT JOIN ---")
    print(execute_left_join())
    print("\n--- MULTI-TABLE JOIN ---")
    print(execute_multi_table_audit_join())
