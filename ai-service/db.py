import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"), port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "godot_launch"),
        user=os.getenv("DB_USER", "user_godot_launch"),
        password=os.getenv("DB_PASSWORD", "password_godot_launch"),
    )


def _vector(embedding: list[float]) -> str:
    return "[" + ",".join(str(value) for value in embedding) + "]"


def find_duplicate_face(embedding: list[float], max_cosine_distance: float,
                        exclude_user_id: str | None = None) -> bool:
    sql = """
        SELECT 1 FROM embeddings
        WHERE type = 'face' AND embedding_512 IS NOT NULL
          AND (%s::uuid IS NULL OR user_id != %s::uuid)
          AND embedding_512 <=> %s::vector <= %s LIMIT 1
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (exclude_user_id, exclude_user_id, _vector(embedding), max_cosine_distance))
        return cur.fetchone() is not None


def save_face_embedding(user_id: str, embedding: list[float]) -> None:
    sql = """
        INSERT INTO embeddings (user_id, type, embedding_512)
        VALUES (%s, 'face', %s::vector)
        ON CONFLICT (user_id) WHERE type = 'face'
        DO UPDATE SET embedding_128 = NULL, embedding_512 = EXCLUDED.embedding_512
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (user_id, _vector(embedding)))


def delete_face_embedding(user_id: str) -> int:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM embeddings WHERE user_id = %s AND type = 'face'", (user_id,))
        return cur.rowcount


def find_banned_face(embedding: list[float], max_cosine_distance: float) -> bool:
    sql = """
        SELECT 1 FROM banned_identities
        WHERE face_embedding_512 IS NOT NULL
          AND face_embedding_512 <=> %s::vector <= %s LIMIT 1
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (_vector(embedding), max_cosine_distance))
        return cur.fetchone() is not None


def ban_face_embedding(user_id: str, reason: str) -> bool:
    sql = """
        INSERT INTO banned_identities (user_id, face_embedding_512, reason)
        SELECT %s, embedding_512, %s FROM embeddings
        WHERE user_id = %s AND type = 'face' AND embedding_512 IS NOT NULL LIMIT 1
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (user_id, reason, user_id))
        return cur.rowcount > 0


def find_duplicate_kyc_image(user_id: str, image_side: str, embedding: list[float], threshold: float) -> str | None:
    sql = """
        SELECT user_id::text FROM embeddings
        WHERE type = %s AND user_id != %s
          AND embedding_512 <=> %s::vector <= %s LIMIT 1
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (f"kyc_{image_side}", user_id, _vector(embedding), threshold))
        row = cur.fetchone()
        return row[0] if row else None


def save_kyc_image_embedding(user_id: str, image_side: str, embedding: list[float]) -> None:
    sql = """
        INSERT INTO embeddings (user_id, type, embedding_512)
        VALUES (%s, %s, %s::vector)
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (user_id, f"kyc_{image_side}", _vector(embedding)))
