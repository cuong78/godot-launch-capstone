# WIKI — GodotLaunch Technical Reference

> Tài liệu kỹ thuật chi tiết. Cập nhật mỗi khi có thay đổi kiến trúc lớn.
> Đọc nhanh → [CLAUDE.md](CLAUDE.md). Chạy project → [README.md](README.md).

---

## Mục lục

1. [Kiến trúc tổng thể](#1-kiến-trúc-tổng-thể)
2. [Database Schema](#2-database-schema)
3. [Storage System](#3-storage-system)
4. [Authentication & Security](#4-authentication--security)
5. [API Reference](#5-api-reference)
6. [Luồng nghiệp vụ chính](#6-luồng-nghiệp-vụ-chính)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Flyway Migration Guide](#8-flyway-migration-guide)
9. [Environment Variables](#9-environment-variables)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Kiến trúc tổng thể

```
[React SPA]  <--HTTP/WS-->  [Spring Boot API]  <--JDBC-->  [PostgreSQL 16]
                                    |
                            [Storage Service]
                                    |
                               [SeaweedFS]
                           \              /
                     [EncryptionUtils AES-256]
                     (credentials encrypted in DB)
```

**Nguyên tắc thiết kế:**
- API stateless — JWT không lưu session server-side
- Storage pluggable — thêm provider mới không cần sửa business code
- Migration-first — mọi thay đổi schema qua Flyway, không dùng `ddl-auto: update`
- Credentials encrypted — GitHub token, storage config, bank account đều mã hóa AES-256 trước khi lưu DB

---

## 2. Database Schema

### 27 bảng gốc (V1) + 3 bảng storage (V14)

#### Nhóm Identity
| Bảng | Mô tả |
|---|---|
| `roles` | Roles: admin, developer, customer |
| `users` | Người dùng — hỗ trợ GitHub OAuth, lưu token encrypted |

**users — trường quan trọng:**
- `github_id`, `github_username`, `github_token_enc` — bắt buộc có GitHub để bán source code
- `status`: active / inactive / banned
- `avatar_url`: URL từ storage provider (SeaweedFS)

#### Nhóm Game
| Bảng | Mô tả |
|---|---|
| `games` | Game chính — `publishing_type`: full_acquisition / co_publishing / marketplace_listing |
| `game_versions` | Lịch sử phiên bản — `is_current` đánh dấu bản hiện tại |
| `media_files` | Ảnh/video — dùng chung cho game VÀ marketplace_item (game_id XOR marketplace_item_id) |
| `ai_reports` | AI phân tích từng game_version_id — UNIQUE per version |

**game.publishing_type:**
- `full_acquisition` → bán đứt toàn bộ quyền → ký contract → publish lên store ngoài
- `co_publishing` → chia % doanh thu → ký contract → publish lên store ngoài
- `marketplace_listing` → đăng source code lên marketplace nội bộ — KHÔNG tạo contract

#### Nhóm Legal / Finance
| Bảng | Mô tả |
|---|---|
| `contracts` | Chỉ tạo cho full_acquisition và co_publishing — có PDF URL, chữ ký timestamp |
| `wallets` | 1 user 1 wallet — balance USD |
| `transactions` | Mọi giao dịch — CHECK `net_amount = amount - platform_commission` |
| `orders` | Mua marketplace item — UNIQUE(buyer_id, marketplace_item_id) |
| `withdrawal_requests` | Rút tiền về ngân hàng — admin duyệt thủ công |

#### Nhóm Marketplace
| Bảng | Mô tả |
|---|---|
| `marketplace_items` | Source code & asset — `item_type`: source_code / asset |
| `cart_items` | Giỏ hàng |
| `favorites` | Wishlist game |

**marketplace_items constraints:**
- `item_type = source_code` bắt buộc: `godot_version` + `github_repo_url` + `github_verified_at`
- Source code phải thuộc GitHub repo của seller (verify trước khi INSERT)

#### Nhóm Security & Operations
| Bảng | Mô tả |
|---|---|
| `user_ip_logs` | Log IP các action quan trọng (register, login, upload...) |
| `banned_ips` | Danh sách IP bị chặn — `expires_at NULL` = vĩnh viễn |
| `audit_logs` | IMMUTABLE — REVOKE UPDATE/DELETE. `actor_id NULL` = AI/system |
| `notifications` | Thông báo in-app |

#### Nhóm Storage (V14)
| Bảng | Mô tả |
|---|---|
| `storage_accounts` | SeaweedFS account — `config` encrypted JSON |
| `storage_buckets` | Bucket thuộc account — `public_url` (SeaweedFS) |
| `storage_routing` | `file_type` (PK) → `bucket_id` — 1 loại file chỉ assign 1 bucket |

---

## 3. Storage System

### Tại sao cần dynamic storage?

Yêu cầu: admin tự add/switch provider để tối ưu chi phí (SeaweedFS free, self-hosted), không cần redeploy app.

### Kiến trúc Storage Router

```
Upload request
    |
StorageRouter.upload(FileType, file, prefix)
    |
query storage_routing WHERE file_type = ?
    |
StorageBucket --> StorageAccount
    |
decrypt config (AES-256)
    |
build adapter (cache 60s)
        |
SeaweedFsAdapter
```

### Config JSON theo provider

**SeaweedFS:**
```json
{ "masterUrl": "http://localhost:9333", "publicBaseUrl": "http://localhost:8081" }
```

### SeaweedFS upload flow
```
1. POST masterUrl/dir/assign  --> { "fid": "3,01637037d6", "url": "127.0.0.1:8081" }
2. PUT http://127.0.0.1:8081/3,01637037d6  (multipart file)
3. Public URL = publicBaseUrl/3,01637037d6
```

### FileType enum
`avatar`, `thumbnail`, `pdf_contract`, `game_zip`, `source_code_zip`, `screenshot`, `video`, `asset`

### Admin API Endpoints

```
GET    /api/admin/storage/accounts           Danh sách accounts (không trả config)
POST   /api/admin/storage/accounts           Tạo account (encrypt config trước save)
PUT    /api/admin/storage/accounts/{id}      Cập nhật + clearCache
DELETE /api/admin/storage/accounts/{id}      Xóa cascade buckets + routing

GET    /api/admin/storage/buckets            Danh sách buckets
POST   /api/admin/storage/buckets            Tạo bucket
DELETE /api/admin/storage/buckets/{id}       Xóa + clearCache

GET    /api/admin/storage/routing            Config routing hiện tại
GET    /api/admin/storage/routing/file-types Danh sách FileType
PUT    /api/admin/storage/routing            Update 1 routing
PUT    /api/admin/storage/routing/batch      Update nhiều routing 1 lần (drag & drop)
```

Tất cả yêu cầu `@PreAuthorize("hasRole('admin')")`.

---

## 4. Authentication & Security

### JWT Flow
```
POST /api/auth/signin --> { token, user }
Header: Authorization: Bearer <token>
Filter: JwtAuthenticationFilter --> SecurityContext
```

### OAuth
- **Google:** client gửi `id_token` → backend verify với Google API → tạo/link user
- **GitHub:** client gửi `code` → backend exchange lấy access token → verify profile

### EncryptionUtils
AES-256 ECB với key từ `app.security.encryption-key` env var. Dùng cho:
- `users.github_token_enc` — GitHub OAuth access token
- `storage_accounts.config` — Credentials SeaweedFS
- `withdrawal_requests.bank_account` — Số tài khoản ngân hàng

### Role-based access
| Role | Quyền |
|---|---|
| `admin` | Toàn quyền — duyệt game, manage users, config storage |
| `developer` | Submit game, sell source code, marketplace |
| `customer` | Mua marketplace items, wishlist, review |

---

## 5. API Reference

### Auth
```
POST /api/auth/signup          Đăng ký
POST /api/auth/signin          Đăng nhập --> JWT
POST /api/auth/google          Google OAuth
POST /api/auth/github          GitHub OAuth
POST /api/auth/avatar          Upload avatar (multipart)
POST /api/auth/forgot-password Gửi OTP
POST /api/auth/reset-password  Đặt lại mật khẩu
```

### Game
```
GET    /api/games               Danh sách game (filter: status, category)
GET    /api/games/{id}          Chi tiết game
POST   /api/games               Tạo game (developer)
PUT    /api/games/{id}          Cập nhật game
POST   /api/admin/games/{id}/approve  Duyệt (admin)
POST   /api/admin/games/{id}/reject   Từ chối (admin)
```

### Marketplace
```
GET    /api/marketplace              Danh sách items
POST   /api/marketplace              Tạo listing
GET    /api/marketplace/{id}         Chi tiết item
PUT    /api/marketplace/{id}/approve Duyệt (admin)
PUT    /api/marketplace/{id}/reject  Từ chối (admin)
```

### Contract
```
POST   /api/contracts/offer          Admin tạo đề nghị hợp đồng
PUT    /api/contracts/{id}/sign      Developer ký
PUT    /api/contracts/{id}/sign-admin Admin ký đối ứng
GET    /api/contracts                Danh sách hợp đồng
```

---

## 6. Luồng nghiệp vụ chính

### 6.1 Game Submission → Contract → Publish

```
Developer submit game (status: draft --> pending)
    |
AI Report tự động (quality_score, security_status, recommendation)
    |
Admin duyệt (AdminPage > Moderation tab)
    |
[marketplace_listing] --> approve trực tiếp --> status: published
[full_acquisition / co_publishing]:
    Admin soạn contract offer --> PDF --> status: pending
    |
    Developer ký (chữ ký số base64) --> signed_at_seller
    |
    Admin ký đối ứng --> signed_at_buyer --> status: signed
    |
    Game status: approved --> external_publishes record
    |
    Submit lên Google Play / App Store
```

### 6.2 Marketplace Purchase

```
Browse marketplace --> add to cart
    |
Checkout --> Order + Transaction
    |
net_amount = price - platform_commission (CHECK constraint)
    |
Seller wallet += net_amount, Platform += commission
    |
Buyer download (source_downloads — không unique, tải lại được)
    |
Buyer review (verified buyer — order_id bắt buộc)
```

### 6.3 Admin Config Storage (V14)

```
Admin --> AdminPage --> Storage tab
    |
Tạo Storage Account (JSON config) --> backend encrypt --> lưu DB
    |
Tạo Bucket (chọn account, nhập tên/region)
    |
Routing tab: drag FileType --> drop vào Bucket zone --> "Lưu N thay đổi"
    |
PUT /api/admin/storage/routing/batch --> StorageRouter.clearCache()
    |
Upload tiếp theo dùng config mới
```

---

## 7. Frontend Architecture

### Cấu trúc src/

```
src/
├── api/
│   ├── axios.ts           Axios instance -- JWT interceptor
│   ├── authApi.ts
│   ├── gameApi.ts
│   ├── contractApi.ts
│   ├── marketplaceApi.ts
│   ├── userApi.ts
│   └── storageApi.ts      Storage management (V14)
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── SignaturePad.tsx
│   ├── ContractViewerModal.tsx
│   └── AdminStoragePanel.tsx   3-tab storage UI (Accounts, Buckets, Routing)
├── page/
│   ├── AdminPage.tsx      5 tabs: Moderation, Users, Logs, Settings, Storage
│   ├── GamePage.tsx
│   ├── MarketplacePage.tsx
│   └── ...
├── types/index.ts         TypeScript interfaces
└── hooks/
```

### API response pattern

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

const res = await storageApi.listAccounts();
if (res.success) setAccounts(res.data);
```

### Storage UI — Drag & Drop pattern

```typescript
// Staged changes local -- chưa save ngay
const [pendingRouting, setPendingRouting] = useState<Record<string, string>>();
// fileType --> bucketId

// Effective = DB routing bị override bởi pending
const getEffectiveRouting = (ft) =>
  pendingRouting[ft] ? lookup bucket : DB routing[ft]

// Batch save tất cả pending 1 lần
PUT /api/admin/storage/routing/batch --> clear pending --> reload
```

---

## 8. Flyway Migration Guide

### Rules bắt buộc

1. **KHÔNG sửa file V đã tồn tại** — gây `FlywayException: checksum mismatch`
2. **Schema mới** → tạo `V{n+1}__mô_tả.sql`
3. **`ddl-auto: validate`** — Hibernate chỉ verify, không tự sửa
4. **`repair-on-migrate: true`** — tự fix checksum sau emergency edit

### Khi migration fail

```sql
-- Xem lịch sử
SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;

-- Xóa record lỗi để chạy lại
DELETE FROM flyway_schema_history WHERE version = '14';
```

### Migration V1–V14 tóm tắt

| File | Nội dung |
|---|---|
| V1 | Schema gốc 27 bảng, enums, indexes |
| V2 | community_chats, reactions, tags |
| V3 | game_media table |
| V4–V6 | Contract fields & status values |
| V7–V8 | Role rebrand + customer role |
| V9 | notifications + chat_messages |
| V10–V11 | Marketplace status, asset categories |
| V12–V13 | Fix notifications schema |
| V14 | storage_accounts + storage_buckets + storage_routing |

---

## 9. Environment Variables

| Var | Mô tả |
|---|---|
| `DB_URL` | JDBC URL PostgreSQL |
| `DB_USERNAME` / `DB_PASSWORD` | DB credentials |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Gmail SMTP |
| `ENCRYPTION_KEY` | AES-256 key (32 chars) |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `FRONTEND_URL` | CORS origin |



---

## 10. Troubleshooting

### Flyway checksum mismatch
```
Caused by: org.flywaydb.core.api.exception.FlywayValidateException
```
`repair-on-migrate: true` đã set — tự sửa khi khởi động. Nếu vẫn fail:
```sql
DELETE FROM flyway_schema_history WHERE version = 'X';
```

### Schema validation: missing column
DB còn schema cũ. Tạo migration mới ALTER TABLE, hoặc drop & recreate qua Flyway.



### StorageRouter: "No storage routing configured"
Admin chưa tạo Account → Bucket → Routing. Vào AdminPage → Storage tab.

### SeaweedFS không kết nối
```bash
docker ps | grep seaweedfs
curl http://localhost:9333/dir/status
docker-compose -f docker-compose.seaweedfs.yml up -d
```
