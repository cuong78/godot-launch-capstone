# Refactor: Tách bạch Game / Asset + Chuẩn hóa Media

> Doc bàn giao cho team. Phase 1 ĐÃ XONG (code + verify). Phase 2, 3 là hướng dẫn để team làm tiếp.
> Tác giả Phase 1: (AI-assisted). Cập nhật: 2026-06-30.

---

## 0. Bối cảnh & mục tiêu

Kiến trúc cũ **chồng chéo khái niệm**: "bán source code của game" tồn tại ở 2 nơi mâu thuẫn
(`Asset.itemType=source_code` + `Asset.sourceGame` VS `Game.publishingType=marketplace_listing`).
→ Một game muốn bán source có thể đi 2 đường → trùng lặp, khó hiểu.

**Mô hình mới (đã chốt):**
```
Game (lõi)  ─ thông tin trung tâm (title, description, github repo, creator...)
   ├─ STORE   : publishingType ∈ {full_acquisition, co_publishing} → có Contract + ExternalPublish
   └─ MARKET  : publishingType = marketplace_listing → bán source game ở marketplace nội bộ (KHÔNG contract)
   Ràng buộc: game đã lên STORE thì KHÔNG kéo về MARKET (publishingType immutable sau approved)

Asset  ─ CHỈ tài nguyên lẻ (3D model, sprite, audio, plugin). KHÔNG còn source_code / sourceGame / itemType.

Media  ─ nguồn sự thật DUY NHẤT cho mọi ảnh/video (game store, game market, asset).
```

**3 Phase:**
- **Phase 1 (XONG):** Dọn Asset — bỏ source_code, sourceGame, itemType.
- **Phase 2 (TODO):** Wire bán source game (order/payment/download cho Game market).
- **Phase 3 (TODO):** Chuẩn hóa media — bỏ field `thumbnail_url` rời, mọi media qua bảng `media`.

---

## 1. PHASE 1 — ĐÃ HOÀN THÀNH ✅

### 1.1 Backend
| Hạng mục | Chi tiết |
|---|---|
| **Migration** | `V59__simplify_asset_drop_source_code.sql`: DROP cột `item_type`, `source_game_id`, `github_repo_url`, `github_verified_at` khỏi `assets`; DROP TYPE `item_type_enum` |
| **Entity** | `Asset.java` bỏ 4 field trên. XÓA file `entity/enums/ItemType.java` |
| **DTO** | `CreateAssetRequest`/`UpdateAssetRequest`/`AssetResponse`: bỏ itemType/sourceGameId/githubRepoUrl/githubVerifiedAt. `PaymentResponse.assetType`: `ItemType` → `String` ("asset" \| "game_source") |
| **AssetServiceImpl** | Bỏ nhánh `itemType==source_code`. **XÓA hẳn** method `submitItemRepo`, `acceptBotInvitation`, `getSourceBundleUrl`, `saveSnapshotForItem`, `uploadSourceBundle`. Asset luôn là upload-file. |
| **AiReviewServiceImpl** | `reviewAssetAsync`: asset luôn review **media-only** (contentType="asset", repoUrl=null) |
| **DownloadServiceImpl** | Bỏ check itemType. Asset tải trực tiếp `fileUrl` (không còn source bundle/snapshot) |
| **PaymentServiceImpl** | `resolveOrderType`/`resolveTransactionType` luôn trả `asset_purchase`. `transaction.setGame(null)` (asset không gắn game) |
| **AssetController** | XÓA endpoints: `POST /{id}/submit-repo`, `POST /accept-bot`, `GET /{id}/source-bundle` |

### 1.2 Frontend
| File | Thay đổi |
|---|---|
| `types.ts` | Bỏ itemType/sourceGameId/sourceGameTitle/githubRepoUrl/githubVerifiedAt khỏi `MarketplaceItemResponse`/Create/Update. `PaymentResponse.marketplaceItemType`: `"asset"\|"game_source"` |
| `api/marketplaceApi.ts` | XÓA `submitItemRepo`, `acceptBot` |
| `page/UploadPage.tsx` | XÓA item-type selector, GitHub repo field (marketplace), media-source-code block, các nhánh `itemType==source_code` |
| `page/MarketplacePage.tsx` | XÓA section "Source Code", chỉ còn asset listings |
| `App.tsx` | `mapMarketplaceItemToAsset`/`buildMarketplaceTagList`/`getMarketplaceImage`/`normalizeMarketplaceCategory`: bỏ nhánh source_code |
| `AdminPage.tsx`, `DashboardPage.tsx` | Bỏ badge "SOURCE CODE", bỏ hiển thị github/sourceGame của asset |
| Payment pages | `'source_code'` → `'game_source'` (ngữ cảnh Phase 2) |

### 1.3 Trạng thái verify Phase 1
- ✅ Backend `./mvnw -o compile` → BUILD SUCCESS
- ✅ Flyway phase refactor migration chạy thật, backend boot OK (Hibernate validate pass)
- ✅ DB: `assets` không còn item_type/source_game_id/github_*; còn lại: id, seller, category, title, description, price, file_url, status, **thumbnail_url, version, supported_platforms**, timestamps
- ✅ Frontend `npx tsc --noEmit` → 0 lỗi

### 1.4 ⚠️ Lưu ý / chưa làm trong Phase 1
- **Chưa commit** — code đang ở working tree (branch `develop`).
- `Asset` UI model trong `types.ts` (dòng ~19) vẫn còn `itemType?: "source_code"|"asset"` (optional) — dùng cho **mock/featured data** trong App.tsx (FEATURED_ASSETS hardcode). KHÔNG phải dữ liệu API thật. Có thể dọn sau, không gấp.
- `MediaOwnerType` vẫn dùng value `marketplace_item` (chưa đổi `asset`) — để Phase 3.
- DB local cũ có thể đã chạy các version `56` và `57` từ luồng migration trước đó. Sau khi gộp schema vào `V1`, các migration refactor mới cần dùng version mới hơn để tránh bị Flyway bỏ qua.

---

## 2. PHASE 2 — Wire bán source game (Game market) — TODO

### 2.1 Mục tiêu
Game `publishingType = marketplace_listing` = "game bán source ở marketplace nội bộ".
Game **ĐÃ CÓ**: `submitGameRepo` (verify owner + clone + scan + snapshot vào `source_snapshots.game_id`),
`priceProposed`. **CẦN WIRE** luồng thương mại (mua/bán/tải source game).

### 2.2 Hiện trạng (đã khảo sát)
- `GameServiceImpl.approveGame()` ĐÃ branch: `marketplace_listing` → `pending→published` ngay (không contract);
  store types → `pending→approved` → ký contract → published.
- `source_snapshots` đã dual-use: cột `game_id` HOẶC `asset_id` (mutually exclusive).
- `orders`/`transactions` hiện FK `asset_id`. **`orders` CHƯA có cột `game_id`**.
- `source_downloads` hiện FK `asset_id`. **CẦN kiểm `game_id`** (xem migration V1).
- Enum `OrderType.source_code_purchase` / `TxnType.source_code_purchase` / `AuditTarget.source_code_purchase`
  ĐÃ TỒN TẠI → tái dùng cho game-source purchase (đừng tạo mới).

### 2.3 Việc cần làm (gợi ý các bước)
1. **Migration mới (V58 hoặc số kế tiếp):**
   - `orders`: thêm cột `game_id UUID NULL` (FK → games) + CHECK ràng buộc `(asset_id IS NOT NULL) <> (game_id IS NOT NULL)` (XOR — đơn 1 lần mua 1 thứ).
   - `source_downloads`: thêm `game_id UUID NULL` nếu chưa có (kiểm V1 trước).
   - (KHÔNG drop asset_id ở các bảng — vẫn dùng cho asset purchase.)
2. **Entity:** `Order.java` thêm `@ManyToOne Game game` (nullable). `SourceDownload.java` thêm `game` nếu cần.
3. **Service PaymentServiceImpl:** thêm nhánh tạo payment cho **game** (hiện chỉ asset):
   - method `createPayOSPaymentForGame(gameId, buyerEmail)` hoặc generalize `createPayOSPayment` nhận type.
   - `resolveOrderType`/`resolveTransactionType`: nếu mua game-source → `source_code_purchase`.
   - `transaction.setGame(game)` cho game purchase.
4. **DownloadServiceImpl:** tách `downloadPurchase` cho game-source: lấy bundle từ `source_snapshots.game_id`,
   ghi `source_downloads.game_id`, FileType.source_bundle. (Logic giống asset cũ đã xóa — tham khảo git history commit Phase 1 hoặc `GameServiceImpl.saveSnapshotForGame` đã upload bundle).
5. **getSourceBundleUrl cho Game:** thêm vào `GameService` — quyền: admin / seller (creator) / người đã mua game.
6. **Controller:** `GameController` thêm endpoint mua + tải source game (hoặc dùng chung PaymentController/DownloadController với param type).
7. **Cart (quyết định):** game-source có vào giỏ hàng (`cart_items`) không, hay mua trực tiếp? → hỏi PO. `cart_items` hiện FK `asset_id`, nếu cho game vào giỏ thì thêm `game_id` tương tự orders.
8. **Frontend:**
   - UploadPage: game `publishingType=marketplace_listing` đã submit repo (đã có). Cần UI niêm yết giá + nút "publish to market".
   - MarketplacePage: thêm section/tab hiển thị **game market** (game bán source) — khác section asset.
   - Mua/tải: `marketplaceItemType='game_source'` (FE đã chuẩn bị type này ở Phase 1).

### 2.4 Tái dùng (đã có sẵn — ĐỪNG viết mới)
- `GameServiceImpl.submitGameRepo` — verify repo cho game (giống submitItemRepo asset đã xóa).
- `GameServiceImpl.saveSnapshotForGame` + `uploadSourceBundle` — đã upload bundle game lên storage.
- `gitHubRepoService`, `sourceProcessingClient` — clone/scan.
- `mediaRepository.findByOwnerTypeAndOwnerIdAndMediaType`.

### 2.5 ⚠️ Rủi ro Phase 2
Đụng **payment/order/cart** → rủi ro cao. Làm cẩn thận, test kỹ luồng tiền (xem mục 4.2).
DB đang TRỐNG (chưa có game/asset thật) → thời điểm tốt để sửa schema.

---

## 3. PHASE 3 — Chuẩn hóa Media (1 nguồn sự thật) — TODO

### 3.1 Vấn đề hiện tại (QUAN TRỌNG — đã phát hiện)
**Game và Asset lưu thumbnail KHÁC NHAU → lủng củng:**
| | Game | Asset |
|---|---|---|
| Lưu thumbnail | **field rời** `game.thumbnail_url` (set ở GameServiceImpl:447, 495) | **bảng `media`** (media_type='thumbnail', đọc ở AssetServiceImpl:461) |

→ Asset thực ra ĐÃ chuyển sang `media` table, nhưng entity vẫn còn field `thumbnail_url` **thừa/chết** (không ai set).
→ Game vẫn dùng field rời. **Cần thống nhất: tất cả qua bảng `media`.**

### 3.2 Bảng `media` (đã có sẵn)
```
media: id, owner_type ('game'|'marketplace_item'), owner_id, media_type ('thumbnail'|'screenshot'|'video'|'asset_image'), media_url, created_at
```
Polymorphic (KHÔNG FK cứng — vì owner trỏ 2 bảng). Query: `mediaRepository.findByOwnerTypeAndOwnerIdAndMediaType(...)`.
**Đây là lý do Game ↔ Media "không có @OneToMany/FK"** — cố ý, đúng thiết kế polymorphic.

### 3.3 Việc cần làm
1. **CHỈ bỏ `thumbnail_url`** khỏi Game + Asset. **GIỮ `version` + `supported_platforms`** ở Asset
   (đây là metadata mô tả, KHÔNG phải media — media table chỉ chứa url ảnh/video, không chứa được "1.0.0" hay "Windows").
2. **Migration mới:**
   - (DB trống nên không cần migrate data) `ALTER TABLE games DROP COLUMN thumbnail_url;`
   - `ALTER TABLE assets DROP COLUMN thumbnail_url;`
   - `MediaOwnerType`: đổi value `marketplace_item` → `asset`. `media.owner_type` là VARCHAR(20) (KHÔNG phải Postgres enum) → chỉ cần `UPDATE media SET owner_type='asset' WHERE owner_type='marketplace_item'` + sửa Java enum `MediaOwnerType`.
3. **Entity:** `Game.java` + `Asset.java` bỏ field `thumbnailUrl`.
4. **Service:** mọi nơi đọc `game.getThumbnailUrl()` → query media table. GameServiceImpl phải set thumbnail vào `media` (như Asset đã làm) thay vì field rời. Sửa: GameServiceImpl dòng 79, 398, 425, 444-447, 495, 603; AdminStorageController dòng 314-345, 526, 540.
5. **mapToResponse (Game + Asset):** field `thumbnailUrl` trong response VẪN GIỮ (cho FE tiện) nhưng **nguồn là bảng media** (tổng hợp từ media_type='thumbnail'), không phải field DB.
6. **MediaOwnerType.marketplace_item → asset:** sửa Java enum + mọi caller (AiReviewServiceImpl dòng 110-111, AssetServiceImpl, AdminStorageController...).

### 3.4 ⚠️ Lưu ý Phase 3
- `file_url` GIỮ NGUYÊN (file sản phẩm thật, không phải media).
- Response DTO vẫn nên có `thumbnailUrl` (FE đang dùng) — chỉ đổi NGUỒN, không bỏ field response.

---

## 4. CHECKLIST TEST (làm sau mỗi Phase)

### 4.0 Setup môi trường test
```bash
# 1. Hạ tầng (postgres, mongo, seaweedfs, clamav, ai-service)
docker compose up -d postgres mongodb seaweedfs-master seaweedfs-volume seaweedfs-filer clamav
docker compose up -d ai-service   # (cần cho AI review; build ~10p lần đầu)

# 2. Backend (Flyway tự chạy migration mới khi boot)
cd backend && ./mvnw -o spring-boot:run
# → chờ "Started BackendApplication" = Flyway OK + Hibernate validate pass

# 3. Frontend
cd frontend && npm run dev   # port 3000

# DB cred: user=postgres pass=12345 (backend/.env). Kiểm migration:
docker exec -e PGPASSWORD=12345 godotlaunch-postgres psql -U postgres -d godot_launch -c \
  "SELECT max(version::int) FROM flyway_schema_history WHERE version ~ '^[0-9]+$';"
```

### 4.1 Test PHASE 1 (Asset = tài nguyên lẻ)
**Backend boot:** `Started BackendApplication` không lỗi Flyway/validate = PASS (entity Asset khớp DB).

**Schema (psql):** `assets` KHÔNG còn cột `item_type`, `source_game_id`, `github_repo_url`, `github_verified_at`:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='assets';
-- mong đợi: id, seller_id, category_id, title, description, price, file_url, status, thumbnail_url, version, supported_platforms, created_at, updated_at
```

**API test (Swagger `/swagger-ui.html` hoặc Postman):**
| Endpoint | Test | Mong đợi |
|---|---|---|
| `POST /api/v1/assets` | Tạo asset (chỉ title, price, category, version) — KHÔNG gửi itemType/githubRepoUrl | 200, tạo asset (cần face-verified seller) |
| `POST /api/v1/assets/{id}/upload` | Upload file zip asset | 200, virus scan + AI review media chạy |
| `POST /api/v1/assets/{id}/media` | Upload thumbnail/screenshot (mediaType param) | 200, lưu vào bảng media |
| `GET /api/v1/assets/{id}` | Lấy asset | KHÔNG còn field itemType/sourceGame/github trong response |
| `POST /api/v1/assets/{id}/submit-repo` | (endpoint ĐÃ XÓA) | **404** (đúng — không còn) |
| `POST /api/v1/assets/accept-bot` | (ĐÃ XÓA) | **404** |
| `GET /api/v1/assets/{id}/source-bundle` | (ĐÃ XÓA) | **404** |

**Frontend (luồng UI):**
1. `/upload` → chọn tab **Marketplace** → KHÔNG còn lựa chọn "Source Code / Asset Pack" (chỉ asset).
2. KHÔNG còn ô nhập "GitHub Repository Link" ở marketplace. Có ô upload file zip + ảnh preview.
3. Tạo asset → upload file + thumbnail → submit → vào "pending".
4. `/marketplace` → KHÔNG còn section "Source Code", chỉ section asset listings.
5. Admin `/admin` → moderation marketplace: badge luôn "RESOURCE ASSET", KHÔNG còn GitHub repo / Linked Store Game của asset.
6. Mua asset (PayOS) → thanh toán → tải file (download) → OK.

**Regression (đảm bảo game KHÔNG bị ảnh hưởng):**
- `/upload` tab **Game** → submit repo GitHub → verify/clone/scan vẫn chạy (game flow độc lập, không đụng).
- Admin duyệt game (full_acquisition/co_publishing) → contract flow vẫn OK.

### 4.2 Test PHASE 2 (Game market — sau khi làm)
| Luồng | Test | Mong đợi |
|---|---|---|
| Submit game market | Game `publishingType=marketplace_listing` → submitGameRepo | clone/scan/snapshot OK, approve → published ngay (không contract) |
| Mua source game | Buyer mua game market qua PayOS | tạo order (game_id), transaction `source_code_purchase`, tiền vào ví seller |
| Tải source game | Người đã mua tải | trả bundle từ source_snapshots.game_id, ghi source_downloads.game_id |
| Phân quyền tải | admin / seller / người đã mua = OK; người lạ = 403 | đúng |
| **Ràng buộc nghiệp vụ** | Game đã lên STORE → thử đổi sang MARKET | **bị chặn** (publishingType immutable sau approved) |
| Regression asset | Mua/tải asset vẫn OK (không vỡ khi thêm game purchase) | OK |

### 4.3 Test PHASE 3 (Media thống nhất — sau khi làm)
| Test | Mong đợi |
|---|---|
| Schema | `games` + `assets` KHÔNG còn cột `thumbnail_url` |
| `media.owner_type` | dùng `'game'` / `'asset'` (không còn `marketplace_item`) |
| Upload thumbnail game | lưu vào bảng `media` (owner_type='game', media_type='thumbnail'), KHÔNG vào field rời |
| GET game/asset response | `thumbnailUrl` vẫn có (tổng hợp từ media table) |
| FE hiển thị | thumbnail game + asset hiển thị đúng (đọc từ response) |
| Regression | upload/đọc media (screenshot/video) vẫn OK |

---

## 5. Lệnh verify nhanh (mỗi phase)
```bash
# Backend build
cd backend && ./mvnw -o compile        # → BUILD SUCCESS

# Backend boot + Flyway (chờ "Started BackendApplication")
cd backend && ./mvnw -o spring-boot:run

# Frontend typecheck
cd frontend && npx tsc --noEmit         # → 0 lỗi

# Grep sạch (Phase 1): không còn source_code/sourceGame của ASSET trong BE
grep -rn "getSourceGame\|getItemType\|submitItemRepo\|enums.ItemType" backend/src/main/java/   # → rỗng

# Kiểm schema
docker exec -e PGPASSWORD=12345 godotlaunch-postgres psql -U postgres -d godot_launch -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name='assets' ORDER BY ordinal_position;"
```

---

## 6. Tóm tắt cho người tiếp nhận
- **Phase 1 XONG** — chỉ cần test theo mục 4.1 + commit (chưa commit).
- **Phase 2** — wire bán source game: đụng payment/order, rủi ro cao, theo mục 2.3. Test mục 4.2.
- **Phase 3** — bỏ `thumbnail_url` rời (CHỈ thumbnail, GIỮ version/supportedPlatforms), media thống nhất qua bảng `media`. Theo mục 3.3. Test mục 4.3.
- File migration kế tiếp: **V58** (V57 đã dùng cho Phase 1).
