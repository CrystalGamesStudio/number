import os
from dotenv import load_dotenv
from psycopg import connect

load_dotenv()

def get_db_connection():
    return connect(
        host=os.environ["NEON_HOST"],
        dbname=os.environ["NEON_DATABASE"],
        user=os.environ["NEON_USER"],
        password=os.environ["NEON_PASSWORD"],
        sslmode="require"
    )
