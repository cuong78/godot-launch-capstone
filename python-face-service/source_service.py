"""
Source Processing — clone repo GitHub, virus scan, snapshot bất biến.

Dùng cho luồng publish code (game + marketplace source_code repo-based).
Tách khỏi face/ocr để dễ maintain.
"""
import os
import re
import shutil
import hashlib
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

# Thư mục chứa file/ext cần bỏ qua khi hash (giảm noise, tránh .git nội bộ)
IGNORE_DIRS = {".git", "node_modules", "__pycache__", ".godot", ".import"}

# Giới hạn an toàn
MAX_CLONE_MB = 500          # repo quá lớn → từ chối
CLONE_TIMEOUT_SEC = 120     # clone quá lâu → hủy


def _safe_repo_url(repo_url: str, token: str | None, branch: str | None):
    """
    Build URL clone có token (cho private repo). Trả về (clone_url, owner, repo).
    Chỉ chấp nhận host github.com để tránh SSRF.
    """
    parsed = urlparse(repo_url.strip().rstrip("/"))
    if parsed.netloc not in ("github.com", "www.github.com"):
        raise ValueError("Chỉ hỗ trợ repo trên github.com")

    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 2:
        raise ValueError("URL repo không hợp lệ (thiếu owner/repo)")
    owner, repo = parts[0], parts[1].replace(".git", "")

    if token:
        clone_url = f"https://{token}@github.com/{owner}/{repo}.git"
    else:
        clone_url = f"https://github.com/{owner}/{repo}.git"
    return clone_url, owner, repo


def clone_repo(repo_url: str, token: str | None = None, branch: str | None = None) -> dict:
    """
    Shallow clone repo về thư mục tạm.
    Trả về: { tmpDir, owner, repo, commitSha, defaultBranch }
    Caller có trách nhiệm gọi cleanup(tmpDir).
    """
    clone_url, owner, repo = _safe_repo_url(repo_url, token, branch)
    tmp_dir = tempfile.mkdtemp(prefix="gl_clone_")

    cmd = ["git", "clone", "--depth", "50", "--single-branch"]
    if branch:
        cmd += ["--branch", branch]
    cmd += [clone_url, tmp_dir]

    try:
        subprocess.run(
            cmd, check=True, timeout=CLONE_TIMEOUT_SEC,
            capture_output=True, text=True
        )
    except subprocess.TimeoutExpired:
        cleanup(tmp_dir)
        raise RuntimeError("Clone timeout — repo quá lớn hoặc mạng chậm")
    except subprocess.CalledProcessError as e:
        cleanup(tmp_dir)
        # Không leak token trong message
        stderr = (e.stderr or "").replace(token or "___none___", "***")
        raise RuntimeError(f"Clone thất bại: {stderr[:300]}")

    # Kiểm tra kích thước
    size_mb = _dir_size_mb(tmp_dir)
    if size_mb > MAX_CLONE_MB:
        cleanup(tmp_dir)
        raise RuntimeError(f"Repo quá lớn ({size_mb:.0f}MB > {MAX_CLONE_MB}MB)")

    commit_sha = _current_commit(tmp_dir)
    return {
        "tmpDir": tmp_dir,
        "owner": owner,
        "repo": repo,
        "commitSha": commit_sha,
    }


def snapshot(tmp_dir: str) -> dict:
    """
    Tính bằng chứng bất biến: commit SHA + hash từng file + hash toàn bộ bundle.
    Bỏ qua .git và thư mục build nội bộ.
    Trả về: { commitSha, bundleHash, fileHashes, fileCount, isGodotProject }
    """
    root = Path(tmp_dir)
    file_hashes: dict[str, str] = {}
    bundle_hasher = hashlib.sha256()
    is_godot = False

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        if rel.name == "project.godot":
            is_godot = True

        h = _hash_file(path)
        rel_str = str(rel).replace("\\", "/")
        file_hashes[rel_str] = h
        # bundle hash = hash của (path + filehash) theo thứ tự ổn định
        bundle_hasher.update(rel_str.encode())
        bundle_hasher.update(h.encode())

    return {
        "commitSha": _current_commit(tmp_dir),
        "bundleHash": bundle_hasher.hexdigest(),
        "fileHashes": file_hashes,
        "fileCount": len(file_hashes),
        "isGodotProject": is_godot,
    }


def scan_secrets(tmp_dir: str) -> list[dict]:
    """
    Quét sơ bộ secret hardcoded (API key, token, private key).
    Trả về list { file, type } — phục vụ AI review sau, P1 chỉ flag.
    """
    patterns = {
        "aws_key": re.compile(r"AKIA[0-9A-Z]{16}"),
        "private_key": re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
        "generic_token": re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][0-9a-zA-Z\-_]{20,}['\"]"),
    }
    findings = []
    root = Path(tmp_dir)
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        if path.suffix.lower() not in (".gd", ".cs", ".cfg", ".json", ".txt", ".env", ".tres", ".tscn"):
            continue
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        for name, pat in patterns.items():
            if pat.search(text):
                findings.append({"file": str(rel).replace("\\", "/"), "type": name})
    return findings


def scan_virus(tmp_dir: str) -> dict:
    """
    Quét virus toàn bộ thư mục qua ClamAV daemon (network socket).
    Fail-open: nếu ClamAV không kết nối được → coi như sạch nhưng đánh dấu scanned=False.
    Trả về: { clean: bool, scanned: bool, infected: [ {file, virus} ] }
    """
    try:
        import clamd
        host = os.getenv("CLAMAV_HOST", "clamav")
        port = int(os.getenv("CLAMAV_PORT", "3310"))
        cd = clamd.ClamdNetworkSocket(host=host, port=port, timeout=120)
        cd.ping()
    except Exception as e:
        # ClamAV không sẵn sàng → fail-open, đánh dấu chưa scan để admin biết
        return {"clean": True, "scanned": False, "infected": [], "error": str(e)[:200]}

    infected = []
    root = Path(tmp_dir)
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        try:
            with open(path, "rb") as f:
                result = cd.instream(f)
            status = result.get("stream", ("OK", None))
            if status[0] == "FOUND":
                infected.append({"file": str(rel).replace("\\", "/"), "virus": status[1]})
        except Exception:
            # File quá lớn / lỗi đọc → bỏ qua file đó, không fail cả scan
            continue

    return {"clean": len(infected) == 0, "scanned": True, "infected": infected}


def cleanup(tmp_dir: str | None):
    """Xóa thư mục tạm sau khi xử lý xong."""
    if tmp_dir and os.path.isdir(tmp_dir):
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── helpers ──────────────────────────────────────────────────────

def _current_commit(tmp_dir: str) -> str:
    try:
        out = subprocess.run(
            ["git", "-C", tmp_dir, "rev-parse", "HEAD"],
            check=True, capture_output=True, text=True
        )
        return out.stdout.strip()
    except Exception:
        return ""


def _hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _dir_size_mb(tmp_dir: str) -> float:
    total = 0
    for p in Path(tmp_dir).rglob("*"):
        if p.is_file():
            try:
                total += p.stat().st_size
            except OSError:
                pass
    return total / (1024 * 1024)
