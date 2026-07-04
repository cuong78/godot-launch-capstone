# AWS S3 & SeaweedFS — Storage Setup Guide

GodotLaunch hỗ trợ 2 storage provider: **AWS S3** (cloud) và **SeaweedFS** (self-hosted). Admin configure qua UI — không cần sửa code hay redeploy.

---

## 1. Kiến trúc Storage

```
Upload request
    ↓
StorageRouter.upload(FileType, file, prefix)
    ↓  đọc routing từ DB (cache 60s)
storage_routing: file_type → bucket_id
    ↓
storage_buckets → storage_accounts (config encrypted AES-256)
    ↓
    ┌──────────────┬────────────────┐
    │ AwsS3Adapter │SeaweedFsAdapter│
    └──────────────┴────────────────┘
```

**File types có thể route:** `avatar`, `thumbnail`, `pdf_contract`, `game_zip`, `source_code_zip`, `screenshot`, `video`, `asset`

---

## 2. AWS S3

### 2.1 Tạo Bucket

1. Vào AWS Console → S3 → **Create bucket**
2. Đặt tên bucket (vd: `godot-launch-prod`)
3. Region: chọn gần người dùng (vd: `ap-southeast-1` Singapore)
4. **Block Public Access:** tắt "Block all public access" nếu muốn file public
5. Sau khi tạo → tab **Permissions** → **Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadAvatars",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::godot-launch-prod/avatars/*"
    },
    {
      "Sid": "PublicReadThumbnails",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::godot-launch-prod/thumbnails/*"
    }
  ]
}
```

> **Quan trọng:** KHÔNG dùng `ObjectCannedACL.PUBLIC_READ` trong code — AWS mới disable ACL theo mặc định (BucketOwnerEnforced). Dùng Bucket Policy thay thế.

### 2.2 Tạo IAM User

1. AWS Console → IAM → **Users** → Create user
2. Attach policy: `AmazonS3FullAccess` (hoặc custom policy giới hạn bucket cụ thể)
3. Security credentials → **Create access key** → lưu `Access Key ID` và `Secret Access Key`

### 2.3 Config JSON cho Admin UI

```json
{
  "bucket": "godot-launch-prod",
  "region": "ap-southeast-1",
  "accessKey": "AKIAIOSFODNN7EXAMPLE",
  "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

### 2.4 Env vars (legacy — dùng cho presigned URLs)

File `application.yaml` đọc các biến sau (vẫn cần cho GameService/MarketplaceService):

```bash
AWS_S3_BUCKET=godot-launch-prod
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### 2.5 Public URL format

```
https://{bucket}.s3.{region}.amazonaws.com/{objectKey}
# Ví dụ:
https://godot-launch-prod.s3.ap-southeast-1.amazonaws.com/avatars/uuid_filename.jpg
```

---

## 3. SeaweedFS (Self-hosted)

### 3.1 Chạy local với Docker

```bash
docker-compose -f docker-compose.yml up -d
```

Services khởi động:
| Service | Port | Vai trò |
|---|---|---|
| seaweedfs-master | 9333 | Master — phân phối fid, quản lý volumes |
| seaweedfs-volume | 8081 | Volume server — lưu file thực tế |
| seaweedfs-filer | 8888 | Filer — truy cập file theo path (optional) |

### 3.2 Kiểm tra hoạt động

```bash
# Master status
curl http://localhost:9333/dir/status

# Test upload thủ công
curl -X POST http://localhost:9333/dir/assign
# --> { "fid": "3,01637037d6", "url": "127.0.0.1:8081", "publicUrl": "localhost:8081", "count": 1 }

# Upload file lên volume
curl -X PUT http://localhost:8081/3,01637037d6 -F "file=@test.jpg"

# Truy cập file
curl http://localhost:8081/3,01637037d6
```

### 3.3 Upload Flow trong code (gRPC)

```
App ──gRPC──▶ Filer:18888 ──▶ Volume:8081
              (SeaweedFS tự quản lý fid & volume routing)

Java SDK:
  SeaweedOutputStream out = new SeaweedOutputStream(filerClient, "/godotlaunch/avatars/file.jpg")
  out.write(bytes) → stream lên Filer qua gRPC
  Public URL = http://filerHost:8888/godotlaunch/avatars/file.jpg
```

So với HTTP REST cũ (2 bước thủ công):
```
1. POST master:9333/dir/assign  → parse fid + volumeUrl
2. PUT http://volumeUrl/fid (multipart)
```
gRPC gộp thành 1 stream — không cần tự parse JSON, không cần manage volumeUrl.

### 3.4 Config JSON cho Admin UI

```json
{
  "filerHost": "localhost",
  "filerGrpcPort": 18888,
  "filerHttpPort": 8888,
  "basePath": "/godotlaunch"
}
```

Production (deploy lên server thật):
```json
{
  "filerHost": "storage-internal.example.com",
  "filerGrpcPort": 18888,
  "filerHttpPort": 8888,
  "basePath": "/godotlaunch"
}
```

### 3.5 Persistent storage

`docker-compose.seaweedfs.yml` mount volume `/data` vào named volume `seaweedfs-data` — data không mất khi restart container.

```bash
# Xem data đã lưu
docker volume inspect go-dot-launch-capstone-fptu_seaweedfs-data
```

---

## 4. Admin UI — Cách config Storage

### Bước 1: Tạo Storage Account

1. AdminPage → tab **Storage** → tab **Accounts**
2. Click **Thêm Storage Account**
3. Chọn provider (AWS S3 hoặc SeaweedFS)
4. Template JSON tự động điền — sửa giá trị thật vào
5. Click **Tạo Account** → backend encrypt AES-256 → lưu DB

### Bước 2: Tạo Bucket

1. Tab **Buckets** → **Thêm Bucket**
2. Chọn account vừa tạo
3. Nhập tên bucket + region (S3) hoặc public URL (SeaweedFS)

### Bước 3: Gán Routing

1. Tab **Routing**
2. Kéo file type card (trái) → thả vào bucket zone (phải)
3. Click **Lưu N thay đổi** → config apply ngay lần upload tiếp theo

> **Lưu ý:** Config chỉ apply cho **lần upload mới**. URL file cũ không thay đổi.

---

## 5. So sánh AWS S3 vs SeaweedFS

| Tiêu chí | AWS S3 | SeaweedFS |
|---|---|---|
| Chi phí | Trả theo dung lượng + request | Miễn phí (tự host) |
| Setup | Đơn giản | Cần Docker/server |
| Scalability | Unlimited | Giới hạn bởi hardware |
| CDN | CloudFront tích hợp | Cần setup riêng |
| Presigned URL | Có | Không |
| Phù hợp | Production, file lớn | Dev/staging, chi phí thấp |

> **Game ZIP, Source Code ZIP:** hiện chỉ hỗ trợ S3 do cần presigned URL để download an toàn. SeaweedFS có thể dùng cho avatar, thumbnail, screenshot.
