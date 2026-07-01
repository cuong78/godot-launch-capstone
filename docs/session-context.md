# Session Context — bàn giao sang chat mới

> File này tóm tắt trạng thái dự án + việc đã/đang làm để tiếp tục ở session chat khác.
> Cập nhật: 2026-06-30.

---

## 0. Trạng thái Git hiện tại
- Branch: `develop` (đồng bộ với `origin/develop`)
- HEAD: `7658a84` (Merge develop — sau khi đã refactor entity Game/Asset)
- **19 file thay đổi CHƯA COMMIT** (working tree) — là các thay đổi mục 2 dưới đây.
- Migration: **ĐÃ GỘP tất cả về 1 file `V1__init_schema.sql` duy nhất** (next = V2). Xóa V60–V71. V1 = schema cuối cùng đã sạch (đã áp toàn bộ dọn dẹp 2.1–2.9).
  - ⚠️ Vì rewrite V1 → checksum đổi. `repair-on-migrate` chỉ sửa checksum, KHÔNG áp lại schema. BẮT BUỘC drop DB chạy lại: `docker exec -e PGPASSWORD=12345 godotlaunch-postgres psql -U postgres -d postgres -c "DROP DATABASE godot_launch;" -c "CREATE DATABASE godot_launch;"` rồi boot backend.
  - Đã validate: chạy V1 vào DB tạm sạch → 0 lỗi, 36 bảng, mọi cột/type/FK đúng trạng thái cuối.

### 2.10 Bổ sung entity còn thiếu so với schema
- Đối chiếu 36 bảng DB ↔ `@Table` entity Java: thiếu entity cho `banned_ips`, `store_download_stats` (bảng nghiệp vụ thật chưa wire). Tạo mới:
  - `BannedIp.java` (bảng `banned_ips`): ip_address inet (+@ColumnTransformer ::inet), reason, relatedUserId/bannedBy (UUID, nullable), bannedAt, expiresAt, notes.
  - `StoreDownloadStat.java` (bảng `store_download_stats`): @ManyToOne Game, platform String +@ColumnTransformer ::ext_platform_enum (không hồi sinh enum ExtPlatform đã xóa), statDate, downloads, installs, revenue, fetchedAt.
- KHÔNG tạo entity cho: `face_embeddings` (vector(128) — dùng native SQL trong BannedIdentityServiceImpl, cố ý), `game_tags`/`asset_tags` (bảng nối M:N — map qua @JoinTable trong Game/Asset).
- Fix test: `BackendApplicationTests` gọi `contract.getBuyer()` (đã xóa ở V63) → bỏ dòng đó. (Đây là regression test chưa cập nhật, lộ ra khi boot vì spring-boot:run compile cả test.)
- VALIDATE THẬT: boot backend vào DB tạm (Flyway chạy V1 + Hibernate ddl-auto=validate) → **Started BackendApplication** thành công → toàn bộ entity (gồm 2 cái mới) khớp schema 100%.

### 2.11 Bỏ Game.file_url — file game lấy từ SourceSnapshot (migration V2)
- Lý do: game submit qua GitHub repo → file source thật ở `source_snapshots.bundle_url` (game = repo + snapshot). `games.file_url` là di tích luồng cũ "upload game.zip", gần như luôn null → dư thừa.
- KHÔNG wire GameVersion (Explore xác nhận: GameVersion + ExternalPublish là bảng chết; "wire version" thực ra là feature versioning mới — file game không có nguồn để gắn vào version. Để dành.)
- Sửa: `Game` xóa field `fileUrl`; `GameServiceImpl.mapToResponse` lấy thẳng từ SourceSnapshot (bỏ fallback game.fileUrl); bỏ 2 `setFileUrl` (confirmUploadComplete giữ virus scan, rejectGame); `GameRepository` xóa `searchGameZips`; `AdminStorageController` xóa case "game_zip" (đã có case "source_snapshot" hiển thị file game qua bundle) + bỏ nhánh xóa game.fileUrl.
- KHÔNG đụng Asset.fileUrl (asset vẫn upload file trực tiếp — khác game).
- `V2__drop_game_file_url.sql`: `ALTER TABLE games DROP COLUMN file_url`.
- Verify: `mvnw compile` SUCCESS; Flyway "Successfully applied 2 migrations, now at version v2" (V1+V2 chạy sạch trên DB tạm). Boot-validate đầy đủ bị gián đoạn do **postgres container tự dừng giữa chừng** (lỗi hạ tầng, không liên quan code — đã restart lại). Migration cao nhất giờ = V2 (next = V3).
- Backup branches còn giữ (đường lùi nếu cần):
  - `backup-before-reset-a20112f-20260630-081109` (trước khi reset develop về a20112f cho demo)
  - `backup-apk-feature-20260629-224526` (tính năng build APK đã bỏ)
  - `backup-before-remerge-20260625-1054`

---

## 1. Bối cảnh dự án
**GodotLaunch** — nền tảng cộng đồng Godot. Tech stack:
- Backend: Spring Boot 4.0.6 / Java 21, PostgreSQL 16 (+pgvector), MongoDB (audit logs), Flyway
- Frontend: React 19 / TypeScript / Vite / Tailwind v4
- AI/Python: FastAPI :8001 (CLIP + NSFW self-host, DeepSeek text, face_recognition, OCR, ffmpeg)
- Storage: SeaweedFS + AWS S3 (presigned)
- External: PayOS (payment+payout), GitHub OAuth+bot, Google OAuth+Vision, ClamAV
- Docker compose: postgres, mongodb, ai-service, clamav, seaweedfs (master/volume/filer)
- DB cred local: user=`postgres` pass=`12345` (trong `backend/.env`, khớp docker-compose)

**Mô hình entity (sau refactor, đã chốt):**
```
Game  = lõi sản phẩm game của developer
   ├─ STORE  : publishingType ∈ {full_acquisition, co_publishing} → có Contract + ExternalPublish
   └─ MARKET : publishingType = marketplace_listing → bán source game ở marketplace nội bộ (không contract)
   Ràng buộc: game đã lên STORE thì không kéo về MARKET.

Asset = CHỈ tài nguyên lẻ (3D, sprite, audio, plugin). KHÔNG còn source_code/sourceGame/itemType.
        (Trước đây tên MarketplaceItem → đã đổi tên Asset.)

Contract = hợp đồng xuất bản GAME (chỉ game, không asset).
   seller = developer; buyer = hệ thống GodotLaunch (1 admin ký thay platform).

Dispute = tranh chấp bản quyền CHỈ cho GAME (asset không dispute).
```

---

## 2. Việc ĐÃ LÀM trong phiên này (CHƯA COMMIT) — 3 nhóm dọn dẹp entity

> Tất cả đã `./mvnw -o compile` → **BUILD SUCCESS**. Migration mới chạy khi boot backend.

### 2.1 Xóa luồng Favorite / Wishlist (migration V62)
- Xóa entity: `Favorite`, `FavoriteId`, `AssetFavorite`, `AssetFavoriteId`
- Xóa: `WishlistService`, `WishlistServiceImpl`, `WishlistController` (vốn đã comment hết sẵn)
- Xóa 2 ErrorCode: `WISHLIST_ALREADY_EXISTS`, `WISHLIST_ITEM_NOT_FOUND`
- `V62__drop_favorites_tables.sql`: DROP `favorites` + `asset_favorites`
- (Luồng này đã chết sẵn — không repository, FE không có file favorite nào.)

### 2.2 Bỏ Contract.buyer FK (migration V63)
- Lý do: hệ thống chỉ 1 admin → không cần lưu FK admin nào ký.
- Entity `Contract`: xóa field `buyer` (FK User) + `@JoinColumn buyer_id`.
- `ContractServiceImpl`: bỏ `setBuyer(admin)` (createOffer + signByAdmin), bỏ `.buyerId()` trong response.
- `ContractResponse` DTO: bỏ field `buyerId`.
- `V63__drop_contract_buyer_id.sql`: DROP index + FK + cột `buyer_id`.
- **GIỮ LẠI** (không phải FK, là nội dung hợp đồng PDF): `buyerRepresentative`, `buyerPosition`, `buyerSignatureBase64`, `signedAtBuyer`.

### 2.3 Bỏ Dispute.asset (migration V64)
- Lý do: dispute bản quyền chỉ cho game; asset là tài nguyên lẻ, không dispute.
- Entity `Dispute`: xóa field `asset` (FK); `game` đổi thành **NOT NULL** (optional=false).
- `DisputeServiceImpl`: `createDispute` bắt buộc gameId; bỏ nhánh asset ở `restoreProduct`; bỏ `assetId/assetTitle` ở response; xóa import `Asset`/`ItemStatus`/`AssetRepository` thừa.
- DTO: `CreateDisputeRequest` bỏ `assetId`; `DisputeResponse` bỏ `assetId/assetTitle`.
- `V64__drop_dispute_asset.sql`: DROP CHECK `chk_dispute_target` + FK + cột `asset_id`; `game_id` SET NOT NULL.

### 2.4 Dọn ExternalPublish (migration V65, V66)
- Bỏ field `platform` (ExtPlatform): mặc định chỉ publish 1 platform (Google Play) → không cần lưu.
  - Entity `ExternalPublish`: xóa field `platform` + import. Xóa luôn enum `ExtPlatform.java` (dead code).
  - `V65__drop_external_publish_platform.sql`: DROP index `idx_ext_publishes_platform` + unique `uq_game_platform` + cột `platform`. **KHÔNG** drop TYPE `ext_platform_enum` (bảng `store_download_stats` vẫn dùng).
- Bỏ field `submittedBy` (FK submitted_by): admin/hệ thống là người submit → không cần lưu ai.
  - Entity `ExternalPublish`: xóa field `submittedBy` + `@JoinColumn`.
  - `V66__drop_external_publish_submitted_by.sql`: DROP FK `external_publishes_submitted_by_fkey` + cột `submitted_by`. (KHÔNG đụng `source_snapshots.submitted_by` — bảng khác.)

### 2.5 Media polymorphic → FK thật (migration V67)
- Lý do: bảng `media` cũ dùng polymorphic (`owner_type`+`owner_id`, không FK) — anti-pattern, ER diagram không vẽ được quan hệ. Chuyển sang exclusive arc 2 FK thật.
- Entity `Media`: bỏ `ownerType`/`ownerId`; thêm `@ManyToOne Game game` (game_id) + `@ManyToOne Asset asset` (asset_id), LAZY. Xóa enum `MediaOwnerType.java`.
- `MediaRepository`: thay `find/deleteByOwnerType...` bằng `findByGame_Id`/`findByAsset_Id`/`...AndMediaType`/`deleteBy...`. Giữ `searchMedia*`.
- Service sửa (chỉ đổi cách gọi, giữ logic): `GameServiceImpl` (dùng `setGame`/`findByGame_Id`...), `AssetServiceImpl` (`setAsset`/`findByAsset_Id`...), `AiReviewServiceImpl` (tách helper game/asset), `AdminStorageController.listUploadedFiles` (dùng `med.getGame()/getAsset()` + thêm `@Transactional(readOnly=true)` vì LAZY).
- `V67__media_fk_owner.sql`: drop `owner_type`/`owner_id` + check + index cũ; thêm `game_id`/`asset_id` FK ON DELETE CASCADE + CHECK `chk_media_one_owner` (num_nonnulls=1) + index; **DROP bảng chết `media_files`** (không entity nào map).

### 2.6 Xóa cụm kiểm duyệt NSFW media_content_flags (migration V68)
- Lý do: quét NSFW sau này chạy real-time, không lưu kết quả xuống DB → không cần bảng flag.
- Xóa Java (6 file): entity `MediaContentFlag`, `MediaContentFlagRepository`, `AdminContentModerationController` (`/api/admin/content-flags`), DTO `MediaContentFlagResponse`, `ContentModerationService` + `ContentModerationServiceImpl` (đã comment hết sẵn).
- Xóa FE (2 file mồ côi, không nơi nào mount): `api/contentFlagApi.ts`, `components/admin/AdminContentFlagPanel.tsx`. (Tab `moderation` ở AdminPage là duyệt game/marketplace — KHÁC, không đụng.)
- LƯU Ý: `nsfwFlag` trong AiReviewReport/AiReviewReportCard là luồng AI review khác — GIỮ NGUYÊN.
- `V68__drop_media_content_flags.sql`: `DROP TABLE media_content_flags CASCADE`.

### 2.7 Bỏ paymentProvider khỏi Payment (migration V69)
- Lý do: chỉ dùng 1 cổng PAYOS → không cần lưu/hiển thị provider.
- BE: entity `Payment` xóa field `paymentProvider` + import; `PaymentResponse` DTO bỏ field; `PaymentServiceImpl` bỏ 2 `setPaymentProvider(PAYOS)` + builder `.paymentProvider(...)`. Xóa enum `PaymentProvider.java` (dead code, chỉ có PAYOS).
- FE: `types.ts` bỏ type `PaymentProvider` + field; gỡ block hiển thị provider ở `PaymentResultPage`, `PaymentDetailPage`, và cột (th+td) ở `AdminPaymentVerificationPanel` (sửa colSpan 7→6). Gỡ 2 i18n key `result.paymentProvider` + `center.detail.provider` ở en/vi/ja.
- `V69__drop_payment_provider.sql`: DROP COLUMN `payment_provider` + DROP TYPE `payment_provider_enum` (chỉ cột đó dùng).
- Verify: BE `mvnw compile` SUCCESS, FE `tsc --noEmit` 0 lỗi.

### 2.8 Xóa SourceDownload (migration V70)
- Lý do: bảng log lượt tải chỉ ghi vào, không nơi nào đọc ra (không thống kê, không gác quyền). Quyền tải đã kiểm bằng order/payment PAID trong `downloadPurchase` → bảng này dead weight.
- Đã verify: chức năng tải source sau khi mua KHÔNG phụ thuộc `source_downloads` (luồng: FE mở `payment.downloadUrl` → `GET /api/v1/downloads/{orderId}` → `DownloadController` → `downloadPurchase`, chỉ check order/payment + trả file). Xóa không mất tải.
- Xóa: entity `SourceDownload`, `SourceDownloadRepository`. Trong `DownloadServiceImpl`: gỡ block tạo+save log + method `resolveNextDownloadCount` + helper `normalize`/`truncate` + hằng `DEVICE_INFO_MAX_LENGTH` (đều thành dead sau khi bỏ log). GIỮ tham số `ipAddress`/`userAgent` của interface (không đụng chữ ký).
- `V70__drop_source_downloads.sql`: `DROP TABLE source_downloads CASCADE`.
- QUYẾT ĐỊNH KÈM: GIỮ `Game.downloadCount` (dead code luôn=0 nhưng user muốn giữ phòng sau wire hiển thị lượt tải) — KHÔNG xóa.

### 2.9 Bỏ SourceSnapshot.asset (migration V71)
- Làm rõ 2 luồng quét virus TÁCH BIỆT: (A) ClamAV `AsyncVirusScanService.scanAndProcessGame/Asset` quét ZIP upload trực tiếp → chỉ đổi status + audit log, KHÔNG đụng SourceSnapshot. (B) Source-processing Python clone GitHub repo → trả `SourceProcessResult` (commitSha/hash/virusClean/virusScanned/secrets) → `saveSnapshotForGame` tạo SourceSnapshot. → cờ virus trên snapshot là kết quả quét của bản clone repo (Python), không phải ClamAV.
- `SourceSnapshot` giờ CHỈ cho source GAME submit qua repo: `saveSnapshotForGame` luôn `setGame`, KHÔNG BAO GIỜ `setAsset`. Field `asset` là di sản chết (marketplace cũ bán "source code" như item) → query theo asset luôn rỗng.
- Xóa: field `asset` trong `SourceSnapshot`; method dead `findByAssetIdOrderByCreatedAtDesc` trong `SourceSnapshotRepository` (không caller — dòng 84 ở AdminAiReviewController là method CÙNG TÊN của AiReviewReportRepository, KHÁC).
- KHÔNG đụng `AdminAiReviewController` / `AiReviewReport` (cụm AI review vẫn dùng asset thật).
- `V71__drop_source_snapshot_asset.sql`: DROP index `idx_source_snapshots_item` + FK `source_snapshots_marketplace_item_id_fkey` + cột `asset_id`.

---

## 3. Việc CÒN DANG DỞ / cần làm tiếp

### 3.1 Commit
3 nhóm thay đổi (2.1, 2.2, 2.3) **chưa commit**. User nói "overview lại sau" trước khi commit. → Khi overview xong, commit gộp hoặc tách 3 commit.

### 3.2 Phase 2 & 3 của refactor Game/Asset/Media (chưa làm — xem `docs/refactor-game-asset-media.md`)
- **Phase 2**: Wire bán source game (Game market) — chuyển order/payment/download từ Asset sang Game cho `publishingType=marketplace_listing`. Đụng payment/order/cart, rủi ro cao.
- **Phase 3**: Chuẩn hóa media — bỏ field `thumbnail_url` rời ở Game + Asset, mọi media qua bảng `media` (polymorphic owner_type+owner_id). Hiện Game lưu thumbnail field rời, Asset đã dùng bảng media → KHÔNG nhất quán, cần thống nhất.
  - LƯU Ý: chỉ bỏ `thumbnail_url`, GIỮ `version`/`supportedPlatforms` (metadata, không phải media).
  - Đổi `MediaOwnerType.marketplace_item` → `asset`.

### 3.3 Vấn đề PayOS (đã giải quyết hiểu nhầm)
- Lỗi 502 PAYMENT_GATEWAY_ERROR lúc trước do **thiếu credentials PayOS trong `backend/.env`** → user đã thêm rồi.
- **Webhook PayOS cần ngrok** (PayOS gọi ngược về localhost không tới được). NHƯNG hệ thống có **CẢ polling** (`syncPaymentFromGateway`/`confirmPayment`) → **demo không cần ngrok**, dùng polling.

---

## 4. Lệnh verify nhanh
```bash
# Backend build
cd backend && ./mvnw -o compile        # → BUILD SUCCESS

# Boot backend (Flyway chạy migration mới, chờ "Started BackendApplication")
cd backend && ./mvnw -o spring-boot:run

# Frontend typecheck
cd frontend && npx tsc --noEmit         # → 0 lỗi

# Hạ tầng docker
docker compose up -d postgres mongodb seaweedfs-master seaweedfs-volume seaweedfs-filer clamav ai-service

# Kiểm migration đã chạy
docker exec -e PGPASSWORD=12345 godotlaunch-postgres psql -U postgres -d godot_launch -c \
  "SELECT max(version::int) FROM flyway_schema_history WHERE version ~ '^[0-9]+$';"
```

---

## 4b. TASK CHỜ LÀM: Wire GameVersion + đổi AiReviewReport → GameVersion

> ⚠️ ĐÍNH CHÍNH: GameVersion & ExternalPublish **KHÔNG phải "bảng chết"** — chúng là 2 luồng
> nghiệp vụ QUAN TRỌNG (versioning game + publish lên Google Play/App Store), chỉ **chưa được
> wire code** (mới có entity + schema, chưa có repository/service/controller).

### Quyết định đã CHỐT với user (làm ở task sau):
- **Cách A**: khi submit game repo → **tự tạo 1 GameVersion mới** từ snapshot.
- **Mỗi lần submit repo = 1 version mới** (v1 → v2 → v3), giữ lịch sử. `is_current` = version mới nhất.
- **AiReviewReport đổi HẲN** `game_id` → `game_version_id` (bỏ game_id, không giữ cả hai).
  Admin xem report theo game thì join version→game.

### Các bước cần làm (đã khảo sát sẵn):
1. **Tạo `GameVersionRepository`** (chưa có) — cần method đếm/lấy version mới nhất theo game để đánh số version.
2. **`GameServiceImpl.submitGameRepo`** (dòng ~174-177, sau `saveSnapshotForGame`): tạo GameVersion
   - `versionNumber` tăng dần (đếm version hiện có của game + 1, vd "v1", "v2").
   - `fileUrl` = bundleUrl (lấy từ snapshot vừa tạo — `snap.getBundleUrl()`).
   - `isCurrent` = true (set version cũ isCurrent=false trước).
   - Truyền `gameVersionId` cho AI review thay vì gameId.
   - LƯU Ý: `saveSnapshotForGame` hiện không trả bundleUrl ra ngoài — cần refactor để lấy được, hoặc tạo version bên trong nó.
3. **Entity `AiReviewReport`**: đổi `@JoinColumn game_id / Game game` → `game_version_id / GameVersion gameVersion`. Giữ nguyên `asset` (asset review vẫn theo asset).
4. **`AiReviewService`**: `reviewGameAsync(gameId)` → `reviewGameVersionAsync(gameVersionId)`.
   - Trong đó: `report.setGameVersion(version)`. Media vẫn lấy theo game (version.getGame().getId()).
   - `AiReviewReportRepository`: `findFirstByGameIdOrderByCreatedAtDesc` → `findFirstByGameVersion_Game_Id...` (join) hoặc thêm method theo version.
5. **`AdminAiReviewController`**: endpoint `/game/{gameId}` — quyết định giữ (query qua version→game) hay đổi thành `/game-version/{id}`. + `DTO AiReviewReportResponse` đổi `gameId` → `gameVersionId` (+ có thể thêm gameId tính từ version cho FE tiện).
6. **Frontend `aiReviewApi.ts`**: cập nhật endpoint/field nếu đổi.
7. **Migration mới (V-next)**: `ai_review_reports` rename cột `game_id` → `game_version_id` + đổi FK trỏ `game_versions(id)`. (DB trống nên rename đơn giản; nếu có data thì cần migrate.)
8. **Verify**: build + boot (Flyway + Hibernate validate) + FE tsc.

### Rủi ro / lưu ý:
- Đây là refactor ĐA TẦNG (entity + service + controller + DTO + FE + migration) → **nên vào plan mode** khi làm.
- GameVersion.file_url NOT NULL → phải có bundleUrl khi tạo version (game submit qua repo luôn có bundle nếu sạch).
- Có thể cân nhắc wire luôn ExternalPublish (publish version lên store) trong cùng đợt — nhưng đó là scope riêng, hỏi user.

---

## 5. Tài liệu liên quan trong repo
- `docs/refactor-game-asset-media.md` — chi tiết Phase 1/2/3 + checklist test
- `docs/ai-review-plan.md` — plan AI review multimodal
- `CLAUDE.md` — context tổng quan dự án (đọc đầu tiên)
- `docs/session-context.md` — file này

---

## 6. Tóm tắt 1 dòng cho session mới
> Đang dọn dẹp entity sau refactor Game/Asset (đã làm nhiều đợt, xem mục 2). **Chưa commit**, chờ user overview.
> TASK CHỜ (mục 4b): wire GameVersion + đổi AiReviewReport→GameVersion (đã chốt cách A, mỗi submit = version mới).
> GameVersion & ExternalPublish là luồng QUAN TRỌNG (versioning + publish store), chưa wire code.
> Phase 2 (wire bán source game) & Phase 3 (chuẩn hóa media) trong docs/refactor-game-asset-media.md.
