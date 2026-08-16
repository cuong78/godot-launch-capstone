"""
Code analyzer (tiêu chí 1 + 4-phần-text) — chỉ cho CODE từ repo đã clone.

BƯỚC 1 — Rule-based (cứng, không tốn API): Godot check, secret scan, đếm LOC/file.
BƯỚC 2 — DeepSeek API (sample thông minh): gửi cây thư mục + file chính + description
         → đánh giá structure/smell/hoàn thiện + đối chiếu mô tả có phóng đại không.

DeepSeek không multimodal — chỉ text. Nếu DEEPSEEK_API_KEY trống → bước 2 bị skip,
chỉ trả rule-based (graceful, service vẫn chạy).
"""
import os
import json
from pathlib import Path

import requests

IGNORE_DIRS = {".git", "node_modules", "__pycache__", ".godot", ".import", ".git_commit_info.json"}
CODE_EXTS = {".gd", ".cs", ".tscn", ".tres", ".cfg", ".json", ".shader", ".gdshader"}

# Sample limits cho DeepSeek (tránh vượt context / tốn token)
MAX_TREE_ENTRIES = 200
MAX_SAMPLE_FILES = 6
MAX_FILE_CHARS = 4000
MAX_TOTAL_SAMPLE_CHARS = 18000

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_TIMEOUT = int(os.getenv("DEEPSEEK_TIMEOUT_SEC", "60"))


import source_service


def analyze(tmp_dir: str, title: str = "", description: str = "",
            old_tmp_dir: str | None = None, old_title: str = "",
            old_description: str = "", is_update: bool = False) -> dict:
    """
    Phân tích thư mục source đã clone (và so sánh với bản cũ nếu là update).
    """
    root = Path(tmp_dir)
    rule = _rule_based(root)

    diff_stats = None
    if is_update and old_tmp_dir and os.path.isdir(old_tmp_dir):
        try:
            diff_stats = source_service.compare_bundles(old_tmp_dir, tmp_dir)
            if diff_stats.get("isCompletelyDifferentProject"):
                if "secrets" not in rule:
                    rule["secrets"] = []
                rule["isCompletelyDifferentProject"] = True
        except Exception as e:
            pass

    deepseek = _deepseek_eval(root, title, description, rule,
                              is_update=is_update, old_title=old_title,
                              old_description=old_description, diff_stats=diff_stats)

    # Điểm gộp: ưu tiên DeepSeek; nếu skip → suy ra điểm thô từ rule-based
    if deepseek and not deepseek.get("skipped"):
        code_score = deepseek.get("codeQualityScore")
        desc_score = deepseek.get("descriptionMatchScore")
        suggested_price = deepseek.get("suggestedPrice")
        revenue_split = deepseek.get("suggestedRevenueSplit")
        pricing_rationale = deepseek.get("pricingRationale")
    else:
        code_score = _rule_fallback_score(rule)
        desc_score = None  # không có ảnh/text model ở đây → CLIP lo phần ảnh
        suggested_price = None      # không có DeepSeek → không gợi ý giá
        revenue_split = None
        pricing_rationale = ""

    return {
        "rule": rule,
        "deepseek": deepseek,
        "diffStats": diff_stats,
        "codeQualityScore": code_score,
        "descriptionMatchScore": desc_score,
        "suggestedPrice": suggested_price,
        "suggestedRevenueSplit": revenue_split,
        "pricingRationale": pricing_rationale,
    }


# ── Bước 1: rule-based ───────────────────────────────────────────

def _rule_based(root: Path) -> dict:
    has_project_godot = (root / "project.godot").is_file()
    has_godot_source = False
    file_count = 0
    code_file_count = 0
    total_loc = 0
    secrets = []

    # Check extra files
    has_license = any((root / f).is_file() for f in ["LICENSE", "LICENSE.txt", "license.md", "LICENSE.md"])
    has_readme = any((root / f).is_file() for f in ["README.md", "README.txt", "readme.md"])
    
    # Check for unwanted cache folders pushed to git
    has_unwanted_cache = (root / ".godot").is_dir() or (root / ".import").is_dir()

    import re
    secret_patterns = {
        "aws_key": re.compile(r"AKIA[0-9A-Z]{16}"),
        "private_key": re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
        "generic_token": re.compile(
            r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][0-9a-zA-Z\-_]{16,}['\"]"),
    }

    # Extract config version from project.godot
    godot_config_version = None
    if has_project_godot:
        try:
            content = (root / "project.godot").read_text(errors="ignore")
            m = re.search(r"config_version\s*=\s*(\d+)", content)
            if m:
                godot_config_version = int(m.group(1))
        except Exception:
            pass

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        file_count += 1
        suffix = path.suffix.lower()
        if suffix in (".gd", ".tscn", ".scn"):
            has_godot_source = True
        if suffix in CODE_EXTS:
            code_file_count += 1
            try:
                text = path.read_text(errors="ignore")
                total_loc += text.count("\n") + 1
                for name, pat in secret_patterns.items():
                    if pat.search(text):
                        secrets.append({"file": str(rel).replace("\\", "/"), "type": name})
            except Exception:
                pass

    return {
        "hasProjectGodot": has_project_godot,
        "hasGodotSource": has_godot_source,
        "isGodotProject": has_project_godot and has_godot_source,
        "fileCount": file_count,
        "codeFileCount": code_file_count,
        "totalLoc": total_loc,
        "secrets": secrets,
        "hasLicense": has_license,
        "hasReadme": has_readme,
        "hasUnwantedCache": has_unwanted_cache,
        "godotConfigVersion": godot_config_version,
    }


def _rule_fallback_score(rule: dict) -> int:
    """Điểm thô khi không có DeepSeek: dựa độ hoàn thiện cơ bản."""
    score = 0
    if rule["isGodotProject"]:
        score += 40
    if rule["codeFileCount"] >= 3:
        score += 20
    if rule["totalLoc"] >= 200:
        score += 20
    if rule["totalLoc"] >= 1000:
        score += 10
    if not rule["secrets"]:
        score += 10
    return min(100, score)


# ── Bước 2: DeepSeek sample ─────────────────────────────────────

def _build_tree(root: Path) -> str:
    lines = []
    for path in sorted(root.rglob("*")):
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        if len(lines) >= MAX_TREE_ENTRIES:
            lines.append("... (truncated)")
            break
        depth = len(rel.parts) - 1
        prefix = "  " * depth
        lines.append(f"{prefix}{rel.parts[-1]}{'/' if path.is_dir() else ''}")
    return "\n".join(lines)


def _pick_sample_files(root: Path) -> list[tuple[str, str]]:
    """Chọn file chính: project.godot, README, main scene script, các .gd lớn nhất."""
    samples: list[tuple[str, str]] = []
    seen = set()

    def add(path: Path):
        if path and path.is_file():
            rel = str(path.relative_to(root)).replace("\\", "/")
            if rel not in seen:
                try:
                    txt = path.read_text(errors="ignore")[:MAX_FILE_CHARS]
                    samples.append((rel, txt))
                    seen.add(rel)
                except Exception:
                    pass

    add(root / "project.godot")
    for readme in ("README.md", "README.txt", "readme.md"):
        add(root / readme)

    # các .gd lớn nhất (entry point thường lớn)
    gd_files = []
    for path in root.rglob("*.gd"):
        rel = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        try:
            gd_files.append((path.stat().st_size, path))
        except OSError:
            pass
    gd_files.sort(reverse=True)
    for _, path in gd_files:
        if len(samples) >= MAX_SAMPLE_FILES:
            break
        add(path)

    # cắt tổng để không vượt token
    total = 0
    trimmed = []
    for rel, txt in samples:
        if total + len(txt) > MAX_TOTAL_SAMPLE_CHARS:
            txt = txt[: max(0, MAX_TOTAL_SAMPLE_CHARS - total)]
        trimmed.append((rel, txt))
        total += len(txt)
        if total >= MAX_TOTAL_SAMPLE_CHARS:
            break
    return trimmed


def _deepseek_eval(root: Path, title: str, description: str, rule: dict,
                   is_update: bool = False, old_title: str = "",
                   old_description: str = "", diff_stats: dict | None = None) -> dict:
    if not DEEPSEEK_API_KEY:
        return {"skipped": True, "reason": "DEEPSEEK_API_KEY chưa cấu hình",
                "codeQualityScore": None, "descriptionMatchScore": None,
                "completeness": None, "issues": [], "summary": ""}

    # Đọc thông tin git (commit message, diff) nếu có
    git_info = {}
    git_info_path = root / ".git_commit_info.json"
    if git_info_path.is_file():
        try:
            with open(git_info_path, "r", encoding="utf-8") as f:
                git_info = json.load(f)
        except Exception:
            pass

    tree = _build_tree(root)
    samples = _pick_sample_files(root)
    sample_block = "\n\n".join(
        f"### FILE: {rel}\n```\n{txt}\n```" for rel, txt in samples
    ) or "(không có file mẫu)"

    system_prompt = (
        "Bạn là chuyên gia kiểm duyệt và review code Godot Engine cho marketplace. "
        "Nhiệm vụ của bạn là đánh giá chất lượng mã nguồn, độ trung thực của mô tả so với thực tế code, "
        "và chỉ ra chi tiết các vấn đề hoặc tiêu chí đánh giá. "
        "Yêu cầu đặc biệt:\n"
        "1. KHÔNG được đưa ra bất kỳ đề xuất giá bán hoặc tỉ lệ ăn chia doanh thu nào.\n"
        "2. Giải thích cực kỳ chi tiết lý do cho các điểm số trong danh sách `issues`:\n"
        "   - Phải có một mục issue loại 'code_quality_analysis' giải thích rõ tại sao lại đạt điểm số `codeQualityScore` đó, "
        "được đánh giá trên tiêu chí nào (cấu trúc thư mục, đặt tên, tổ chức mã nguồn, code smell, comment, độ hoàn thiện) và bị trừ điểm bởi những lỗi/vấn đề cụ thể gì.\n"
        "   - Phải có một mục issue loại 'description_match_analysis' giải thích rõ tại sao lại đạt điểm số `descriptionMatchScore` đó, "
        "mô tả của developer có phóng đại hay không đúng thực tế code không, có chứa ngôn từ nhạy cảm/bậy bạ hay không.\n"
        "3. Nếu đây là bản cập nhật (isUpdate = True), hãy phân tích đặc biệt sự so sánh giữa bản cũ và mới: mã nguồn có cải thiện gì, "
        "độ tương đồng có giữ đúng dự án không (tránh upload game khác hoàn toàn) và mô tả mới có hợp lý không.\n\n"
        "Trả về DUY NHẤT một JSON object, không markdown, không giải thích thêm.\n"
        "Schema:\n"
        "{\n"
        "  \"codeQualityScore\": int 0-100,\n"
        "  \"descriptionMatchScore\": int 0-100,\n"
        "  \"completeness\": \"low|medium|high\",\n"
        "  \"issues\": [\n"
        "    {\n"
        "      \"type\": \"code_quality_analysis\"|\"description_match_analysis\"|string,\n"
        "      \"severity\": \"low\"|\"medium\"|\"high\",\n"
        "      \"detail\": string (giải thích rất chi tiết bằng tiếng Việt về tiêu chí đánh giá, lý do điểm số, các lỗi/vấn đề phát hiện)\n"
        "    }\n"
        "  ],\n"
        "  \"summary\": string (tiếng Việt, tóm tắt nhận xét tổng quan chi tiết)\n"
        "}"
    )

    user_prompt = (
        f"TIÊU ĐỀ: {title}\n\n"
        f"MÔ TẢ CỦA DEVELOPER:\n{description}\n\n"
        f"THỐNG KÊ (rule-based):\n"
        f"- Là Godot project hợp lệ: {rule['isGodotProject']}\n"
        f"- Số file code: {rule['codeFileCount']}, tổng LOC: {rule['totalLoc']}\n"
        f"- Secret hardcoded phát hiện: {len(rule['secrets'])}\n\n"
        f"CÂY THƯ MỤC:\n{tree}\n\n"
        f"FILE MẪU:\n{sample_block}"
    )

    if is_update and diff_stats:
        user_prompt += (
            f"\n\nTHÔNG TIN SO SÁNH PHIÊN BẢN CỦA BẢN CẬP NHẬT (OLD VS NEW VERSION):\n"
            f"- Tiêu đề cũ: {old_title}\n"
            f"- Mô tả cũ: {old_description}\n"
            f"- Thống kê Diff Source Bundle: Thêm {diff_stats.get('addedCount')} file, Sửa {diff_stats.get('modifiedCount')} file, Xóa {diff_stats.get('removedCount')} file.\n"
            f"- Tỷ lệ tương đồng cấu trúc file: {int(diff_stats.get('fileStructureSimilarity', 1.0) * 100)}%\n"
            f"- Mẫu file sửa đổi: {', '.join(diff_stats.get('sampleModified', []))}\n"
            f"- Mẫu file thêm mới: {', '.join(diff_stats.get('sampleAdded', []))}\n"
        )

    if git_info.get("commitMessage") or git_info.get("gitShow"):
        user_prompt += (
            f"\n\nTHÔNG TIN CẬP NHẬT (LATEST COMMIT):\n"
            f"- Commit Message: {git_info.get('commitMessage', '')}\n"
            f"- Git Show Stat:\n{git_info.get('gitShow', '')}\n"
        )
        if git_info.get("gitDiff"):
            user_prompt += f"- Chi tiết thay đổi (Git Diff):\n{git_info.get('gitDiff', '')}\n"

    try:
        resp = requests.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "max_tokens": 1200,
            },
            timeout=DEEPSEEK_TIMEOUT,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return {
            "skipped": False,
            "reason": "",
            "codeQualityScore": _clamp(parsed.get("codeQualityScore")),
            "descriptionMatchScore": _clamp(parsed.get("descriptionMatchScore")),
            "completeness": parsed.get("completeness"),
            "issues": parsed.get("issues", []) if isinstance(parsed.get("issues"), list) else [],
            "suggestedPrice": None,
            "suggestedRevenueSplit": None,
            "pricingRationale": None,
            "summary": str(parsed.get("summary", "")),
        }
    except Exception as e:
        return {"skipped": True, "reason": f"DeepSeek lỗi: {str(e)[:200]}",
                "codeQualityScore": None, "descriptionMatchScore": None,
                "completeness": None, "issues": [],
                "suggestedPrice": None, "suggestedRevenueSplit": None,
                "pricingRationale": None, "summary": ""}


def _clamp(v):
    try:
        return max(0, min(100, int(v)))
    except (TypeError, ValueError):
        return None


def _num(v):
    """Parse số tiền (float >= 0). None nếu không hợp lệ."""
    try:
        n = float(v)
        return round(max(0.0, n), 2)
    except (TypeError, ValueError):
        return None
