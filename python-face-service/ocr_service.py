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
    vietnamese_caps = "A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂẮẰẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔƠỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ"
    
    # Dò tìm thông minh dựa trên dòng chứa nhãn
    label_keywords = ["họ và tên", "họ tên", "full name", "name"]
    target_idx = -1
    for idx, line in enumerate(lines):
        if any(k in line.lower() for k in label_keywords):
            target_idx = idx
            break
            
    if target_idx != -1:
        # Check cùng dòng
        line_content = lines[target_idx]
        cleaned_line = re.sub(r'(?i)(?:Họ\s+và\s+tên|Họ\s+tên|Full\s+name|Name)', '', line_content)
        cleaned_line = re.sub(r'^[Il1/|:\s]+', '', cleaned_line).strip()
        if re.match(r'^[' + vietnamese_caps + r'\s]{5,50}$', cleaned_line):
            result["fullName"] = cleaned_line.title()
            
        # Check dòng tiếp theo nếu cùng dòng không khớp
        if not result["fullName"] and target_idx + 1 < len(lines):
            next_line = lines[target_idx + 1].strip()
            next_line_clean = re.sub(r'^[Il1/|:\s]+', '', next_line).strip()
            if re.match(r'^[' + vietnamese_caps + r'\s]{5,50}$', next_line_clean):
                if not any(k in next_line_clean.lower() for k in ["ngày", "date", "birth", "sinh", "nơi", "place", "quê"]):
                    result["fullName"] = next_line_clean.title()

    # Fallback quét tất cả các dòng tìm tên in hoa nếu trên chưa tìm ra
    if not result["fullName"]:
        for line in lines:
            line_clean = re.sub(r'^[Il1/|:\s]+', '', line).strip()
            if any(k in line_clean.lower() for k in [
                "họ và tên", "full name", "no.", "số", "cộng hòa", "độc lập", "tự do", "hạnh phúc",
                "căn cước", "công dân", "identity", "card", "place", "origin", "residence", "date",
                "birth", "sex", "nationality", "ngày sinh", "giới tính", "quốc tịch", "quê quán",
                "thường trú", "nơi"
            ]):
                continue
            if re.match(r'^[' + vietnamese_caps + r'\s]{5,50}$', line_clean):
                result["fullName"] = line_clean.title()
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

    # Nơi thường trú / Quê quán (đọc nhiều dòng)
    addr_match = re.search(
        r'(?i)(?:Nơi\s+thường\s+trú|Place\s+of\s+residence)[:\s]*\n?([\s\S]+)',
        raw, re.UNICODE
    )
    if addr_match:
        address_block = addr_match.group(1).strip()
        addr_lines = []
        for line in address_block.splitlines():
            line_str = line.strip()
            if not line_str:
                continue
            # Nếu gặp các nhãn khác (kể cả nhãn song ngữ lặp lại của chính field
            # address — CCCD thường in "Nơi thường trú" và "Place of residence"
            # trên 2 dòng riêng, đôi khi OCR lẫn thêm ký tự rác như "I", "/"
            # phía trước do đọc nhầm icon/gạch phân cách) thì bỏ qua dòng đó,
            # không dừng hẳn (dữ liệu địa chỉ thật có thể nằm ở dòng sau).
            if any(k in line_str.lower() for k in ["số / no", "họ và tên", "ngày sinh", "giới tính", "quốc tịch", "quê quán", "có giá trị đến", "expiry"]):
                break
            # Dòng CHỈ chứa nhãn "Place of residence"/"Nơi thường trú" (có thể kèm
            # rác OCR ở 2 đầu như "I", "/", ":") thì bỏ, không lấy làm địa chỉ.
            label_only = re.sub(
                r'(?i)(?:place\s+of\s+residence|nơi\s+thường\s+trú)', '', line_str
            ).strip(" /|:.,-I")
            if not label_only:
                continue
            addr_lines.append(line_str)
        if addr_lines:
            full_addr = ", ".join(addr_lines)

            # Xử lý dọn dẹp nhãn đa tầng cực kỳ mạnh mẽ:
            # Bước 1: Xóa các ký tự đặc biệt/rác OCR ở đầu (/, |, :, I, khoảng trắng...)
            full_addr = re.sub(r'^[\s/|:.,\-I]+', '', full_addr).strip()
            # Bước 2: Loại bỏ label "Place of residence" hoặc "Nơi thường trú" ở đầu
            # (kể cả khi cả 2 nhãn song ngữ dính liền nhau trên cùng 1 dòng, hoặc
            # nhãn nằm giữa chuỗi do rác OCR đứng trước nó)
            full_addr = re.sub(
                r'(?i)^(?:[\s/|:.,\-I]*(?:Place\s+of\s+residence|Nơi\s+thường\s+trú)[\s/|:.,\-]*)+',
                '', full_addr
            ).strip()
            # Bước 3: Xóa tiếp các ký tự phân tách vừa lòi ra sau khi xóa label
            full_addr = re.sub(r'^[\s/|:.,\-I]+', '', full_addr).strip()

            full_addr = re.sub(r',\s*,', ',', full_addr)  # Dọn dẹp dấu phẩy lặp
            result["address"] = full_addr.strip().strip(',').strip()

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
