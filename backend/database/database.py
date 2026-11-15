"""SQLite database connection and initialization for PrivacyGuard."""
import os
import sqlite3
import logging
from contextlib import contextmanager
from typing import Generator, Set

logger = logging.getLogger("privacyguard.database")

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "privacyguard.db"
)

_initialized_paths: Set[str] = set()


def get_db_path() -> str:
    """Get the active SQLite database path, supporting environment override."""
    return os.getenv("PRIVACYGUARD_DB_PATH", DEFAULT_DB_PATH)


def _open_raw_connection(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str = None) -> None:
    """Initialize database tables and indexes automatically on startup."""
    target_path = db_path or get_db_path()
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)

    conn = _open_raw_connection(target_path)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.execute("PRAGMA busy_timeout=5000;")
        cursor = conn.cursor()

        # 1. Scan History Table (Contains ONLY safe operational metadata)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                input_type TEXT NOT NULL,
                filename_hash TEXT,
                purpose TEXT,
                risk_before INTEGER NOT NULL DEFAULT 0,
                risk_after INTEGER NOT NULL DEFAULT 0,
                detected_count INTEGER NOT NULL DEFAULT 0,
                protected_count INTEGER NOT NULL DEFAULT 0,
                kept_count INTEGER NOT NULL DEFAULT 0,
                protection_percentage REAL NOT NULL DEFAULT 0.0,
                safe_to_share INTEGER NOT NULL DEFAULT 1,
                output_file_type TEXT,
                protection_receipt_hash TEXT
            )
            """
        )

        # 2. Audit Events Table (Timeline of privacy events)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                scan_id INTEGER,
                input_type TEXT NOT NULL,
                purpose TEXT,
                risk_before INTEGER,
                risk_after INTEGER,
                protected_count INTEGER,
                metadata_json TEXT,
                FOREIGN KEY (scan_id) REFERENCES scan_history(id) ON DELETE SET NULL
            )
            """
        )

        # 3. Create indexes for high performance stats and history retrieval
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_history_timestamp ON scan_history(timestamp DESC)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_history_input_type ON scan_history(input_type)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_scan_id ON audit_events(scan_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type)"
        )
        conn.commit()
        _initialized_paths.add(target_path)
        logger.info("Database initialized successfully at: %s", target_path)
    finally:
        conn.close()


@contextmanager
def get_db_connection(db_path: str = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite connection with safe PRAGMA configurations.
    Uses sqlite3.Row for dictionary-like column access and ensures atomic commit/rollback.
    Automatically self-initializes schema on first access if needed.
    """
    path = db_path or get_db_path()
    if path not in _initialized_paths:
        init_db(path)

    conn = _open_raw_connection(path)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.execute("PRAGMA busy_timeout=5000;")
        yield conn
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error("Database transaction rolled back: %s", exc)
        raise
    finally:
        conn.close()
