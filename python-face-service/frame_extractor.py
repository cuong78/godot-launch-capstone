"""
Frame extraction — tải video intro (đã upload, có URL) → ffmpeg cắt N frame đều nhau.

Mỗi frame là 1 ảnh để đưa vào CLIP (media match) + NSFW classifier.
Lý do cắt nhiều frame: video có thể gắn của game khác để lừa, NSFW có thể giấu
trong vài giây giữa video → cần sample nhiều mốc thời gian.
"""
import os
import base64
import shutil
import subprocess
import tempfile
from pathlib import Path

import requests

# Giới hạn an toàn — tránh video dài/nặng làm nghẽn service
MAX_VIDEO_MB = 200
DOWNLOAD_TIMEOUT_SEC = 60
FFMPEG_TIMEOUT_SEC = 90
DEFAULT_FRAME_COUNT = 8       # số frame cắt đều nhau across timeline
MAX_FRAME_COUNT = 16


def extract_frames(video_url: str, frame_count: int = DEFAULT_FRAME_COUNT) -> list[str]:
    """
    Tải video từ URL → ffmpeg cắt `frame_count` frame đều nhau → list base64 (jpeg).
    Fail-soft: lỗi tải/cắt → trả [] (AI review vẫn chạy với screenshots, không crash).
    """
    frame_count = max(1, min(frame_count, MAX_FRAME_COUNT))
    tmp_dir = tempfile.mkdtemp(prefix="gl_frames_")
    video_path = os.path.join(tmp_dir, "video.mp4")
    try:
        if not _download(video_url, video_path):
            return []

        duration = _probe_duration(video_path)
        frames_b64: list[str] = []

        if duration and duration > 0:
            # cắt tại các mốc đều nhau: tránh frame 0 (thường đen) và frame cuối
            step = duration / (frame_count + 1)
            for i in range(1, frame_count + 1):
                ts = step * i
                img = _extract_at(video_path, ts, tmp_dir, i)
                if img:
                    frames_b64.append(img)
        else:
            # không lấy được duration → fallback dùng fps thấp lấy vài frame đầu
            frames_b64 = _extract_by_fps(video_path, tmp_dir, frame_count)

        return frames_b64
    except Exception:
        return []
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── helpers ──────────────────────────────────────────────────────

def _download(url: str, dest: str) -> bool:
    try:
        with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT_SEC) as r:
            r.raise_for_status()
            total = 0
            limit = MAX_VIDEO_MB * 1024 * 1024
            with open(dest, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    total += len(chunk)
                    if total > limit:
                        return False  # video quá lớn → bỏ
                    f.write(chunk)
        return os.path.getsize(dest) > 0
    except Exception:
        return False


def _probe_duration(video_path: str) -> float:
    """Lấy thời lượng video (giây) qua ffprobe. 0 nếu lỗi."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", video_path],
            check=True, capture_output=True, text=True, timeout=20,
        )
        return float(out.stdout.strip())
    except Exception:
        return 0.0


def _extract_at(video_path: str, ts: float, tmp_dir: str, idx: int) -> str | None:
    """Cắt 1 frame tại mốc thời gian ts (giây) → base64 jpeg."""
    out_path = os.path.join(tmp_dir, f"frame_{idx}.jpg")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-ss", f"{ts:.2f}", "-i", video_path,
             "-frames:v", "1", "-q:v", "3", "-vf", "scale=512:-1", out_path],
            check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SEC,
        )
        return _to_b64(out_path)
    except Exception:
        return None


def _extract_by_fps(video_path: str, tmp_dir: str, frame_count: int) -> list[str]:
    """Fallback: lấy frame theo fps thấp (khi không probe được duration)."""
    pattern = os.path.join(tmp_dir, "f_%03d.jpg")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-vf", "fps=1/3,scale=512:-1",
             "-frames:v", str(frame_count), "-q:v", "3", pattern],
            check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SEC,
        )
    except Exception:
        return []
    frames = []
    for p in sorted(Path(tmp_dir).glob("f_*.jpg")):
        b = _to_b64(str(p))
        if b:
            frames.append(b)
    return frames[:frame_count]


def _to_b64(path: str) -> str | None:
    try:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("ascii")
    except Exception:
        return None
