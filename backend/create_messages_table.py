#!/usr/bin/env python3
"""Create messages table in Neon database"""
from app.database import get_db_connection

conn = get_db_connection()
try:
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                read_at TIMESTAMP WITH TIME ZONE
            )
        """)
        conn.commit()
        print("Messages table created successfully")
finally:
    conn.close()
