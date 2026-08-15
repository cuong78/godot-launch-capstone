"""
Kiểm tra độ phù hợp và nhạy cảm của văn bản (tên game + mô tả).

Chiến lược 2 lớp:
  1. Keyword-based (nhanh, không cần API): phát hiện ngôn từ rõ ràng nhạy cảm
  2. DeepSeek (nếu có key): đánh giá sâu hơn — phóng đại, nội dung 18+, gây hiểu lầm

Trả về:
  {
    "issues": [{"field": "title"|"description", "type": str, "severity": "high"|"medium"|"low", "detail": str}],
    "titleSensitive": bool,
    "descriptionSensitive": bool,
    "descriptionAccurate": bool | None,  # DeepSeek: description có thật không, None nếu skip
    "titleScore": int,           # 0-100, điểm phù hợp tên (100 = hoàn toàn sạch)
    "descriptionScore": int,     # 0-100, điểm phù hợp mô tả
    "tagsMatchScore": int | None, # 0-100, tag có khớp tên+mô tả không; None nếu không có tags
    "skipped": bool,             # DeepSeek bị bỏ qua
    "reason": str
  }
"""
import os
import re
import json
import requests

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_TIMEOUT = int(os.getenv("DEEPSEEK_TIMEOUT_SEC", "60"))

# Từ khóa nhạy cảm cơ bản — chỉ là lớp lọc nhanh, không toàn diện
_SENSITIVE_KEYWORDS = [
    # EN
    "porn", "sex", "nude", "naked", "adult", "xxx", "hentai", "nsfw",
    "fuck", "shit", "ass", "bitch", "bastard", "whore", "pussy", "dick",
    "kill", "murder", "blood", "gore", "rape", "violence", "drug", "hack",
    # VN thường gặp
    "khiêu dâm", "tục tĩu", "người lớn", "18+", "cởi đồ", "khỏa thân",
    "đụ", "địt", "lồn", "buồi", "cặc", "chó chết", "đĩ", "bóc phốt",
    "giết", "máu", "bạo lực", "ma túy", "hack", "crack", "cheat",
]


def _keyword_matches(kw: str, lower_text: str) -> bool:
    """
    So khớp 1 keyword trong text (đã lowercase).

    Từ khóa chỉ gồm chữ cái (vd "ass", "sex", "hack") dùng word-boundary
    (\\b) để tránh false positive khi nó là substring của từ vô hại —
    ví dụ "ass" từng khớp nhầm vào "Classic" (Cl-ass-ic), "sex" vào "essex".
    Từ khóa có khoảng trắng/ký tự đặc biệt (cụm tiếng Việt, "18+") giữ
    nguyên substring match vì các cụm dài này hiếm khi là false positive
    và \\b không hoạt động đúng quanh ký tự non-word như '+'.
    """
    if re.fullmatch(r"[a-zA-Z]+", kw):
        return re.search(rf"\b{re.escape(kw)}\b", lower_text) is not None
    return kw in lower_text


def _keyword_check(text: str, field: str) -> list[dict]:
    """Kiểm tra keyword nhanh. Trả về list issues."""
    issues = []
    lower = text.lower()
    matched = [kw for kw in _SENSITIVE_KEYWORDS if _keyword_matches(kw, lower)]
    if matched:
        issues.append({
            "field": field,
            "type": "text_sensitive_keyword",
            "severity": "high",
            "detail": f"Phát hiện từ nhạy cảm trong {field}: {', '.join(matched[:5])}",
        })
    return issues


def _deepseek_eval(title: str, description: str, tags: list | None = None) -> dict:
    """
    Dùng DeepSeek đánh giá:
    1. Tên có phù hợp, không nhạy cảm không?
    2. Mô tả có phù hợp, không phóng đại/sai lệch không?
    3. Có nội dung 18+, bạo lực, cờ bạc không?
    4. Thẻ tags được chọn có phù hợp với game không?

    Trả về dict hoặc {"skipped": true, "reason": ...}
    """
    tags = tags or []
    if not DEEPSEEK_API_KEY:
        return {"skipped": True, "reason": "DEEPSEEK_API_KEY không được cấu hình"}

    tags_str = ", ".join(tags) if tags else "None"
    prompt = f"""Bạn là chuyên gia kiểm duyệt nội dung cho nền tảng game Godot Engine.
Hãy đánh giá tên, mô tả game và danh sách các thẻ tags dưới đây theo các tiêu chí:
1. Tên game có phù hợp, lịch sự, không chứa ngôn từ nhạy cảm/phản cảm không?
2. Mô tả có trung thực, phù hợp, không phóng đại hay chứa nội dung nhạy cảm không?
3. Có nội dung người lớn (18+), bạo lực thực, cờ bạc, ma túy hoặc vi phạm pháp luật không?
4. Danh sách các thẻ tags do developer tự chọn: [{tags_str}] có phù hợp với tên và mô tả game không? Có tag nào lạc đề, sai lệch thể loại, hoặc mang tính spam/không phù hợp không?

TÊN GAME: {title[:200]}
MÔ TẢ: {description[:800]}
TAGS CHỌN: {tags_str}

Trả về JSON với format (không được thêm markdown):
{{
  "titleScore": <0-100, 100=hoàn toàn phù hợp>,
  "descriptionScore": <0-100>,
  "titleSensitive": <true/false>,
  "descriptionSensitive": <true/false>,
  "descriptionAccurate": <true/false/null — liệu mô tả có vẻ trung thực không>,
  "tagsAppropriate": <true/false/null — liệu danh sách tags có phù hợp và chính xác không>,
  "tagsMatchScore": <0-100, null nếu không có tags — điểm mức độ tags khớp với tên+mô tả game>,
  "issues": [
    {{"field": "title"|"description"|"tags", "type": "<vd: offensive_language|adult_content|misleading|gambling|violence|tags_mismatch>", "severity": "high"|"medium"|"low", "detail": "<giải thích ngắn tiếng Việt>"}}
  ],
  "summary": "<tóm tắt 1 câu bằng tiếng Việt>"
}}"""

    try:
        resp = requests.post(
            f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 600,
            },
            timeout=DEEPSEEK_TIMEOUT,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Xóa markdown nếu có
        content = re.sub(r"^```[a-z]*\n?", "", content).rstrip("` \n")
        return json.loads(content)
    except Exception as e:
        return {"skipped": True, "reason": f"DeepSeek lỗi: {str(e)[:100]}"}


def analyze(title: str = "", description: str = "", tags: list | None = None) -> dict:
    """
    Phân tích tên + mô tả game + tags. Entry point cho main.py.
    Luôn trả về dict đầy đủ — fail-soft với keyword check nếu DeepSeek lỗi.
    """
    tags = tags or []
    title = (title or "").strip()
    description = (description or "").strip()

    issues = []

    # Lớp 1: keyword nhanh (luôn chạy)
    if title:
        issues.extend(_keyword_check(title, "title"))
    if description:
        issues.extend(_keyword_check(description, "description"))
    if tags:
        for tag in tags:
            tag_issues = _keyword_check(tag, "tags")
            for ti in tag_issues:
                ti["detail"] = f"Sensitive keyword in tag '{tag}': {ti['detail']}"
                issues.append(ti)

    # Lớp 2: DeepSeek (nếu có)
    ds = {}
    skipped = True
    reason = "Bỏ qua (không có dữ liệu)"

    if title or description or tags:
        ds = _deepseek_eval(title, description, tags)
        skipped = bool(ds.get("skipped"))
        reason = ds.get("reason", "")

        if not skipped:
            # Merge DeepSeek issues, tránh trùng với keyword issues
            for issue in ds.get("issues", []):
                # Bỏ qua nếu đã có keyword flag cùng field
                already = any(i["field"] == issue.get("field") and i["type"] == "text_sensitive_keyword"
                              for i in issues)
                if not already:
                    issues.append(issue)

    title_sensitive = (
        ds.get("titleSensitive", False)
        if not skipped
        else any(i["field"] == "title" for i in issues)
    )
    description_sensitive = (
        ds.get("descriptionSensitive", False)
        if not skipped
        else any(i["field"] == "description" for i in issues)
    )
    tags_appropriate = (
        ds.get("tagsAppropriate", True)
        if not skipped
        else not any(i["field"] == "tags" for i in issues)
    )
    tags_match_score = (
        ds.get("tagsMatchScore") if not skipped
        else (None if not tags else (100 if tags_appropriate else 30))
    ) if tags else None

    return {
        "issues": issues,
        "titleSensitive": title_sensitive,
        "descriptionSensitive": description_sensitive,
        "descriptionAccurate": ds.get("descriptionAccurate"),
        "tagsAppropriate": tags_appropriate,
        "tagsMatchScore": tags_match_score,
        "titleScore": ds.get("titleScore", 100 if not title_sensitive else 30),
        "descriptionScore": ds.get("descriptionScore", 100 if not description_sensitive else 30),
        "summary": ds.get("summary", ""),
        "skipped": skipped,
        "reason": reason,
    }
