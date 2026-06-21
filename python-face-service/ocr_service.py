import os
import re
import base64
from google.cloud import vision

# GOOGLE_APPLICATION_CREDENTIALS env var phải trỏ tới service account JSON key
# hoặc set GOOGLE_API_KEY nếu dùng API key đơn giản


def _get_vision_client() -> vision.ImageAnnotatorClient:
    return vision.ImageAnnotatorClient()


def extract_text_from_image(image_base64: str) -> str:
    """Gọi Google Cloud Vision TEXT_DETECTION và trả về raw text."""
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_base64)
    client = _get_vision_client()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    texts = response.text_annotations
    if not texts:
        return ""
    return texts[0].description  # full raw text


# ─── CCCD Parser ───────────────────────────────────────────────────────────────

def _parse_cccd(raw: str) -> dict:
    """
    Trích xuất thông tin từ CCCD (Căn cước công dân) Việt Nam.
    Format chuẩn: Số, Họ và tên, Ngày sinh, Giới tính, Quốc tịch, Quê quán, Nơi thường trú
    """
    result = {
        "documentType": "cccd",
        "idNumber": None,
        "fullName": None,
        "dateOfBirth": None,
        "address": None,
    }

    lines = [l.strip() for l in raw.splitlines() if l.strip()]

    # Số CCCD: 12 chữ số liên tiếp
    id_match = re.search(r'\b(\d{12})\b', raw)
    if id_match:
        result["idNumber"] = id_match.group(1)

    # Họ và tên: dòng ALL CAPS sau "Họ và tên" / "Full name"
    name_match = re.search(
        r'(?:Họ(?:\s+và)?\s+tên|Full\s+name)[:\s]*\n?([A-ZĐÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂẮẶỆ][A-ZĐÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂẮẶỆ\s]+)',
        raw, re.IGNORECASE | re.UNICODE
    )
    if name_match:
        result["fullName"] = name_match.group(1).strip().title()
    else:
        # fallback: dòng chữ hoa dài (tên người)
        for line in lines:
            if re.match(r'^[A-ZĐÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂẮẶỆ\s]{5,50}$', line):
                result["fullName"] = line.strip().title()
                break

    # Ngày sinh: DD/MM/YYYY
    dob_match = re.search(
        r'(?:Ngày\s*sinh|Date\s+of\s+birth)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        raw, re.IGNORECASE
    )
    if not dob_match:
        dob_match = re.search(r'\b(\d{2}/\d{2}/\d{4})\b', raw)
    if dob_match:
        result["dateOfBirth"] = dob_match.group(1).replace("-", "/")

    # Nơi thường trú / Quê quán
    addr_match = re.search(
        r'(?:Nơi\s+thường\s+trú|Place\s+of\s+residence)[:\s]*\n?(.+)',
        raw, re.IGNORECASE
    )
    if addr_match:
        result["address"] = addr_match.group(1).strip()

    return result


# ─── Passport Parser ────────────────────────────────────────────────────────────

def _parse_passport(raw: str) -> dict:
    """
    Trích xuất thông tin từ Passport (MRZ line + visual zone).
    MRZ line 2 format: P<VNMHO_VA_TEN<<GIVEN<<NAMES<...
    Line tiếp: PASSPORT_NUMBER...
    """
    result = {
        "documentType": "passport",
        "idNumber": None,
        "fullName": None,
        "dateOfBirth": None,
        "address": None,
    }

    # MRZ — tìm 2 dòng 44 ký tự liên tiếp (chỉ A-Z0-9<)
    mrz_lines = re.findall(r'[A-Z0-9<]{44}', raw.replace(' ', ''))

    if len(mrz_lines) >= 2:
        line1, line2 = mrz_lines[0], mrz_lines[1]

        # Passport number: ký tự 1-9 của line2
        result["idNumber"] = line2[:9].replace('<', '').strip()

        # Date of birth: ký tự 14-19 của line2 (YYMMDD)
        dob_raw = line2[13:19]
        if re.match(r'\d{6}', dob_raw):
            yy, mm, dd = dob_raw[:2], dob_raw[2:4], dob_raw[4:6]
            year = f"19{yy}" if int(yy) > 30 else f"20{yy}"
            result["dateOfBirth"] = f"{dd}/{mm}/{year}"

        # Name từ line1: sau "P<VNM" (hoặc P<XXX)
        name_part = re.sub(r'^P<[A-Z]{3}', '', line1)
        parts = name_part.split('<<', 1)
        if len(parts) == 2:
            surname = parts[0].replace('<', ' ').strip().title()
            given = parts[1].replace('<', ' ').strip().title()
            result["fullName"] = f"{given} {surname}".strip()

    else:
        # Fallback: tìm "Surname" / "Given names"
        surname_match = re.search(r'(?:Surname|Họ)[:\s]+([A-Z][A-Z\s]+)', raw, re.IGNORECASE)
        given_match = re.search(r'(?:Given\s+names?|Tên)[:\s]+([A-Z][A-Z\s]+)', raw, re.IGNORECASE)
        if surname_match and given_match:
            result["fullName"] = f"{given_match.group(1).strip()} {surname_match.group(1).strip()}".title()

        # Passport number
        pn_match = re.search(r'\b([A-Z]\d{7,8})\b', raw)
        if pn_match:
            result["idNumber"] = pn_match.group(1)

        # DOB
        dob_match = re.search(r'\b(\d{2}/\d{2}/\d{4})\b', raw)
        if dob_match:
            result["dateOfBirth"] = dob_match.group(1)

    return result


# ─── Public API ────────────────────────────────────────────────────────────────

def ocr_document(image_base64: str, document_type: str) -> dict:
    """
    Main entry: OCR ảnh giấy tờ và parse theo loại.
    document_type: 'cccd' | 'passport'
    Returns dict với keys: documentType, idNumber, fullName, dateOfBirth, address
    """
    raw_text = extract_text_from_image(image_base64)
    if not raw_text:
        raise ValueError("Không nhận diện được chữ trong ảnh. Vui lòng chụp rõ hơn.")

    if document_type == "passport":
        return _parse_passport(raw_text)
    else:
        return _parse_cccd(raw_text)
