import base64
import io
import os
import threading
import warnings
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# insightface 1.0.1 still calls skimage's legacy SimilarityTransform.estimate.
# It works correctly today, but recent scikit-image versions emit this warning
# for every face analysis and hide useful liveness rejection logs.
warnings.filterwarnings(
    "ignore",
    message=r"`estimate` is deprecated.*",
    category=FutureWarning,
    module=r"insightface\.utils\.face_align",
)


@dataclass(frozen=True)
class FaceAnalysisResult:
    embedding: list[float]
    pitch: float
    yaw: float
    roll: float
    bbox: tuple[float, float, float, float]
    detection_score: float
    blur_score: float
    brightness: float


_model = None
_model_lock = threading.Lock()


def _get_model():
    """Load InsightFace once. buffalo_l produces ArcFace 512-d embeddings."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from insightface.app import FaceAnalysis
                root = os.getenv("INSIGHTFACE_HOME", os.path.expanduser("~/.insightface"))
                model = FaceAnalysis(
                    name=os.getenv("ARCFACE_MODEL_NAME", "buffalo_l"),
                    root=root,
                    providers=["CPUExecutionProvider"],
                    allowed_modules=["detection", "recognition", "landmark_3d_68"],
                )
                model.prepare(ctx_id=-1, det_size=(640, 640))
                _model = model
    return _model


def preload_models() -> None:
    _get_model()


def decode_image(image_base64: str) -> np.ndarray:
    """Decode base64 (with or without data URI) to a BGR ndarray."""
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    try:
        raw = base64.b64decode(image_base64, validate=True)
        if len(raw) > 8 * 1024 * 1024:
            raise ValueError("Ảnh khuôn mặt vượt quá giới hạn 8 MB.")
        rgb = np.asarray(Image.open(io.BytesIO(raw)).convert("RGB"))
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Dữ liệu ảnh khuôn mặt không hợp lệ.") from exc
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def analyze_face(image_base64: str) -> FaceAnalysisResult:
    image = decode_image(image_base64)
    faces = _get_model().get(image)
    if len(faces) != 1:
        message = "Không tìm thấy khuôn mặt." if not faces else "Chỉ được có một khuôn mặt trong khung hình."
        raise ValueError(message)

    face = faces[0]
    embedding = np.asarray(face.normed_embedding, dtype=np.float32)
    if embedding.shape != (512,):
        raise ValueError("Không thể tạo ArcFace embedding 512 chiều.")

    bbox = tuple(float(value) for value in face.bbox)
    x1, y1, x2, y2 = (max(0, int(value)) for value in bbox)
    crop = image[y1:y2, x1:x2]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.size else np.empty((0, 0))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var()) if gray.size else 0.0
    brightness = float(gray.mean()) if gray.size else 0.0
    pose = np.asarray(getattr(face, "pose", [0.0, 0.0, 0.0]), dtype=float)
    return FaceAnalysisResult(
        embedding=embedding.tolist(), pitch=float(pose[0]), yaw=float(pose[1]),
        roll=float(pose[2]), bbox=bbox, detection_score=float(face.det_score),
        blur_score=blur_score, brightness=brightness,
    )


def extract_embedding(image_base64: str) -> list[float] | None:
    try:
        return analyze_face(image_base64).embedding
    except ValueError:
        return None


def cosine_similarity(left: list[float], right: list[float]) -> float:
    a, b = np.asarray(left, dtype=np.float32), np.asarray(right, dtype=np.float32)
    denominator = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denominator) if denominator else 0.0


def average_embeddings(embeddings: list[list[float]]) -> list[float]:
    value = np.mean(np.asarray(embeddings, dtype=np.float32), axis=0)
    norm = float(np.linalg.norm(value))
    if not norm:
        raise ValueError("Không thể tổng hợp face embedding.")
    return (value / norm).tolist()
