# CLAUDE.md — GodotLaunch AI Context File

> Đọc file này đầu tiên trước khi làm bất kỳ task nào trong repo này.
> Mục đích: giúp AI đọc hiểu nhanh project, tránh tốn context vào việc khám phá lại từ đầu.

---

## 1. Project tổng quan

**GodotLaunch** — nền tảng cho cộng đồng Godot Engine developers:
- Developers submit game → admin duyệt → ký hợp đồng (full acquisition / co-publishing) → publish lên Google Play / App Store
- Developers bán source code & asset trên Marketplace nội bộ
- Community chat, review, wishlist

**Tech stack:**
| Layer | Stack |
|---|---|
| Backend | Spring Boot 4.0.6, Java 21, PostgreSQL 16 |
| Frontend | React 19 + TypeScript + Tailwind v4 |
| DB Migration | Flyway (V1–V14) |
| Storage | AWS S3 + SeaweedFS (dynamic, admin-configured) |
| Auth | JWT + Google OAuth + GitHub OAuth |
| Realtime | WebSocket (Spring Messaging) |

---

## 2. Cấu trúc repo

```
go-dot-launch-capstone-fptu/
├── backend/                         Spring Boot API
│   └── src/main/java/com/godotlaunch/backend/
│       ├── controller/              REST endpoints
│       ├── service/                 Business logic (interface + impl/)
│       ├── repository/              JPA repositories
│       ├── entity/                  JPA entities
│       │   └── enums/               Java enums
│       ├── dto/
│       │   ├── request/             Input DTOs
│       │   └── response/            Output DTOs
│       ├── config/                  Spring configs (AWS, WebSocket, OpenAPI)
│       ├── security/                JWT filter, EncryptionUtils
│       └── exception/               GlobalExceptionHandler
│   └── src/main/resources/
│       ├── application.yaml         Config (dùng env vars)
│       └── db/migration/            Flyway SQL files V1–V14
├── frontend/                        React SPA
│   └── src/
│       ├── page/                    Màn hình chính (AdminPage, GamePage, ...)
│       ├── components/              UI components tái sử dụng
│       ├── api/                     Axios API clients (axiosInstance + per-domain)
│       ├── types/                   TypeScript interfaces
│       └── hooks/                   Custom React hooks
├── docs/
│   ├── awsS3AndSeaweedfs.md         Setup AWS S3 + SeaweedFS, admin config guide
│   ├── githubOauth.md               GitHub OAuth setup, repo verify flow
│   ├── jwt-session-pattern.md       Revocable JWT: sessionSecret + SHA-256 DB + httpOnly cookie
│   └── face-kyc-security.md         Tier 0/1/2 identity: reCAPTCHA + Face verify + KYC OCR
├── docker-compose.seaweedfs.yml     Local SeaweedFS (master:9333, volume:8081)
├── CLAUDE.md                        File này
├── README.md                        Tổng quan dự án
└── WIKI.md                          Wiki kỹ thuật chi tiết
```

---

## 3. Database — 27 + 3 bảng (V1–V14)

**Nhóm Identity:** `roles`, `users`
**Nhóm Content:** `categories`, `tags`, `game_tags`
**Nhóm Game:** `games`, `game_versions`, `media_files`, `ai_reports`
**Nhóm Legal/Finance:** `contracts`, `wallets`, `transactions`, `orders`, `withdrawal_requests`
**Nhóm Marketplace:** `marketplace_items`, `cart_items`, `favorites`
**Nhóm Community:** `reviews`, `community_chats`
**Nhóm Download:** `source_downloads`, `store_download_stats`
**Nhóm Security:** `user_ip_logs`, `banned_ips`
**Nhóm Operations:** `audit_logs`, `notifications`, `external_publishes`
**Nhóm Storage (V14):** `storage_accounts`, `storage_buckets`, `storage_routing`

**Quan trọng về migration:**
- `ddl-auto: validate` — KHÔNG dùng `update`
- `repair-on-migrate: true` — tự sửa checksum mismatch
- Thêm bảng mới → luôn tạo file `V{n}__tên.sql` mới, KHÔNG sửa V1

---

## 4. Storage System (V14 — Dynamic)

Admin configure storage qua UI, không hardcode credentials:

```
storage_accounts  → provider (aws_s3 | seaweedfs) + config (AES-256 encrypted JSON)
storage_buckets   → thuộc account, có name + region/publicUrl
storage_routing   → file_type (PK) → bucket_id (mỗi loại file assign 1 bucket)
```

**FileType enum:** `avatar`, `thumbnail`, `pdf_contract`, `game_zip`, `source_code_zip`, `screenshot`, `video`, `asset`

**Upload flow:**
```java
storageRouter.upload(FileType.avatar, file, "avatars")
→ query storage_routing → decrypt config → build adapter → upload
```

**Adapters:**
- `AwsS3Adapter` — config: `{bucket, region, accessKey, secretKey}`
- `SeaweedFsAdapter` — config: `{masterUrl, publicBaseUrl}` — upload 2 bước: POST `/dir/assign` → PUT fid

**Cache:** StorageRouter cache adapter 60s trong memory. Sau khi admin thay routing → `clearCache()` được gọi tự động.

**Lưu ý:** GameService, MarketplaceItemService vẫn dùng `AwsS3Service` trực tiếp vì cần presigned URL (tính năng chỉ có S3).

---

## 5. Authentication

- JWT Bearer token — `Authorization: Bearer <token>`
- Google OAuth: POST `/api/auth/google` với Google ID token
- GitHub OAuth: POST `/api/auth/github` với auth code
- Admin endpoints: `@PreAuthorize("hasRole('admin')")`
- `EncryptionUtils`: AES-256 ECB — dùng encrypt GitHub token, storage config, bank account

**Env vars cần thiết:**
```
DB_URL, DB_USERNAME, DB_PASSWORD
AWS_S3_BUCKET, AWS_S3_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY
MAIL_USERNAME, MAIL_PASSWORD
ENCRYPTION_KEY
GOOGLE_CLIENT_ID
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
FRONTEND_URL
```

---

## 6. Frontend — quy tắc quan trọng

- **API calls:** dùng instance từ `src/api/axios.ts` (đã gắn JWT interceptor)
- **Per-domain API file:** `gameApi.ts`, `storageApi.ts`, `userApi.ts`, ... — KHÔNG gọi axios trực tiếp trong component
- **Response wrapper:** `ApiResponse<T>` — kiểm tra `res.success` trước khi dùng `res.data`
- **Styling:** Tailwind v4 — class-based, không dùng CSS modules
- **State:** useState local — không có global state manager (Redux/Zustand chưa dùng)
- **Icons:** lucide-react

---

## 7. Các pattern quan trọng cần biết

### Backend response
```java
ResponseEntity.ok(ApiResponse.success(data, "message"))
ResponseEntity.ok(ApiResponse.error("message"))
```

### Thêm endpoint mới
1. Tạo DTO request/response
2. Thêm method vào Service interface
3. Implement trong `impl/`
4. Thêm endpoint trong Controller với `@Operation` Swagger
5. Nếu cần bảng mới → tạo `V{n}__tên.sql`

### Flyway rule
- KHÔNG sửa file V đã tồn tại (gây checksum error)
- Nếu sửa schema → tạo file V mới ALTER TABLE
- `repair-on-migrate: true` chỉ fix sau khi đã xóa record trong `flyway_schema_history`

---

## 8. Files quan trọng nhất

| File | Vai trò |
|---|---|
| `V1__init_schema.sql` | Toàn bộ schema gốc — 27 bảng |
| `application.yaml` | Config Spring Boot — dùng env vars |
| `StorageRouter.java` | Điểm vào upload file — dispatch đến S3/SeaweedFS |
| `AdminStorageController.java` | CRUD accounts/buckets/routing |
| `AdminPage.tsx` | Admin UI — 5 tab kể cả Storage |
| `AdminStoragePanel.tsx` | UI 3 tab: Accounts, Buckets, Routing kéo-thả |
| `storageApi.ts` | API client cho storage management |

---

## 9. Những việc KHÔNG làm

- KHÔNG thay `ddl-auto: validate` thành `update`
- KHÔNG sửa Flyway migration files đã chạy
- KHÔNG commit credentials vào code
- KHÔNG trả `config` field (encrypted credentials) trong storage API response
- KHÔNG thêm `ObjectCannedACL.PUBLIC_READ` khi upload S3 (ACL bị disable, dùng Bucket Policy)
- KHÔNG dùng `axios` trực tiếp trong component — dùng qua `api/` layer
