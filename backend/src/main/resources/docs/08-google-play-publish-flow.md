# 08. GodotLaunch — Luồng Push Game lên Google Play (CH Play)

## 1. Mục tiêu tài liệu

Tài liệu này mô tả luồng "to store" (`publishingType = full_acquisition | co_publishing`):
từ lúc developer submit game → AI review → admin soạn + ký hợp đồng → developer ký/từ chối →
admin upload build → hệ thống tự động submit lên Google Play → polling kết quả duyệt.

Bám theo implementation hiện tại trong source code. Thiết kế gốc:
[docs/diagram/2 push-game-sequence.puml](diagram/2%20push-game-sequence.puml),
ghi chú nghiệp vụ: [00. Tổng quan nghiệp vụ](00-flow-overview.md) mục 2.2.

---

## 2. Tổng quan luồng

```text
Dev submit game qua repo GitHub (KHÔNG có Web Demo cho full_acquisition/co_publishing)
  → verify owner + clone + virus scan + snapshot commit
  → AI review chạy nền (code quality, media match, NSFW, description/tags match)
  → game.status = pending

Admin xem AI review report → quyết định:
  ├─ Từ chối game → game.status = rejected
  └─ Duyệt → soạn hợp đồng (điền điều khoản + KÝ NGAY bằng SignaturePad)
       → contract.status = pending, buyerSignatureBase64 + signedAtBuyer đã lưu
       → notify developer (CONTRACT_OFFERED)

Developer xem hợp đồng:
  ├─ Từ chối kèm lý do → contract.status = cancelled, rejectionReason lưu lại
  │    → game.status quay về pending
  │    → Admin sửa điều khoản, "Chào lại HĐ" → UPDATE cùng 1 row hợp đồng (không insert mới)
  │    → lặp lại tới khi dev ký hoặc admin dừng đàm phán
  └─ Ký (đồng ý) → contract.status = signed
       → game.status = awaiting_store_build  (CHƯA publish)
       → notify admin (SELLER_RESPONSE)

Admin export APK/AAB từ Godot Editor (thủ công, ngoài hệ thống)
  → vào khu vực "Push Google Play" → upload file + version number + changelog
  → tạo GameVersion mới (is_current = true, version cũ set false)
  → GooglePlayPublishService.publishGameToStore(version)
       → tạo ExternalPublish { status = submitted, submittedAt = now }
       → (real mode) POST /edits → PUT bundles → PUT listings → POST edits:commit
       → (mock mode) không gọi API thật, chỉ đánh dấu submitted

ExternalPublishPollingService (@Scheduled, Google Play KHÔNG có webhook):
  → định kỳ kiểm tra các ExternalPublish đang "submitted"
  ├─ Google Play duyệt / mock hết thời gian giả lập
  │    → ExternalPublish.status = live, liveAt, storeUrl
  │    → game.status = published
  │    → notify developer
  └─ Google Play từ chối
       → ExternalPublish.status = rejected, rejectedReason
       → game.status GIỮ NGUYÊN awaiting_store_build (admin sửa build, upload lại)
       → notify admin
```

---

## 3. State machine

### `Game.status` (enum `game_status_enum`)
```
draft → pending → awaiting_store_build → published
              └→ rejected
```
`awaiting_store_build` là giá trị **mới thêm** (migration `V32`) — đại diện cho "hợp đồng đã ký
xong, đang chờ admin upload build lên Google Play".

### `Contract.status` (enum `contract_status_enum` — không đổi so với migration V21)
```
pending → signed
       └→ cancelled  (dev từ chối — admin sửa lại CÙNG 1 ROW, quay lại pending)
```
Không còn `negotiating`/`re_issued` — 2 giá trị này đã bị dọn khỏi frontend vì không tồn tại
trong enum thật từ lâu (dead code sót lại từ mô hình N:1 cũ trước migration V21).

### `ExternalPublish.status` (enum `ext_status_enum`, bảng có sẵn từ V1)
```
pending → submitted → live
                   └→ rejected  (admin upload GameVersion mới → submitted lại)
```

---

## 4. Những gì đã sửa / thêm so với code cũ

Code hợp đồng cũ có 3 vấn đề chặn hẳn luồng này, đã fix trong lượt này:

| Vấn đề cũ | Fix |
|---|---|
| `createOffer` luôn `new Contract()` + insert, trong khi `contracts` có `UNIQUE(game_id)` → chào lại hợp đồng vòng 2 vỡ constraint, lỗi 500 | Tìm contract hiện có theo `game_id`, **update tại chỗ** thay vì insert mới |
| Admin không hề ký lúc tạo offer (`buyerSignatureBase64`/`signedAtBuyer` map cứng `null`, dù DTO đã có field) | Thêm cột thật (`V31`), bắt buộc admin ký bằng `SignaturePad` ngay trong modal soạn hợp đồng |
| `signByDeveloper` set `game.status = published` **ngay lập tức**, bỏ qua hoàn toàn bước build + Google Play duyệt | Đổi thành `game.status = awaiting_store_build`; chỉ `published` khi `ExternalPublish` thật sự `live` |
| `signByAdmin` (countersign sau khi dev ký) là dead code không bao giờ chạy được (điều kiện `status == pending` không bao giờ đúng vì dev ký đã set `signed`) | Xoá hẳn endpoint `/sign/admin` + UI liên quan |
| `NotificationType.CONTRACT_OFFERED`/`SELLER_RESPONSE` định nghĩa sẵn nhưng chưa từng gọi | Wire vào `createOffer`, `signByDeveloper`, `rejectByDeveloper`, và polling job |
| `external_publishes`/`game_versions` có bảng + 1 phần entity từ trước nhưng chưa có Repository/Service/Controller, `GooglePlayPublishService` chưa tồn tại | Thêm đầy đủ theo Phần C/D bên dưới |

---

## 5. Các thành phần chính

### Backend — Hợp đồng (Phần A)
- `entity/Contract.java` — thêm `buyerSignatureBase64`, `signedAtBuyer`
- `entity/enums/GameStatus.java` — thêm `awaiting_store_build`
- `db/migration/V31__add_buyer_signature_to_contracts.sql`
- `db/migration/V32__add_game_status_awaiting_store_build.sql`
- `repository/ContractRepository.java` — thêm `findFirstByGameId`
- `repository/UserRepository.java` — thêm `findByRole_NameIgnoreCase` (dùng để notify tất cả admin)
- `service/impl/ContractServiceImpl.java` — `createOffer` (update-in-place + chữ ký admin bắt buộc),
  `signByDeveloper` (không auto-publish), `rejectByDeveloper` (notify), bỏ `signByAdmin`
- `controller/ContractController.java` — bỏ endpoint `/sign/admin`

### Backend — Push Google Play (Phần C/D)
- `entity/GameVersion.java`, `entity/ExternalPublish.java`, `entity/enums/ExtStatus.java` (đã có sẵn từ trước)
- `repository/GameVersionRepository.java`, `repository/ExternalPublishRepository.java` — **mới**
- `entity/enums/FileType.java` — thêm `game_build`
- `service/StorePublishService.java` + `service/impl/StorePublishServiceImpl.java` — upload build,
  tạo `GameVersion`, gọi `GooglePlayPublishService`
- `service/GooglePlayPublishService.java` — interface: `publishGameToStore(version)`,
  `checkReviewStatus(publish)`
- `service/impl/MockGooglePlayPublishServiceImpl.java` — mặc định (`app.google-play.mock=true`),
  giả lập submitted → live sau `mock-review-delay-seconds` (mặc định 30s)
- `service/impl/RealGooglePlayPublishServiceImpl.java` — gọi thật Google Play Developer API
  (androidpublisher) qua `RestTemplate` + service account (`com.google.auth:google-auth-library-oauth2-http`)
- `service/impl/ExternalPublishPollingService.java` — `@Scheduled` (job đầu tiên trong repo,
  cần `@EnableScheduling` đã thêm vào `BackendApplication.java`)
- `controller/AdminGameController.java` — thêm `POST /{id}/store-build`, `GET /{id}/store-publish`

### Frontend
- `frontend/src/page/UploadPage.tsx` — ẩn "Web Demo ZIP" khi `publishingType !== 'marketplace_listing'`
- `frontend/src/page/AdminPage.tsx` — modal soạn hợp đồng có `SignaturePad` bắt buộc; cột
  "Decisions" tính lại theo state machine mới (Soạn HĐ / Chờ Dev ký / Chờ Upload Build / Live /
  Chào lại HĐ); khu vực chi tiết game có thêm `<ExternalPublishStatusCard>`
- `frontend/src/components/ContractViewerModal.tsx` — bỏ `mode="sign-admin"` (dead), sửa status label
- `frontend/src/components/ExternalPublishStatusCard.tsx` — **mới**: form upload build +
  hiển thị trạng thái Google Play
- `frontend/src/api/contractApi.ts` — bỏ `signByAdmin`
- `frontend/src/api/storePublishApi.ts` — **mới**: `uploadBuild`, `getStatus`
- `frontend/src/types.ts` — thêm `ExternalPublishResponse`, `ExtStatus`

---

## 6. Cấu hình (`application.yaml` / `.env`)

```yaml
app:
  google-play:
    mock: ${GOOGLE_PLAY_MOCK:true}                       # true = không gọi API Google thật
    poll-interval-ms: ${GOOGLE_PLAY_POLL_INTERVAL_MS:1800000}   # 30 phút (prod)
    mock-review-delay-seconds: ${GOOGLE_PLAY_MOCK_REVIEW_DELAY_SECONDS:30}
    service-account-path: ${GOOGLE_PLAY_SERVICE_ACCOUNT_PATH:}  # chỉ cần khi mock=false
    package-name: ${GOOGLE_PLAY_PACKAGE_NAME:}                  # chỉ cần khi mock=false
```

Mặc định chạy **mock mode** — test được toàn bộ flow (upload build → submitted → live sau ~30s)
mà không cần service account thật. Muốn dùng API Google Play thật: set `GOOGLE_PLAY_MOCK=false`
+ cấp `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH` (file JSON service account từ Play Console) +
`GOOGLE_PLAY_PACKAGE_NAME` (package đã đăng ký sẵn trong Play Console).

---

## 7. Giới hạn hiện tại / việc còn lại

- **Build APK/AAB vẫn phải export thủ công** từ Godot Editor ngoài hệ thống — không có pipeline
  tự động build từ source repo (đúng theo thiết kế gốc trong `.puml`, không phải thiếu sót).
- `RealGooglePlayPublishServiceImpl.checkReviewStatus` dùng cách kiểm tra "trang Play Store công
  khai đã hiển thị chưa" (Google Play không có endpoint chính thức trả "review xong chưa") — nếu
  cần chính xác hơn, cân nhắc tích hợp thêm Google Play Developer Reporting API.
- Chưa test end-to-end với credential Google Play thật (không có sẵn trong môi trường dev) — mock
  mode đã verify code compile + logic, real mode cần provision credential trước khi dùng thật.
