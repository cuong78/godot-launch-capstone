# GodotLaunch

Nền tảng dành cho cộng đồng **Godot Engine** — giúp developers submit game, bán source code & asset, ký hợp đồng phát hành, và tương tác cộng đồng.

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| Game Submission | Developer nộp game → AI report → Admin duyệt |
| Hợp đồng phát hành | Full acquisition hoặc Co-publishing với chữ ký số |
| Marketplace | Mua bán source code Godot & asset pack |
| Community | Chat cộng đồng, review, wishlist theo game |
| Storage Management | Admin configure AWS S3 / SeaweedFS qua UI, routing theo loại file |
| Admin Panel | Moderation, user management, platform settings |

## Tech Stack

```
Backend   Spring Boot 4.0.6 · Java 21 · PostgreSQL 16 · Flyway
Frontend  React 19 · TypeScript · Tailwind CSS v4
Auth      JWT · Google OAuth · GitHub OAuth
Storage   AWS S3 + SeaweedFS (dynamic routing, admin-configured)
Realtime  WebSocket (Spring Messaging)
```

## Chạy nhanh

### Backend
```bash
# Set env vars (hoặc tạo .env)
export DB_URL=jdbc:postgresql://localhost:5432/godotlaunch
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export AWS_S3_BUCKET=... AWS_S3_REGION=... AWS_ACCESS_KEY=... AWS_SECRET_KEY=...
export MAIL_USERNAME=... MAIL_PASSWORD=...
export ENCRYPTION_KEY=your_32_char_key
export GOOGLE_CLIENT_ID=...
export GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=...
export FRONTEND_URL=http://localhost:5173

cd backend && ./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### SeaweedFS (local storage thay thế S3)
```bash
docker-compose -f docker-compose.seaweedfs.yml up -d
# master: localhost:9333  |  volume: localhost:8081
```

## Cấu trúc thư mục

```
├── backend/          Spring Boot API
├── frontend/         React SPA
├── docs/             Tài liệu dự án
│   ├── architecture/ Kiến trúc & folder structure
│   ├── backend/      Quy tắc backend
│   ├── frontend/     Quy tắc frontend
│   └── resource/     AWS S3, GitHub OAuth, SeaweedFS
├── CLAUDE.md         Context file cho AI coding assistants
├── WIKI.md           Wiki kỹ thuật chi tiết
└── docker-compose.seaweedfs.yml
```

## Tài liệu

- [WIKI.md](WIKI.md) — Kiến trúc chi tiết, database schema, API, luồng nghiệp vụ
- [CLAUDE.md](CLAUDE.md) — Context file tối ưu cho AI (đọc trước khi code)
- [docs/architecture/](docs/architecture/) — Folder structure & system design
- [docs/backend/](docs/backend/) — Quy tắc & convention backend
- [docs/frontend/](docs/frontend/) — Quy tắc & convention frontend

## Flyway Migrations

| Version | Nội dung |
|---|---|
| V1 | Schema gốc — 27 bảng |
| V2 | Community & social features |
| V3 | Game media table |
| V4–V6 | Contract fields & status values |
| V7–V8 | Role rebrand (developer, customer) |
| V9 | Notifications + chat messages |
| V10–V11 | Marketplace item status, asset categories |
| V12–V13 | Fix notifications table |
| V14 | Storage management — storage_accounts, storage_buckets, storage_routing |

> **Quan trọng:** KHÔNG sửa file V đã tồn tại. Thay đổi schema → tạo file V mới.
