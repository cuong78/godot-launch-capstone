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

IGNORE_DIRS = {".git", "node_modules", "__pycache__", ".godot", ".import"}
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


def analyze(tmp_dir: str, title: str = "", description: str = "") -> dict:
    """
    Phân tích thư mục source đã clone.

    Trả về:
      {
        "rule": { hasProjectGodot, hasGodotSource, isGodotProject, fileCount,
                  codeFileCount, totalLoc, secrets:[...] },
        "deepseek": { skipped, reason, codeQualityScore, descriptionMatchScore,
                      completeness, issues:[...], summary } | None,
        "codeQualityScore": int|None,       # gộp (ưu tiên deepseek, fallback rule)
        "descriptionMatchScore": int|None
      }
    """
    root = Path(tmp_dir)
    rule = _rule_based(root)

    deepseek = _deepseek_eval(root, title, description, rule)

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

    import re
    secret_patterns = {
        "aws_key": re.compile(r"AKIA[0-9A-Z]{16}"),
        "private_key": re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
        "generic_token": re.compile(
            r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][0-9a-zA-Z\-_]{16,}['\"]"),
    }

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


def _deepseek_eval(root: Path, title: str, description: str, rule: dict) -> dict:
    if not DEEPSEEK_API_KEY:
        return {"skipped": True, "reason": "DEEPSEEK_API_KEY chưa cấu hình",
                "codeQualityScore": None, "descriptionMatchScore": None,
                "completeness": None, "issues": [], "summary": ""}

    tree = _build_tree(root)
    samples = _pick_sample_files(root)
    sample_block = "\n\n".join(
        f"### FILE: {rel}\n```\n{txt}\n```" for rel, txt in samples
    ) or "(không có file mẫu)"

    system_prompt = (
        "Bạn là chuyên gia review code Godot Engine cho marketplace. "
        "Đánh giá chất lượng code, đối chiếu mô tả của developer với code thật, "
        "và GỢI Ý GIÁ bán hợp lý (USD) dựa trên độ hoàn thiện/quy mô/độ hữu ích. "
        "Bạn CHỈ đưa ĐỀ XUẤT — admin con người quyết định cuối. "
        "Trả về DUY NHẤT một JSON object, không markdown, không giải thích thêm. "
        "Schema: {\"codeQualityScore\": int 0-100, \"descriptionMatchScore\": int 0-100, "
        "\"completeness\": \"low|medium|high\", "
        "\"issues\": [{\"type\": string, \"severity\": \"low|medium|high\", \"detail\": string}], "
        "\"suggestedPrice\": number (USD, 0 nếu nên miễn phí), "
        "\"suggestedRevenueSplit\": int 0-100 (% doanh thu dành cho developer khi co-publishing, "
        "thường 50-80), "
        "\"pricingRationale\": string (tiếng Việt, lý do mức giá), "
        "\"summary\": string (tiếng Việt, ngắn gọn)}. "
        "descriptionMatchScore thấp nếu mô tả phóng đại / claim tính năng (vd multiplayer, AI) "
        "mà code không có dấu hiệu tương ứng."
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
            "suggestedPrice": _num(parsed.get("suggestedPrice")),
            "suggestedRevenueSplit": _clamp(parsed.get("suggestedRevenueSplit")),
            "pricingRationale": str(parsed.get("pricingRationale", "")),
            "summary": str(parsed.get("summary", "")),
        }
    except Exception as e:
        return {"skipped": True, "reason": f"DeepSeek lỗi: {str(e)[:200]}",
                "codeQualityScore": None, "descriptionMatchScore": None,
                "completeness": None, "issues": [],
                "suggestedPrice": None, "suggestedRevenueSplit": None,
                "pricingRationale": "", "summary": ""}


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
