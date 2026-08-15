"""
CLIP media-match — đo độ tương đồng ảnh (frame video + screenshot) ↔ text (title/desc/category).

Điểm thấp = media KHÔNG khớp mô tả (nghi gắn video game khác / quảng cáo sai).
Self-host bằng Hugging Face transformers (CLIP ViT-B/32), chạy CPU. Lazy-load model.
"""
import os
import io
import base64
import threading

from PIL import Image

_MODEL_NAME = os.getenv("CLIP_MODEL", "openai/clip-vit-base-patch32")

# Lazy singleton — chỉ load model lần gọi đầu (tránh chậm lúc service khởi động)
_model = None
_processor = None
_lock = threading.Lock()


def _load():
    global _model, _processor
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        import torch  # noqa: F401 (đảm bảo torch sẵn)
        from transformers import CLIPModel, CLIPProcessor
        _model = CLIPModel.from_pretrained(_MODEL_NAME)
        _model.eval()
        _processor = CLIPProcessor.from_pretrained(_MODEL_NAME)


def _decode_image(b64: str):
    try:
        raw = base64.b64decode(b64)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        return img
    except Exception:
        return None


def match(images_b64: list[str], texts: list[str]) -> dict:
    """
    Tính cosine similarity giữa từng ảnh và text gộp (title + desc + category).

    Trả về:
      {
        "score": int(0-100),        # trung bình similarity quy về 0-100
        "perImage": [float,...],    # similarity từng ảnh (0-1)
        "imageCount": int,
        "skipped": bool, "reason": str (nếu skip)
      }
    """
    images_b64 = [b for b in (images_b64 or []) if b]
    text = " ".join([t for t in (texts or []) if t]).strip()

    if not images_b64:
        return {"score": None, "perImage": [], "imageCount": 0, "skipped": True,
                "reason": "Không có ảnh/frame để so khớp"}
    if not text:
        return {"score": None, "perImage": [], "imageCount": 0, "skipped": True,
                "reason": "Không có mô tả để so khớp"}

    try:
        _load()
        import torch

        pil_images = [img for img in (_decode_image(b) for b in images_b64) if img is not None]
        if not pil_images:
            return {"score": None, "perImage": [], "imageCount": 0, "skipped": True,
                    "reason": "Ảnh không giải mã được"}

        inputs = _processor(
            text=[text], images=pil_images,
            return_tensors="pt", padding=True, truncation=True,
        )
        with torch.no_grad():
            out = _model(**inputs)
            img_emb = out.image_embeds          # (N, D)
            txt_emb = out.text_embeds           # (1, D)
            img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)
            txt_emb = txt_emb / txt_emb.norm(dim=-1, keepdim=True)
            sims = (img_emb @ txt_emb.T).squeeze(-1)  # (N,) cosine [-1,1]

        per_image = [float(s) for s in sims.tolist()]
        # CLIP cosine của cặp khớp thường ~0.2-0.35; map [0.15, 0.35] → [0,100]
        avg = sum(per_image) / len(per_image)
        score = _to_score(avg)

        return {
            "score": score,
            "perImage": [round(s, 4) for s in per_image],
            "imageCount": len(per_image),
            "skipped": False,
            "reason": "",
        }
    except Exception as e:
        return {"score": None, "perImage": [], "imageCount": len(images_b64),
                "skipped": True, "reason": f"CLIP lỗi: {str(e)[:200]}"}


def _to_score(cosine: float) -> int:
    """Map cosine similarity của CLIP về thang 0-100 (heuristic, ngưỡng tinh chỉnh sau)."""
    lo, hi = 0.15, 0.35
    norm = (cosine - lo) / (hi - lo)
    norm = max(0.0, min(1.0, norm))
    return int(round(norm * 100))


def encode_image(image_b64: str) -> list[float] | None:
    """
    Trả về image embedding CLIP thô (512-dim, đã normalize) của 1 ảnh.
    Dùng để so cosine similarity ảnh↔ảnh (KYC: chống re-upload ảnh CCCD cũ
    của người khác) — khác match() vốn so ảnh↔text (media-match AI review).
    """
    img = _decode_image(image_b64)
    if img is None:
        return None
    try:
        _load()
        import torch

        inputs = _processor(images=[img], return_tensors="pt")
        with torch.no_grad():
            img_emb = _model.get_image_features(**inputs)
            img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)
        return img_emb.squeeze(0).tolist()
    except Exception:
        return None
