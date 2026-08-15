"""
Source Processing — clone repo GitHub, virus scan, snapshot bất biến.

Dùng cho luồng publish code (game + marketplace source_code repo-based).
Tách khỏi face/ocr để dễ maintain.
"""
import os
import re
import shutil
import hashlib
import base64
import zipfile
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests

# Thư mục chứa file/ext cần bỏ qua khi hash (giảm noise, tránh .git nội bộ)
IGNORE_DIRS = {".git", "node_modules", "__pycache__", ".godot", ".import", ".git_commit_info.json"}

# Giới hạn an toàn
MAX_CLONE_MB = 500          # repo quá lớn → từ chối
CLONE_TIMEOUT_SEC = 120     # clone quá lâu → hủy
MAX_BUNDLE_MB = 50          # bundle zip quá lớn → bỏ qua (chỉ giữ snapshot)
MAX_EXTRACTED_BUNDLE_MB = 500
MAX_BUNDLE_FILES = 20_000
BUNDLE_DOWNLOAD_TIMEOUT_SEC = 90


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

    # project.godot PHẢI ở thư mục gốc (không phải sub-folder bừa)
    has_project_godot_root = (root / "project.godot").is_file()
    # phải có ít nhất 1 file source Godot thật (.gd script hoặc .tscn scene)
    has_godot_source = False

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        if path.suffix.lower() in (".gd", ".tscn", ".scn"):
            has_godot_source = True

        h = _hash_file(path)
        rel_str = str(rel).replace("\\", "/")
        file_hashes[rel_str] = h
        # bundle hash = hash của (path + filehash) theo thứ tự ổn định
        bundle_hasher.update(rel_str.encode())
        bundle_hasher.update(h.encode())

    # Godot project hợp lệ = project.godot ở root VÀ có file .gd/.tscn
    is_godot = has_project_godot_root and has_godot_source

    return {
        "commitSha": _current_commit(tmp_dir),
        "bundleHash": bundle_hasher.hexdigest(),
        "fileHashes": file_hashes,
        "fileCount": len(file_hashes),
        "isGodotProject": is_godot,
        "hasProjectGodot": has_project_godot_root,
        "hasGodotSource": has_godot_source,
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


def _write_git_info(tmp_dir: str):
    """
    Trích xuất thông tin git (commit message, diff của commit mới nhất) và lưu
    vào file json tạm thời trong thư mục clone để đóng gói cùng bundle.
    """
    try:
        # Commit message
        msg_out = subprocess.run(
            ["git", "-C", tmp_dir, "log", "-1", "--pretty=%B"],
            capture_output=True, text=True, timeout=5, errors="ignore"
        )
        commit_message = msg_out.stdout.strip()
        
        # Git show stats
        show_out = subprocess.run(
            ["git", "-C", tmp_dir, "show", "--stat", "HEAD"],
            capture_output=True, text=True, timeout=5, errors="ignore"
        )
        git_show = show_out.stdout.strip()
        
        # Git diff (HEAD~1 to HEAD)
        diff_out = subprocess.run(
            ["git", "-C", tmp_dir, "diff", "HEAD~1", "HEAD"],
            capture_output=True, text=True, timeout=10, errors="ignore"
        )
        git_diff = diff_out.stdout.strip() if diff_out.returncode == 0 else ""
        
        if len(git_diff) > 8000:
            git_diff = git_diff[:8000] + "\n... (diff truncated)"
            
        git_info = {
            "commitMessage": commit_message,
            "gitShow": git_show,
            "gitDiff": git_diff
        }
        
        import json
        with open(os.path.join(tmp_dir, ".git_commit_info.json"), "w", encoding="utf-8") as f:
            json.dump(git_info, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def bundle_source(tmp_dir: str) -> str | None:
    """
    Zip toàn bộ source (bỏ .git, build dirs) → trả base64 để backend upload storage.
    Bundle này để AI service đọc lại sau (giải nén, phân tích).
    Bỏ qua nếu zip > MAX_BUNDLE_MB (chỉ giữ snapshot làm bằng chứng).
    Trả về: base64 string của zip, hoặc None nếu vượt giới hạn.
    """
    # Ghi đè thông tin git ra file json để đóng gói cùng bundle
    _write_git_info(tmp_dir)

    root = Path(tmp_dir)
    tmp_zip = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    tmp_zip_path = tmp_zip.name
    tmp_zip.close()
    try:
        with zipfile.ZipFile(tmp_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(root.rglob("*")):
                if not path.is_file():
                    continue
                rel = path.relative_to(root)
                if any(part in IGNORE_DIRS for part in rel.parts):
                    continue
                zf.write(path, arcname=str(rel).replace("\\", "/"))

        size_mb = os.path.getsize(tmp_zip_path) / (1024 * 1024)
        if size_mb > MAX_BUNDLE_MB:
            return None  # quá lớn → không bundle, chỉ giữ snapshot

        with open(tmp_zip_path, "rb") as f:
            return base64.b64encode(f.read()).decode("ascii")
    finally:
        try:
            os.remove(tmp_zip_path)
        except OSError:
            pass


def download_and_extract_bundle(bundle_url: str, expected_hash: str | None = None) -> dict:
    """
    Tải source bundle bất biến từ storage, giải nén an toàn và xác minh canonical
    bundle hash. Trả về {tmpDir, bundleHash, fileCount}; caller phải cleanup(tmpDir).

    Hash được tính lại từ path + SHA-256 từng file, giống snapshot() lúc clone lần đầu,
    nên không phụ thuộc metadata/timestamp của file ZIP.
    """
    if not bundle_url or not bundle_url.strip():
        raise RuntimeError("Source snapshot chưa có bundle URL")

    parsed = urlparse(bundle_url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise RuntimeError("Bundle URL không hợp lệ")

    extract_dir = tempfile.mkdtemp(prefix="gl_snapshot_")
    fd, zip_path = tempfile.mkstemp(prefix="gl_snapshot_", suffix=".zip")
    os.close(fd)
    try:
        response = _download_bundle(bundle_url)
        downloaded = 0
        try:
            with open(zip_path, "wb") as output:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    downloaded += len(chunk)
                    if downloaded > MAX_BUNDLE_MB * 1024 * 1024:
                        raise RuntimeError(f"Source bundle vượt quá {MAX_BUNDLE_MB}MB")
                    output.write(chunk)
        finally:
            response.close()

        _extract_zip_safely(zip_path, extract_dir)
        calculated = snapshot(extract_dir)
        actual_hash = calculated["bundleHash"]
        if expected_hash and actual_hash.lower() != expected_hash.strip().lower():
            raise RuntimeError(
                f"Source bundle hash không khớp snapshot (expected={expected_hash}, actual={actual_hash})"
            )
        return {
            "tmpDir": extract_dir,
            "bundleHash": actual_hash,
            "fileCount": calculated["fileCount"],
        }
    except Exception:
        cleanup(extract_dir)
        raise
    finally:
        try:
            os.remove(zip_path)
        except OSError:
            pass


def _download_bundle(bundle_url: str):
    urls = [bundle_url]
    if "localhost" in bundle_url:
        urls.append(bundle_url.replace("localhost", "host.docker.internal"))
    elif "127.0.0.1" in bundle_url:
        urls.append(bundle_url.replace("127.0.0.1", "host.docker.internal"))

    last_error = None
    for url in urls:
        try:
            response = requests.get(url, stream=True, timeout=BUNDLE_DOWNLOAD_TIMEOUT_SEC)
            response.raise_for_status()
            content_length = int(response.headers.get("content-length", "0") or 0)
            if content_length > MAX_BUNDLE_MB * 1024 * 1024:
                response.close()
                raise RuntimeError(f"Source bundle vượt quá {MAX_BUNDLE_MB}MB")
            return response
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Không tải được source snapshot bundle: {str(last_error)[:160]}")


def _extract_zip_safely(zip_path: str, extract_dir: str):
    root = Path(extract_dir).resolve()
    total_size = 0
    with zipfile.ZipFile(zip_path, "r") as archive:
        entries = archive.infolist()
        if len(entries) > MAX_BUNDLE_FILES:
            raise RuntimeError(f"Source bundle có quá nhiều file ({len(entries)})")

        for entry in entries:
            # Unix symlink bit trong external attributes.
            unix_mode = entry.external_attr >> 16
            if (unix_mode & 0o170000) == 0o120000:
                raise RuntimeError("Source bundle không được chứa symbolic link")

            target = (root / entry.filename).resolve()
            if target != root and root not in target.parents:
                raise RuntimeError("Source bundle chứa đường dẫn không an toàn")

            total_size += entry.file_size
            if total_size > MAX_EXTRACTED_BUNDLE_MB * 1024 * 1024:
                raise RuntimeError(
                    f"Source bundle sau giải nén vượt quá {MAX_EXTRACTED_BUNDLE_MB}MB"
                )

        archive.extractall(root)


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
