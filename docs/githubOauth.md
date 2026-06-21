# GitHub OAuth — Setup Guide

GitHub OAuth trong GodotLaunch dùng cho 2 mục đích:
1. **Đăng nhập** — user login bằng tài khoản GitHub
2. **Verify source code ownership** — bắt buộc khi bán source code trên Marketplace (chứng minh repo thuộc về mình)

---

## 1. Tạo GitHub OAuth App

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Điền thông tin:

| Field | Giá trị |
|---|---|
| Application name | GodotLaunch |
| Homepage URL | `http://localhost:5173` (dev) hoặc domain thật |
| Authorization callback URL | `http://localhost:5173/auth/github/callback` |

3. Click **Register application**
4. Lấy **Client ID** và generate **Client Secret**

---

## 2. Env vars cần thiết

```bash
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=abc123...
```

Thêm vào file `.env` hoặc set trước khi chạy backend.

---

## 3. Luồng OAuth trong project

### 3.1 Đăng nhập bằng GitHub

```
Frontend: redirect user đến
  https://github.com/login/oauth/authorize?client_id=CLIENT_ID&scope=read:user,user:email

GitHub redirect về: /auth/github/callback?code=TEMP_CODE

Frontend gửi code lên backend:
  POST /api/auth/github
  Body: { "code": "TEMP_CODE" }

Backend:
  1. Exchange code → access token
     POST https://github.com/login/oauth/access_token
  2. Lấy profile user
     GET https://api.github.com/user (Authorization: token ACCESS_TOKEN)
  3. Tạo hoặc link user trong DB
  4. Trả JWT token về frontend
```

### 3.2 Verify Repo Ownership (Marketplace)

Khi developer upload source code, họ phải cung cấp GitHub repo URL. Backend verify:

```
1. Lấy github_token_enc từ users table → decrypt AES-256
2. GET https://api.github.com/repos/{owner}/{repo}
   Authorization: token DECRYPTED_TOKEN
3. Kiểm tra response.owner.login === users.github_username
4. Kiểm tra KHÔNG phải fork (response.fork === false)
5. Nếu pass → set github_verified_at = NOW()
```

---

## 4. Database fields liên quan

Trong bảng `users`:

| Column | Type | Mô tả |
|---|---|---|
| `github_id` | VARCHAR(50) UNIQUE | GitHub user ID (số, không đổi) |
| `github_username` | VARCHAR(100) | GitHub login name |
| `github_token_enc` | TEXT | OAuth access token — mã hóa AES-256 |
| `github_linked_at` | TIMESTAMPTZ | Thời điểm link GitHub |

**Constraint:** Nếu `github_id IS NOT NULL` thì `github_username`, `github_token_enc`, `github_linked_at` đều phải có giá trị.

**User chưa link GitHub** — vẫn dùng được platform nhưng:
- Không bán source code trên Marketplace
- Không được tạo `marketplace_items` với `item_type = 'source_code'`

---

## 5. Config trong application.yaml

```yaml
app:
  security:
    oauth:
      github:
        client-id: ${GITHUB_CLIENT_ID}
        client-secret: ${GITHUB_CLIENT_SECRET}
```

Controller liên quan: `GitHubAuthController.java` — xử lý callback và token exchange.

---

## 6. Scope cần thiết

| Scope | Lý do |
|---|---|
| `read:user` | Lấy profile (id, username, avatar) |
| `user:email` | Lấy email (email có thể private trên GitHub) |

Không cần `repo` scope — chỉ cần đọc public repo metadata để verify ownership.

---

## 7. Lưu ý bảo mật

- **Token luôn được encrypt** trước khi lưu DB: `encryptionUtils.encrypt(accessToken)`
- **Không log token** — chỉ log `github_id` khi cần debug
- Token lưu DB dùng để verify repo sau này, không phải để thao tác repo
- Nếu user revoke GitHub app access → token hết hiệu lực → verify repo fail → cần re-link

---

## 8. Re-link GitHub (khi token hết hạn)

```
User vào Settings → Link GitHub → OAuth flow lại từ đầu
Backend: UPDATE users SET github_token_enc = encrypt(newToken), github_linked_at = NOW()
         WHERE id = currentUserId
```
