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
| Homepage URL | `http://localhost:3000` (frontend dev) hoặc domain thật |
| Authorization callback URL | `http://localhost:8080/api/v1/auth/github/callback` |

> ⚠️ **Callback URL trỏ về BACKEND (8080), KHÔNG phải frontend.**
> GitHub redirect về backend → backend xử lý code → tạo JWT → redirect về frontend.
> Callback URL phải khớp CHÍNH XÁC với `GITHUB_REDIRECT_URI`, nếu không GitHub từ chối.

3. Click **Register application**
4. Lấy **Client ID** và generate **Client Secret**

---

## 2. Env vars cần thiết

```bash
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=abc123...
GITHUB_REDIRECT_URI=http://localhost:8080/api/v1/auth/github/callback
FRONTEND_URL=http://localhost:3000
```

Thêm vào file `.env` hoặc set trước khi chạy backend.

> - `GITHUB_REDIRECT_URI` — callback về **backend**, khớp với GitHub OAuth App settings.
> - `FRONTEND_URL` — nơi backend redirect về **sau khi** xử lý OAuth xong (kèm JWT).
>   Frontend dev chạy port **3000**.

---

## 3. Luồng OAuth trong project

### 3.1 Đăng nhập bằng GitHub

```
Backend xử lý OAuth (backend-handled callback):

1. Frontend gọi backend lấy authorize URL → redirect user đến:
   https://github.com/login/oauth/authorize
     ?client_id=CLIENT_ID
     &scope=user:email%20repo          ← repo: clone private repo
     &redirect_uri=http://localhost:8080/api/v1/auth/github/callback

2. GitHub redirect THẲNG về BACKEND:
   GET /api/v1/auth/github/callback?code=TEMP_CODE&state=...

3. Backend (GitHubOAuthServiceImpl.handleCallback):
   a. Verify state (CSRF)
   b. Exchange code → access token
   c. GET https://api.github.com/user → profile
   d. Encrypt token (AES-256) → lưu github_token_enc
   e. Tạo/link user + generate JWT
   f. Redirect về frontend (FRONTEND_URL) kèm token
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

## 6. Scope OAuth (login) — chỉ `user:email`

| Scope | Lý do |
|---|---|
| `user:email` | Lấy email + profile khi login GitHub |

OAuth login **KHÔNG** xin scope `repo` (token rộng, rủi ro). Việc clone repo private
dùng **mô hình bot** riêng (mục 7).

---

## 7. Clone repo — mô hình Bot (Machine User)

Publish đã bỏ upload game.zip → hệ thống BUỘC phải pull code từ repo. Cách lấy code:

```
PUBLIC repo  → clone thẳng, không cần token
PRIVATE repo → developer mời BOT vào repo → bot accept invitation → clone bằng bot token
```

### Vì sao không tự gọi API thêm bot vào repo?
GitHub yêu cầu **quyền admin trên repo** để thêm collaborator. Bot chưa có quyền gì
trên repo private của user → KHÔNG thể tự thêm mình (vòng gà-trứng). Chỉ **owner (user)**
mới mời được → frontend hướng dẫn user tự mời + deep link tới
`https://github.com/{owner}/{repo}/settings/access`.

### Luồng bot (không cần email admin)
```
1. User submit repo private → backend checkAccess() → PRIVATE_NO_ACCESS
   → 403 REPO_NEEDS_BOT → frontend hiện modal mời bot
2. User mời godotlaunch-bot (quyền Read) trên GitHub
   → GitHub tạo invitation gửi tới bot account
3. User bấm "Tôi đã mời bot"
   → backend dùng BOT TOKEN:
     GET  /user/repository_invitations        (tìm invitation)
     PATCH /user/repository_invitations/{id}   (tự accept)
   → bot thành collaborator → clone repo private được
4. Frontend tự submit lại → clone + scan + snapshot
```

> ✅ **Không cần email admin** — bot tự accept invitation qua API. Hoàn toàn tự động.

### Setup bot account
```bash
# 1. Tạo 1 GitHub account riêng làm bot, vd: godotlaunch-bot
# 2. Generate Personal Access Token (classic), scope: repo
# 3. Thêm vào backend/.env:
GITHUB_BOT_USERNAME=godotlaunch-bot
GITHUB_BOT_TOKEN=ghp_xxxxxxxxxxxx
```

### Files liên quan
| File | Vai trò |
|---|---|
| `GitHubRepoServiceImpl.java` | `checkAccess`, `acceptBotInvitation`, `getCloneToken` |
| `GameServiceImpl.submitGameRepo` | checkAccess → REPO_NEEDS_BOT nếu private chưa cấp quyền |
| `GameController` | `GET /github-bot`, `POST /accept-bot` |
| `BotInviteModal.tsx` | Modal hướng dẫn mời bot + deep link |
| `application.yaml` | `bot-username`, `bot-token` |

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
