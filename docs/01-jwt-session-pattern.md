# 01. JWT Session Pattern — Revocable Token + httpOnly Cookie

GodotLaunch dùng pattern nâng cao kết hợp 3 kỹ thuật: **sessionSecret trong JWT**, **SHA-256 hash lưu DB**, và **httpOnly cookie double-store**.

---

## Tại sao không dùng JWT thuần (stateless)?

JWT thuần stateless có 1 vấn đề lớn: **không thể revoke**.

```
User bị ban lúc 10:00
JWT hết hạn lúc 11:00
→ User vẫn dùng được hệ thống đến 11:00 dù đã bị ban ✗
```

Pattern này giải quyết bằng cách thêm 1 bước verify phía DB.

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                        LOGIN                            │
│                                                         │
│  1. Tạo sessionSecret = UUID.randomUUID()               │
│  2. SHA-256(sessionSecret) → lưu vào users.session_hash │
│  3. Nhúng sessionSecret (plain) vào JWT payload          │
│  4. Ký JWT bằng HMAC-SHA256 secret key                  │
│  5. Trả JWT qua:                                        │
│     ├── Response body → frontend lưu localStorage       │
│     └── httpOnly cookie "app_token"                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   MỖI REQUEST                           │
│                                                         │
│  Token đến từ:                                          │
│  ├── Authorization: Bearer <token>  (SPA)               │
│  └── Cookie: app_token=<token>      (SSR / fallback)    │
│                                                         │
│  Verify 2 bước:                                         │
│  Step 1: Kiểm tra chữ ký JWT (HMAC) + expiration        │
│  Step 2: SHA-256(sessionSecret từ JWT)                  │
│          == users.session_hash trong DB?                 │
│          ✓ Khớp → cho qua                               │
│          ✗ Không khớp → 401 Unauthorized                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                       LOGOUT                            │
│                                                         │
│  1. Xóa users.session_hash = NULL                       │
│  2. Clear httpOnly cookie (Max-Age: 0)                  │
│  3. Frontend xóa localStorage                           │
│  → Token cũ không còn match DB → bị revoke ngay ✓      │
└─────────────────────────────────────────────────────────┘
```

---

## JWT Payload structure

```json
{
  "sub": "user@example.com",
  "userId": "uuid-...",
  "role": "admin",
  "sessionSecret": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1750000000,
  "exp": 1750086400
}
```

> `sessionSecret` là plain text trong payload — JWT được ký nên client không sửa được. Server chỉ lưu `SHA-256(sessionSecret)` trong DB, không bao giờ lưu plain secret.

---

## Database

```sql
-- V15__add_session_hash.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_hash TEXT DEFAULT NULL;
```

| Column | Type | Ý nghĩa |
|---|---|---|
| `session_hash` | TEXT | SHA-256(sessionSecret), NULL = đã logout |

---

## httpOnly Cookie vs localStorage

| | localStorage | httpOnly Cookie |
|---|---|---|
| JavaScript đọc được | ✅ | ❌ |
| Tự động gửi theo request | ❌ | ✅ |
| Bị XSS đánh cắp | ✅ (nguy hiểm) | ❌ (an toàn) |
| Dùng cho | SPA Bearer header | SSR / fallback |

**Double-store** = lưu cả 2 nơi để hỗ trợ:
- **SPA** (React): đọc từ localStorage → gắn `Authorization: Bearer`
- **SSR** hoặc request không có JS: browser tự gửi cookie → server đọc từ `Cookie: app_token`

```
Kiểm tra trong DevTools Console:
  document.cookie   → '' (trống — httpOnly không hiện)
  localStorage.getItem('godotlaunch_token')  → JWT string

Kiểm tra trong DevTools → Application → Cookies:
  app_token = <JWT>   (hiện ở đây vì browser thấy cookie)
```

---

## Revoke ngay lập tức

```
Tình huống: Admin ban user lúc 10:00, JWT hết hạn 11:00

Cách cũ (stateless JWT):
  10:00 - Ban → không làm gì được với token
  10:30 - User gọi API → JWT còn hạn → VẪN QUA ✗

Pattern mới:
  10:00 - Ban → set session_hash = NULL trong DB
  10:00 - User gọi API → JWT hợp lệ nhưng hash không match → 401 ✓
```

**Các trường hợp revoke tự động:**
- Logout → `session_hash = NULL`
- Login mới → `session_hash` thay đổi → token cũ invalid
- Admin ban user → service xóa `session_hash`

---

## Files liên quan

| File | Vai trò |
|---|---|
| `V15__add_session_hash.sql` | Migration thêm cột `session_hash` |
| `JwtProvider.java` | Generate JWT với `sessionSecret`, method `hashSessionSecret()` |
| `JwtAuthenticationFilter.java` | Verify 2 bước: chữ ký + DB hash; đọc từ Bearer hoặc cookie |
| `AuthServiceImpl.java` | `buildSessionResponse()` tạo session, `logout()` revoke |
| `AuthController.java` | Set/clear httpOnly cookie tại login/logout endpoints |
| `axios.ts` | `withCredentials: true` để gửi cookie; Bearer từ localStorage |
| `authApi.ts` | `logout()` gọi `POST /api/auth/logout` |

---

## Verify bằng DevTools (học thực tế)

```javascript
// 1. Decode JWT hiện tại
const token = localStorage.getItem('godotlaunch_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
// → thấy sessionSecret trong payload

// 2. Kiểm tra cookie
document.cookie;
// → '' (trống — httpOnly không cho JS đọc)
// Nhưng vào DevTools → Application → Cookies → thấy app_token

// 3. Sau khi logout
// → localStorage xóa token
// → Cookie app_token bị clear (Max-Age: 0)
// → users.session_hash = NULL trong DB
// → Token cũ gọi API → 401
```

---

## Production checklist

- [ ] `cookie.setSecure(true)` khi deploy HTTPS
- [ ] `cookie.setSameSite("Strict")` để chống CSRF
- [ ] JWT secret key đưa vào env var (không hardcode)
- [ ] Xem xét Refresh Token riêng cho "Remember Me" 30 ngày
