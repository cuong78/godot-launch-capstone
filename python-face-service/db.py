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
    Query pgvector: tìm embedding nào có Euclidean (L2) distance <= threshold.
    Embedding do face_recognition (dlib) sinh ra được thiết kế để so bằng L2,
    không phải cosine — mặc định thư viện dùng tolerance 0.6, nhưng hệ thống
    dùng 0.45 (chặt hơn) để giảm false-positive trên ảnh webcam chất lượng
    thấp (xem FACE_SIMILARITY_THRESHOLD trong .env/docker-compose.yml).
    """
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = """
        SELECT 1
        FROM embeddings
        WHERE type = 'face' AND embedding_128 <-> %s::vector <= %s
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (vec_str, threshold))
            return cur.fetchone() is not None


def save_face_embedding(user_id: str, embedding: list[float]) -> None:
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = """
        INSERT INTO embeddings (user_id, type, embedding_128)
        VALUES (%s, 'face', %s::vector)
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, vec_str))
        conn.commit()


def delete_face_embedding(user_id: str) -> int:
    sql = "DELETE FROM embeddings WHERE user_id = %s AND type = 'face'"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            deleted = cur.rowcount
        conn.commit()
    return deleted


def find_banned_face(embedding: list[float], threshold: float) -> bool:
    """
    Query pgvector: khuôn mặt có trùng với 1 danh tính trong blacklist
    banned_identities không — khác find_duplicate_face (chỉ báo trùng
    thường), đây dùng để CHẶN CỨNG (không cho verify lại).
    """
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = """
        SELECT 1
        FROM banned_identities
        WHERE face_embedding IS NOT NULL
          AND face_embedding <-> %s::vector <= %s
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (vec_str, threshold))
            return cur.fetchone() is not None


def ban_face_embedding(user_id: str, reason: str) -> bool:
    """
    Copy face embedding hiện có của user (nếu có) sang banned_identities.
    Không xóa embedding gốc trong `embeddings` (giữ nguyên hành vi cũ —
    dùng để đối chiếu lịch sử/audit). Trả False nếu user chưa từng đăng ký
    face embedding (vẫn hợp lệ — CCCD/bank vẫn được Java lưu vào bảng ban).
    """
    sql = """
        INSERT INTO banned_identities (user_id, face_embedding, reason)
        SELECT %s, embedding_128, %s
        FROM embeddings
        WHERE user_id = %s AND type = 'face'
        LIMIT 1
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, reason, user_id))
            inserted = cur.rowcount
        conn.commit()
    return inserted > 0


def find_duplicate_kyc_image(user_id: str, image_side: str, embedding: list[float], threshold: float) -> str | None:
    """
    Chống bypass KYC: re-upload ảnh CCCD/Passport CŨ (của người khác, đã từng
    KYC trước đó) kèm sửa tay idNumber trên form. Query pgvector tìm ảnh cùng
    side (front/back) có cosine distance <= threshold, LOẠI TRỪ chính user
    này (cho phép họ tự re-KYC lại đúng ảnh của mình).

    Trả về user_id của chủ ảnh trùng (để log/audit), None nếu không trùng.
    """
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sql = """
        SELECT user_id::text
        FROM embeddings
        WHERE type = %s AND user_id != %s
          AND embedding_512 <=> %s::vector <= %s
        LIMIT 1
    """
    kyc_type = f"kyc_{image_side}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (kyc_type, user_id, vec_str, threshold))
            row = cur.fetchone()
            return row[0] if row else None


def save_kyc_image_embedding(user_id: str, image_side: str, embedding: list[float]) -> None:
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
    kyc_type = f"kyc_{image_side}"
    sql = """
        INSERT INTO embeddings (user_id, type, embedding_512)
        VALUES (%s, %s, %s::vector)
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, kyc_type, vec_str))
        conn.commit()
