# Plan: Media + Storage Refactor

> Gom media (game + marketplace) vào 1 bảng, đơn giản hóa FileType router,
> bundle source code lên storage cho AI đọc sau.
>
> Quyết định đã chốt:
> - **Bundle code → upload storage** (không chỉ snapshot) — để AI service đọc lại sau
> - **GameMedia → Media chung** (owner_type: game | marketplace_item)
> - **FileType router gom**: avatar, pdf_contract, game_media, asset_media, source_bundle

---

## 0. Trả lời "game clone về đâu?"

**Hiện tại: KHÔNG lưu code.** Luồng:
```
clone repo → /tmp/gl_clone_xxx (trong python container)
  → virus scan + snapshot (commit SHA + file hashes → bảng source_snapshots)
  → XÓA tmp (cleanup)   ← code biến mất
```
→ Báo "thành công" = đã scan + lưu **bằng chứng**, KHÔNG lưu code.
→ Routing chưa set vẫn OK vì clone KHÔNG dùng StorageRouter (clone vào tmp, không upload).

**Sau refactor:** sau scan → bundle source (zip) → upload qua StorageRouter (FileType `source_bundle`)
→ lưu URL vào DB → AI service đọc lại sau, admin/user tải được.

---

## 1. Nguyên tắc "đổi router thì value đi đúng" (QUAN TRỌNG)

Đây là yêu cầu cốt lõi. Cách đảm bảo:

```
media_url / file_url trong DB = FULL URL TUYỆT ĐỐI
  vd: https://bucket.s3.../media/xxx.jpg
      http://seaweedfs:8888/godotlaunch/media/xxx.jpg

→ File CŨ: URL đã lưu trỏ tới storage cũ → vẫn truy cập đúng (không phụ thuộc routing hiện tại)
→ File MỚI: routing hiện tại quyết định upload đi đâu
```

**Kết luận:** routing chỉ ảnh hưởng **upload file MỚI**. File cũ giữ nguyên URL tuyệt đối → luôn đúng. Đây là lý do an toàn khi admin đổi routing. ĐÃ đúng trong code hiện tại (lưu full URL), chỉ cần giữ nguyên tắc này.

---

## 2. FileType enum — gom lại

### Hiện tại (8 loại)
```
avatar, thumbnail, pdf_contract, game_zip, source_code_zip,
screenshot, video, asset
```

### Mới (5 loại)
```
avatar          → ảnh đại diện user
pdf_contract    → file hợp đồng PDF
game_media      → thumbnail + screenshot + video CỦA GAME
asset_media     → ảnh resource của marketplace asset
source_bundle   → source code đã bundle (game + marketplace source_code)
```

### Bỏ
- `thumbnail`, `screenshot`, `video` → gom vào `game_media`
- `game_zip`, `source_code_zip` → bỏ (dùng repo, source_bundle thay thế)
- `asset` → đổi tên thành `asset_media`

### ⚠️ Lưu ý migration FileType
- `storage_routing.file_type` là PK (string). Đổi enum → cần migration:
  - INSERT routing mới (game_media, asset_media, source_bundle) — bucket null (admin gán sau)
  - DELETE routing cũ (thumbnail, screenshot, video, game_zip, source_code_zip, asset)
  - ApplicationInitConfig auto-seed sẽ tự thêm file_type mới khi khởi động (đã có cơ chế)

---

## 3. Bảng `media` — gom game_media + marketplace media

### Hiện tại: `game_media`
```
id, game_id (FK), media_type (string), media_url, created_at
→ CHỈ gắn game, KHÔNG gắn marketplace
```

### Mới: `media`
```sql
CREATE TABLE media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type  VARCHAR(20) NOT NULL,   -- 'game' | 'marketplace_item'
    owner_id    UUID NOT NULL,          -- game.id hoặc marketplace_item.id
    media_type  VARCHAR(20) NOT NULL,   -- 'thumbnail' | 'screenshot' | 'video' | 'asset_image'
    media_url   TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_media_owner ON media(owner_type, owner_id);
```

> Polymorphic association (owner_type + owner_id) — 1 bảng cho cả game lẫn marketplace.
> KHÔNG dùng FK cứng (vì owner_id trỏ 2 bảng khác nhau) → app-level integrity.

### Migration data cũ
```sql
-- Copy game_media → media với owner_type='game'
INSERT INTO media (owner_type, owner_id, media_type, media_url, created_at)
SELECT 'game', game_id, media_type, media_url, created_at FROM game_media;
-- Giữ game_media tạm (drop sau khi verify) HOẶC drop ngay
```

---

## 4. Bundle source → upload storage (cho AI đọc sau)

### Luồng mới
```
submit repo → clone tmp → virus scan → snapshot
  → BUNDLE: zip source (bỏ .git) → upload StorageRouter(source_bundle)
  → lưu URL vào source_snapshots.bundle_url (cột mới) HOẶC game/item.fileUrl
  → cleanup tmp
```

### Python service
```
/source/process trả thêm: bundle file (hoặc upload trực tiếp)
→ Cách 1: Python zip + trả base64/stream → backend upload qua StorageRouter
→ Cách 2: Python tự upload (cần config storage trong Python — phức tạp)
→ ĐỀ XUẤT Cách 1: Python trả zip, backend upload (StorageRouter ở Java)
```

### Cột mới
```sql
ALTER TABLE source_snapshots ADD COLUMN bundle_url TEXT;  -- link source đã bundle
```

---

## 5. file_url trong các entity — làm rõ

| Entity | field | Sau refactor |
|---|---|---|
| `Game.fileUrl` | link game.zip (legacy) | → `source_bundle` URL (hoặc bỏ, dùng snapshot.bundle_url) |
| `Game.thumbnailUrl` | 1 ảnh | giữ HOẶC chuyển vào media (media_type=thumbnail) |
| `GameVersion.fileUrl` | build mỗi version | GameVersion CHƯA dùng — để sau |
| `MarketplaceItem.fileUrl` | asset zip / source repo | asset: file zip; source_code: bundle URL |
| `game_media` | N media game | → bảng `media` chung |

> **GameVersion**: hiện chưa wire vào code (không tạo version). Để nguyên, refactor sau khi
> làm versioning thật. Không đụng trong refactor này.

---

## 6. Phạm vi ảnh hưởng (7 file + frontend)

| File | Thay đổi |
|---|---|
| `FileType.java` | enum: gom 5 loại |
| `GameMedia.java` → `Media.java` | đổi entity + owner polymorphic |
| `GameMediaRepository` → `MediaRepository` | query theo owner_type+owner_id |
| `GameServiceImpl` | media qua bảng media; bundle upload |
| `MarketplaceItemServiceImpl` | media cho marketplace; bundle upload |
| `AsyncVirusScanService` | FileType mới |
| `StorageRouter` | (không đổi logic, chỉ FileType khác) |
| `SourceProcessingClient` + Python | trả bundle để upload |
| Migration | bảng media + FileType routing + bundle_url |
| Frontend | upload media qua API mới (owner-based) |

---

## 7. Lộ trình triển khai (thứ tự an toàn)

| Bước | Nội dung | Rủi ro |
|---|---|---|
| **B1** | Migration: bảng `media` + copy data + FileType routing mới + bundle_url | Cao — đụng schema |
| **B2** | Entity Media + MediaRepository (thay GameMedia) | Trung bình |
| **B3** | FileType enum gom 5 loại | Cao — nhiều ref |
| **B4** | GameService + MarketplaceService dùng media chung | Cao |
| **B5** | Bundle source upload (Python trả zip → backend upload) | Trung bình |
| **B6** | Frontend: media API owner-based | Trung bình |
| **B7** | Drop game_media cũ (sau verify) | Thấp |

> **Khuyến nghị làm từng bước, compile + test sau mỗi bước.** KHÔNG làm 1 lúc.
> Đặc biệt B3 (đổi FileType) đụng nhiều ref — dễ sót.

---

## 8. Quyết định đã chốt

1. **`Game.thumbnailUrl` giữ cột riêng** — KHÔNG gom vào media (query nhanh, đơn giản).
2. **Bundle source = ZIP** — AI giải nén khi đọc:
   ```
   submit → Python zip source (bỏ .git) → backend upload StorageRouter(source_bundle)
   AI đọc → tải zip → giải nén tmp → đọc → xóa tmp  (vài dòng code, nhẹ)
   ```
3. **AI đọc bundle cho 3 mục đích** (khớp ai-review-plan.md):
   - Đánh giá chất lượng code (DeepSeek)
   - Similarity check chống đạo nhái (fingerprint)
   - Đối chiếu mô tả với code
   → bundle cần giữ đủ source (.gd, .cs, .tscn, project.godot), có thể bỏ asset binary lớn.
4. **Quyền tải source bundle: admin + người đã mua**
   ```
   GET /source-bundle/{itemId}/download
   → check: requester là admin HOẶC có order mua item này (orders table)
   → presigned URL (S3) / proxy (SeaweedFS) → tải zip
   ```
   KHÔNG public — source là tài sản trả phí.

---

## 9. Lưu ý bundle cho AI (khớp ai-review-plan.md)

Bundle zip lưu storage → AI service (python) tải về:
```python
# Khi AI review:
download bundle zip từ storage URL
→ unzip vào tmp
→ đọc source (sample thông minh: project.godot + file chính + .gd tiêu biểu)
→ gửi DeepSeek đánh giá + tính fingerprint similarity
→ xóa tmp
```
> Bundle KHÔNG cần virus scan lại (đã scan lúc submit). AI chỉ đọc.
