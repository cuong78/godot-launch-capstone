import os
import psycopg2
from psycopg2.extras import RealDictCursor
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "godot_launch"),
        user=os.getenv("DB_USER", "user_godot_launch"),
        password=os.getenv("DB_PASSWORD", "password_godot_launch"),
    )


def find_duplicate_face(embedding: list[float], threshold: float) -> bool:
    """
    Query pgvector: tìm embedding nào có cosine distance <= threshold.
    Cosine distance: 0 = identical, 2 = opposite. Người giống nhau thường < 0.5.
    """
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = """
        SELECT 1
        FROM face_embeddings
        WHERE embedding <=> %s::vector <= %s
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (vec_str, threshold))
            return cur.fetchone() is not None


def save_face_embedding(user_id: str, embedding: list[float]) -> None:
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = """
        INSERT INTO face_embeddings (user_id, embedding)
        VALUES (%s, %s::vector)
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, vec_str))
        conn.commit()


def delete_face_embedding(user_id: str) -> int:
    sql = "DELETE FROM face_embeddings WHERE user_id = %s"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            deleted = cur.rowcount
        conn.commit()
    return deleted
