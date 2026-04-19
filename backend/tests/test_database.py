import pytest
from app.database import get_db_connection

def test_users_table_exists():
    """Users table exists with correct columns"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
    """)

    columns = {row[0]: {"type": row[1], "nullable": row[2]} for row in cursor.fetchall()}

    assert "id" in columns
    assert columns["id"]["type"] == "integer"
    assert columns["id"]["nullable"] == "NO"

    assert "email" in columns
    assert columns["email"]["type"] == "character varying"
    assert columns["email"]["nullable"] == "NO"

    assert "password_hash" in columns
    assert columns["password_hash"]["type"] == "character varying"

    assert "created_at" in columns
    assert columns["created_at"]["type"] == "timestamp with time zone"

    cursor.close()
    conn.close()

def test_sessions_table_exists():
    """Sessions table exists with correct columns"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
    """)

    columns = {row[0]: {"type": row[1], "nullable": row[2]} for row in cursor.fetchall()}

    assert "id" in columns
    assert "user_id" in columns
    assert "token" in columns
    assert "expires_at" in columns

    cursor.close()
    conn.close()
