"""
NSFW classifier — chấm điểm an toàn cho TẤT CẢ frame video + screenshot.

Bất kỳ ảnh nào vượt ngưỡng NSFW → flag "policy violation" + đánh dấu index ảnh đó
để admin xem trực tiếp. AI chỉ FLAG, admin quyết định (art game bạo lực hợp lệ vẫn được).
Self-host Falconsai/nsfw_image_detection (ViT image-classification nhẹ), CPU, lazy-load.
"""
import os
import io
import base64
import threading

from PIL import Image

_MODEL_NAME = os.getenv("NSFW_MODEL", "Falconsai/nsfw_image_detection")
_THRESHOLD = float(os.getenv("NSFW_THRESHOLD", "0.7"))

_pipe = None
_lock = threading.Lock()


def _load():
    global _pipe
    if _pipe is not None:
        return
    with _lock:
        if _pipe is not None:
            return
        from transformers import pipeline
        _pipe = pipeline("image-classification", model=_MODEL_NAME)


def _decode_image(b64: str):
    try:
        raw = base64.b64decode(b64)
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        return None


def scan(images_b64: list[str]) -> dict:
    """
    Chấm NSFW từng ảnh.

    Trả về:
      {
        "flagged": bool,             # có ảnh nào vượt ngưỡng không
        "maxNsfwScore": float,       # điểm nsfw cao nhất (0-1)
        "threshold": float,
        "perImage": [ {index, nsfw, label} ],
        "flaggedIndexes": [int,...], # index ảnh vi phạm (để admin xem bằng chứng)
        "skipped": bool, "reason": str
      }
    """
    images_b64 = [b for b in (images_b64 or []) if b]
    if not images_b64:
        return {"flagged": False, "maxNsfwScore": 0.0, "threshold": _THRESHOLD,
                "perImage": [], "flaggedIndexes": [], "skipped": True,
                "reason": "Không có ảnh để quét"}

    try:
        _load()
        per_image = []
        flagged_idx = []
        max_nsfw = 0.0

        for i, b64 in enumerate(images_b64):
            img = _decode_image(b64)
            if img is None:
                continue
            preds = _pipe(img)  # [{label, score}, ...]
            nsfw_score = 0.0
            top_label = "normal"
            for p in preds:
                label = str(p.get("label", "")).lower()
                if label in ("nsfw", "porn", "sexy", "hentai"):
                    nsfw_score = max(nsfw_score, float(p.get("score", 0.0)))
                # nhãn cao nhất chung
            if preds:
                top = max(preds, key=lambda x: x.get("score", 0.0))
                top_label = str(top.get("label", "normal"))

            max_nsfw = max(max_nsfw, nsfw_score)
            entry = {"index": i, "nsfw": round(nsfw_score, 4), "label": top_label}
            per_image.append(entry)
            if nsfw_score >= _THRESHOLD:
                flagged_idx.append(i)

        return {
            "flagged": len(flagged_idx) > 0,
            "maxNsfwScore": round(max_nsfw, 4),
            "threshold": _THRESHOLD,
            "perImage": per_image,
            "flaggedIndexes": flagged_idx,
            "skipped": False,
            "reason": "",
        }
    except Exception as e:
        return {"flagged": False, "maxNsfwScore": 0.0, "threshold": _THRESHOLD,
                "perImage": [], "flaggedIndexes": [], "skipped": True,
                "reason": f"NSFW lỗi: {str(e)[:200]}"}
