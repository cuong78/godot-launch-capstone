# 03. Face Verify & KYC — Luồng bảo mật danh tính

GodotLaunch dùng hệ thống xác minh danh tính 3 tầng (Tier 0/1/2) theo nguyên tắc **progressive trust** — chỉ yêu cầu xác minh khi người dùng muốn thực hiện hành động có giá trị cao hơn, tránh làm phức tạp quá trình đăng ký ban đầu.

---

## Tổng quan 3 Tier

```
┌──────────────────────────────────────────────────────────────────┐
│ TIER 0 — SIGNUP (customer + developer)                           │
│  Email OTP + reCAPTCHA v2                                        │
│  Mục đích: ngăn bot tạo tài khoản hàng loạt                     │
│  KHÔNG yêu cầu face hay giấy tờ                                  │
└──────────────────────────────────────────────────────────────────┘
         ↓  (sau khi có tài khoản và muốn bán hàng)
┌──────────────────────────────────────────────────────────────────┐
│ TIER 1 — LẦN ĐẦU ĐĂNG ASSET LÊN MARKETPLACE (developer)        │
│  Quét khuôn mặt (webcam) → so sánh với embedding DB             │
│  Xác minh 1 lần duy nhất → face_verified = true → skip sau      │
│  Mục đích: 1 người không tạo nhiều tài khoản developer          │
└──────────────────────────────────────────────────────────────────┘
         ↓  (sau khi game được duyệt và muốn ký hợp đồng)
┌──────────────────────────────────────────────────────────────────┐
│ TIER 2 — LẦN ĐẦU KÝ HỢP ĐỒNG (developer)                       │
│  OCR CCCD / Hộ chiếu → trích xuất thông tin → auto-fill         │
│  Xác minh 1 lần duy nhất → kyc_verified = true → skip sau       │
│  Mục đích: xác định danh tính pháp lý cho hợp đồng              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tier 0 — Signup: Email OTP + reCAPTCHA

### Luồng

```
[Frontend SignUpPage]
  1. User điền email → click "Gửi OTP"
  2. POST /api/auth/send-otp  { email }
     → Backend gửi 6-digit OTP qua SMTP
  3. User điền OTP + password + reCAPTCHA token
     (ReCAPTCHA widget tự xử lý click "I'm not a robot")
  4. POST /api/auth/signup  { email, password, otp, recaptchaToken, ... }
     → Backend verify reCAPTCHA với Google siteverify API
     → Verify OTP
     → Tạo user trong DB
```

### Verify reCAPTCHA phía backend

```
POST https://www.google.com/recaptcha/api/siteverify
  secret=<RECAPTCHA_SECRET_KEY>
  response=<token từ frontend>

Response: { "success": true/false, "score": ... }
Nếu success = false → 400 INVALID_RECAPTCHA
```

### Files

| File | Vai trò |
|---|---|
| `SignUpPage.tsx` | Widget `react-google-recaptcha`, dark theme, disabled submit khi chưa check |
| `AuthServiceImpl.java` | `verifyRecaptcha()` gọi Google siteverify, `signUp()` gọi trước khi tạo user |
| `SignUpRequest.java` | `@NotBlank recaptchaToken` |
| `ErrorCode.java` | `INVALID_RECAPTCHA` (400) |
| `backend/.env` | `RECAPTCHA_SECRET_KEY=...` |

---

## Tier 1 — Face Verify: Chống spam tài khoản

### Mục đích

Ngăn 1 người tạo nhiều tài khoản developer để spam Marketplace. Dùng vector embedding khuôn mặt lưu PostgreSQL — so sánh cosine distance để phát hiện khuôn mặt đã đăng ký từ tài khoản khác.

### Kiến trúc

```
┌─────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Browser   │     │  Spring Boot (8080)  │     │  Python Service  │
│  (webcam)   │     │                      │     │  FastAPI (8001)  │
└──────┬──────┘     └──────────┬───────────┘     └────────┬─────────┘
       │                       │                          │
       │  POST /face-verify    │                          │
       │  { faceImageBase64 }  │                          │
       │──────────────────────>│                          │
       │                       │  POST /face/check        │
       │                       │  { imageBase64 }         │
       │                       │─────────────────────────>│
       │                       │                          │ extract 128-dim
       │                       │                          │ embedding (dlib)
       │                       │                          │ query pgvector DB
       │                       │                          │ cosine dist <= 0.5?
       │                       │  { isDuplicate: bool }   │
       │                       │<─────────────────────────│
       │                       │                          │
       │                       │  POST /face/register     │
       │                       │  { userId, imageBase64 } │
       │                       │─────────────────────────>│
       │                       │                          │ INSERT embedding
       │                       │                          │ vào face_embeddings
       │                       │  200 OK                  │
       │                       │<─────────────────────────│
       │                       │                          │
       │                       │ users.face_verified=true │
       │  { faceVerified:true }│ userRepo.save(user)      │
       │<──────────────────────│                          │
```

### Python Face Service endpoints

```
GET  /health              → kiểm tra service sống
POST /face/check          → kiểm tra duplicate (trả isDuplicate + userId nếu tìm thấy)
POST /face/register       → lưu embedding vào DB
DELETE /face/{user_id}    → xóa embedding (khi xóa tài khoản)
POST /ocr/document        → OCR giấy tờ (dùng cho Tier 2)
```

### Database

```sql
-- V16__add_face_embeddings.sql
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector extension

CREATE TABLE face_embeddings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding  vector(512) NOT NULL,     -- 512-dim normalized ArcFace embedding
    created_at TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat index: tối ưu cosine similarity search
CREATE INDEX ON face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- V17__add_face_verified.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

### Embedding & similarity

```python
# face_service.py
from face_service import analyze_face  # InsightFace buffalo_l / ArcFace

def extract_embedding(image_base64: str) -> list[float] | None:
    return analyze_face(image_base64).embedding  # 512 normalized floats
```

```sql
-- db.py: cosine distance query
SELECT user_id, embedding <=> %s::vector AS distance
FROM face_embeddings
WHERE embedding <=> %s::vector <= 0.5   -- threshold có thể config
ORDER BY distance
LIMIT 1
```

> Cosine distance 0 = giống hệt nhau, 1 = hoàn toàn khác.
> Threshold 0.5 đủ chặt để phân biệt 2 người khác nhau, đủ rộng để chịu thay đổi lighting/góc chụp.

### Fail-closed policy

```
AI service down?
  → FaceServiceClient ném FaceServiceUnavailableException
  → Backend trả FACE_SERVICE_UNAVAILABLE (503)
  → Không đánh dấu face_verified và không lưu embedding thiếu kiểm tra.
```

### Frontend trigger

```
Trường hợp 1 — Trực tiếp:
  Developer vào trang Marketplace → click "Đăng asset"
  MarketplaceItemServiceImpl.createMarketplaceItem()
  → check user.face_verified
  → false → throw AppException(FACE_VERIFY_REQUIRED)  [403]

Trường hợp 2 — Via axios interceptor:
  axios interceptor nhận 403 với code = 'FACE_VERIFY_REQUIRED'
  → window.dispatchEvent(new CustomEvent('face-verify-required'))
  → FaceVerifyContext.useEffect() nghe event → setShowModal(true)
  → FaceVerifyModal hiện ra (webcam)

Tại sao dùng CustomEvent?
  → axios interceptor là plain function, không thể gọi React hook (useState, useContext)
  → CustomEvent là bridge giữa JS thuần và React context
```

### FaceVerifyModal — 4 bước

```
intro     → giải thích lý do + nút "Bắt đầu"
camera    → hiện webcam với oval face guide (dashed amber border)
preview   → ảnh chụp được, nút "Retake" hoặc "Xác nhận gửi"
submitting→ loading spinner
success   → CheckCircle xanh → auto-close 1.5s → gọi onSuccess()
```

### Files

| File | Vai trò |
|---|---|
| `ai-service/main.py` | FastAPI endpoints |
| `ai-service/face_service.py` | decode ảnh, extract 128-dim embedding |
| `ai-service/db.py` | pgvector INSERT, cosine query, DELETE |
| `FaceServiceClient.java` | RestTemplate gọi Python service, fail-open logic |
| `FaceVerifyController.java` | `GET /status`, `POST /api/developer/face-verify` |
| `MarketplaceItemServiceImpl.java` | check `face_verified` trước khi tạo item |
| `FaceVerifyContext.tsx` | Provider nghe CustomEvent, quản lý modal state |
| `FaceVerifyModal.tsx` | Webcam modal 4 bước |
| `faceVerifyApi.ts` | `getStatus()`, `verify(base64)` |
| `axios.ts` | interceptor dispatch CustomEvent khi 403 FACE_VERIFY_REQUIRED |
| `main.tsx` | `<FaceVerifyProvider>` bọc toàn app |

---

## Tier 2 — KYC OCR: Xác minh pháp lý cho hợp đồng

### Mục đích

Trước khi developer ký hợp đồng lần đầu, yêu cầu chụp ảnh CCCD hoặc Hộ chiếu. OCR tự động điền thông tin vào hợp đồng (`sellerRepresentative`, `sellerAddress`). Giảm nhập liệu thủ công và đảm bảo thông tin pháp lý chính xác.

### Luồng

```
[ContractViewerModal — mode="sign-developer"]
  1. Mount → GET /api/developer/kyc/status
     → kyc_verified = false → hiển thị KycOcrModal
     → kyc_verified = true  → auto-fill fullName + address → form ký ngay

[KycOcrModal]
  Step 1: User chọn loại giấy tờ (CCCD / Hộ chiếu)
  Step 2: Upload ảnh
  Step 3: POST /api/developer/kyc/ocr { imageBase64, documentType }
          → Spring Boot gọi Python POST /ocr/document
          → Google Cloud Vision API: TEXT_DETECTION
          → Parse text → trích xuất fields
          → Trả KycOcrResponse { fullName, idNumber, dateOfBirth, address }
  Step 4: User xem, chỉnh sửa nếu OCR nhầm
  Step 5: POST /api/developer/kyc/confirm { documentType, fullName, idNumber, dateOfBirth, address }
          → Lưu vào users table
          → kyc_verified = true, kyc_verified_at = now()
  Step 6: Modal đóng → fields được auto-fill trong form ký hợp đồng
```

### OCR — Google Cloud Vision

```python
# ocr_service.py
from google.cloud import vision

def extract_text_from_image(image_base64: str) -> str:
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=base64.b64decode(image_base64))
    response = client.text_detection(image=image)
    return response.text_annotations[0].description if response.text_annotations else ""
```

### Parse CCCD

```python
def _parse_cccd(raw: str) -> dict:
    # Số CCCD: 12 chữ số liên tiếp
    id_match = re.search(r'\b(\d{12})\b', raw)

    # Họ tên: dòng toàn CHỮ HOA (sau "Họ và tên" hoặc heuristic)
    name_match = re.search(r'(?:Họ và tên[:\s]+)?([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-Ỹ\s]{5,50})', raw)

    # Ngày sinh: DD/MM/YYYY
    dob_match = re.search(r'(\d{2}/\d{2}/\d{4})', raw)

    # Địa chỉ: sau "Nơi thường trú"
    addr_match = re.search(r'Nơi thường trú[:\s]+(.+?)(?=\n[A-Z]|\Z)', raw, re.DOTALL)
```

### Parse Hộ chiếu (MRZ)

```
Hộ chiếu VN có 2 dòng MRZ ở cuối, mỗi dòng 44 ký tự:

Dòng 1: P<VNMHO<<TEN<NGUOI<DUNG<<<<<<<<<<<<<<<<<
         ─── ─── ──────────────────────────────────
         P   VNM  surname<<givenname (< = dấu cách)

Dòng 2: AB1234567<VNM980101M3012318<<<<<<<<<<<<<<8
         ───────── ─── ────── ─ ─────── ─────────
         passport# country YYMMDD sex expiry    check

Parse:
  → Tên: split dòng 1 sau "P<VNM", thay "<" thành " "
  → DOB: dòng 2 ký tự 13-18 (YYMMDD) → DD/MM/YYYY
  → Số hộ chiếu: dòng 2 ký tự 0-8 (9 ký tự)
```

### Database

```sql
-- V18__add_kyc_fields.sql
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_verified      BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS kyc_full_name     TEXT,
    ADD COLUMN IF NOT EXISTS kyc_id_number     TEXT,
    ADD COLUMN IF NOT EXISTS kyc_date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS kyc_address       TEXT,
    ADD COLUMN IF NOT EXISTS kyc_document_type TEXT,
    ADD COLUMN IF NOT EXISTS kyc_verified_at   TIMESTAMPTZ;
```

### Idempotent confirm

```java
// KycController.java — confirmKyc()
if (user.isKycVerified()) {
    return ResponseEntity.ok(ApiResponse.success(toStatusResponse(user), "KYC đã được xác thực trước đó."));
}
// → Gọi nhiều lần không gây lỗi, không ghi đè data đã lưu
```

### KycOcrModal — 4 bước

```
upload     → chọn loại giấy tờ, upload ảnh hoặc kéo thả
processing → spinner "Đang nhận dạng ký tự..."
review     → form 4 fields (fullName, idNumber, dateOfBirth, address) có thể chỉnh sửa
             cảnh báo amber: "Kiểm tra và chỉnh sửa nếu cần"
submitting → spinner "Đang lưu thông tin KYC..."
success    → CheckCircle xanh → auto-close → auto-fill form hợp đồng
```

### Files

| File | Vai trò |
|---|---|
| `ai-service/ocr_service.py` | Google Vision OCR, parse CCCD + Passport |
| `ai-service/main.py` | `POST /ocr/document` endpoint |
| `KycController.java` | `GET /status`, `POST /ocr`, `POST /confirm` |
| `KycOcrRequest.java` | `imageBase64` + `documentType` (cccd/passport) |
| `KycConfirmRequest.java` | 5 fields + validation |
| `KycOcrResponse.java` | Builder response từ OCR |
| `KycStatusResponse.java` | Builder status + all stored fields |
| `User.java` | 7 KYC fields thêm vào entity |
| `kycApi.ts` | `getStatus()`, `ocr()`, `confirm()` |
| `KycOcrModal.tsx` | Upload + review + confirm modal |
| `ContractViewerModal.tsx` | Check KYC on mount, hiện modal, auto-fill fields |

---

## AI Service — Setup & Infrastructure

### Docker Compose

```yaml
# docker-compose.yml
postgres:
  image: pgvector/pgvector:pg16  # PHẢI dùng image này để có pgvector extension
  # KHÔNG dùng postgres:16-alpine (không có pgvector)

ai-service:
  build: ./ai-service
  ports: ["8001:8001"]
  depends_on: [postgres]
  env_file: ./ai-service/.env
```

### Environment

```env
# ai-service/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=godotlaunch
DB_USER=...
DB_PASSWORD=...
ARCFACE_MAX_COSINE_DISTANCE=0.55
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Dockerfile

```dockerfile
FROM python:3.11-slim
# OpenCV runtime + ffmpeg cho xử lý media
RUN apt-get install -y libgl1 libglib2.0-0 ffmpeg
```

> `buffalo_l` được tải vào `INSIGHTFACE_HOME` lần đầu và tái sử dụng từ model cache.

### Google Cloud Vision credentials

```bash
# Tạo service account trong Google Cloud Console
# → IAM → Service Accounts → Create → Role: Cloud Vision API User
# → Keys → Add Key → JSON → tải về

# Mount vào container hoặc set env:
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-vision.json
```

--- 

## Error Codes liên quan

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `INVALID_RECAPTCHA` | 400 | reCAPTCHA token không hợp lệ hoặc hết hạn |
| `FACE_NOT_DETECTED` | 400 | Không phát hiện khuôn mặt trong ảnh (hoặc >1 mặt) |
| `FACE_DUPLICATE` | 409 | Khuôn mặt đã tồn tại trong hệ thống (tài khoản khác) |
| `FACE_VERIFY_REQUIRED` | 403 | Cần xác minh khuôn mặt trước khi thực hiện hành động |

---

## Production checklist

### Tier 0
- [ ] `RECAPTCHA_SECRET_KEY` trong env var, không commit vào code
- [ ] Site Key trong frontend `.env` (public, không sao nếu lộ)

### Tier 1
- [ ] `ARCFACE_MAX_COSINE_DISTANCE` test kỹ với diverse dataset trước khi deploy
- [ ] Face service health check endpoint `/health` được monitor
- [ ] `pgvector/pgvector:pg16` image cho postgres (không phải `postgres:16-alpine`)
- [ ] Xem xét tăng `ivfflat lists` khi DB > 10,000 embeddings

### Tier 2
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` mounted vào ai-service container
- [ ] Giới hạn Vision API quota để tránh bill đột biến
- [ ] Không lưu ảnh gốc CCCD/Passport vào DB (chỉ lưu text đã parse)
- [ ] OCR kết quả cho user confirm trước khi lưu — không tự động save raw OCR
