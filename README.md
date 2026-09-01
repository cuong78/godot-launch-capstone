# GodotLaunch

Nền tảng dành cho cộng đồng **Godot Engine** — giúp developers submit game, bán source code & asset, ký hợp đồng phát hành, và tương tác cộng đồng.

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| Game Submission | Developer nộp game → AI report → Admin duyệt |
| Hợp đồng phát hành | Full acquisition hoặc Co-publishing với chữ ký số |
| Marketplace | Mua bán source code Godot & asset pack |
| Community | Chat cộng đồng, review, wishlist theo game |
| Storage Management | Admin configure SeaweedFS qua UI, routing theo loại file |
| Admin Panel | Moderation, user management, platform settings |
 
 ## Tech Stack
 
 ```
 Backend   Spring Boot 4.0.6 · Java 21 · PostgreSQL 16 · MongoDB · Flyway
 Frontend  React 19 · TypeScript · Tailwind CSS v4
 Auth      JWT · Google OAuth · GitHub OAuth
 Storage   SeaweedFS (dynamic routing, admin-configured)
 Realtime  WebSocket (Spring Messaging)
 ```
 
## Cài đặt và chạy dự án

Dự án được bàn giao dưới dạng file ZIP và chạy local trên Windows bằng Docker Desktop, Java 21, Node.js và Python 3.14.

Xem [HUONG_DAN_CAI_DAT.md](HUONG_DAN_CAI_DAT.md) để biết cách đặt các file `.env`, sửa `INSIGHTFACE_HOME` theo user Windows và setup đầy đủ.

Sau khi chuẩn bị môi trường, có thể setup và chạy toàn bộ dự án bằng một lệnh:

```powershell
make first-run
```

Những lần tiếp theo chỉ cần:

```powershell
make run
```

## Cấu trúc thư mục

```
├── ai-service/       FastAPI + InsightFace/AI services
├── backend/          Spring Boot API
├── frontend/         React SPA
├── docs/             Tài liệu kiến trúc và nghiệp vụ
├── resource/         Dữ liệu media mẫu
├── scripts/          Launcher PowerShell và kiểm thử setup
├── docker-compose.yml Docker dependencies
└── Makefile          Các lệnh doctor/setup/run/first-run
```

## Tài liệu

- [HUONG_DAN_CAI_DAT.md](HUONG_DAN_CAI_DAT.md) — Cài đặt từ file ZIP và chạy toàn bộ hệ thống
- [DEPLOYMENT_VPS.md](DEPLOYMENT_VPS.md) — Triển khai production trên VPS mới, DNS/SSL/Nginx, storage và checklist bàn giao
- [docs/](docs/) — Kiến trúc, luồng nghiệp vụ và hướng dẫn kỹ thuật
- [backend/RULES.md](backend/RULES.md) — Quy tắc phát triển backend

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
