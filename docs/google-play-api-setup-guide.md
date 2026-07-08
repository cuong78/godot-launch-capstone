# GodotLaunch — Chốt luồng "Push to Store" & cách lấy API Google Play

> Tài liệu bổ sung cho [google-play-publish-flow.md](google-play-publish-flow.md) (mô tả implementation/code).
> File này trả lời 2 câu hỏi: **"luồng hiện tại chạy như thế nào"** và **"làm sao để lấy được API/credential thật để bật real mode"**.
>
> Lưu ý: [google-play-publish-flow.md](google-play-publish-flow.md) được viết ở một session trước và
> **chưa cập nhật** các thay đổi mới nhất (shortDescription/feature graphic bắt buộc, bước gán release
> track, version number tự lấy, tách bảng Marketplace/Store trên AdminPage...). Coi file này là nguồn
> đúng nhất về trạng thái hiện tại.

---

## 1. Chốt luồng "Push to Store" — trạng thái hiện tại

### Phase 0 — Setup nền tảng (làm 1 lần, dùng chung cho mọi game sau này)

- Tài khoản Google Play Console (tổ chức/cá nhân — hiện tại: **GodotLaunch**)
- Google Cloud project + Service Account + file JSON key
- Cấp quyền cho service account — **nên cấp ở cấp tài khoản (account-level)**, không cấp riêng
  từng app, để app mới tạo sau này tự động được service account đó có quyền truy cập
- Config backend (`application.yaml` / `.env`):

```yaml
app:
  google-play:
    mock: ${GOOGLE_PLAY_MOCK:true}
    poll-interval-ms: ${GOOGLE_PLAY_POLL_INTERVAL_MS:1800000}
    mock-review-delay-seconds: ${GOOGLE_PLAY_MOCK_REVIEW_DELAY_SECONDS:30}
    service-account-path: ${GOOGLE_PLAY_SERVICE_ACCOUNT_PATH:}
    package-name: ${GOOGLE_PLAY_PACKAGE_NAME:}
    track: ${GOOGLE_PLAY_TRACK:production}
```

> **Giới hạn kiến trúc hiện tại**: `package-name` là 1 giá trị cố định toàn hệ thống (env var), nghĩa
> là code hiện chỉ push được cho **1 package name duy nhất**. Nếu cần hỗ trợ nhiều game với nhiều
> package name khác nhau, phải thêm cột `package_name` vào bảng `games` và đọc theo từng game thay
> vì lấy cố định từ config — **chưa làm ở phiên bản hiện tại**.

### Phase 1 — Setup riêng cho MỖI game mới (bắt buộc làm tay, Google không cho tự động hoá)

1. Tạo app trong Play Console (đặt package name riêng cho game đó) — androidpublisher API
   **không có endpoint tạo app**, phải tạo thủ công.
2. Điền đầy đủ mục **"Nội dung ứng dụng"** (App content): content rating questionnaire, data safety
   form, Privacy Policy URL, ads declaration, target audience. Thiếu mục nào Play Console chặn hẳn
   release, dù code gọi API đúng cũng bị từ chối.
3. Nếu là personal developer account mới (tạo sau 13/11/2023): phải chạy **closed testing với tối
   thiểu 12 tester, opted-in liên tục 14 ngày** trước khi được cấp quyền lên track `production`.
4. Upload bản release **đầu tiên hoàn toàn thủ công** qua Play Console UI (giới hạn cứng của API —
   Google không cho dùng API để tạo release đầu tiên của app mới). Sau bước này app hết trạng thái
   "Bản nháp", các lần cập nhật tiếp theo mới dùng được luồng tự động ở Phase 2.

### Phase 2 — Luồng trong GodotLaunch (đã code xong, tự động từ đây)

```
Developer submit game (publishingType = full_acquisition / co_publishing)
        ↓
Admin duyệt → game.status = approved
        ↓
Admin tạo contract offer (ký sẵn bằng SignaturePad) → Developer ký hợp đồng
        ↓
game.status = awaiting_store_build
        ↓
Admin tự export APK/AAB bằng Godot Editor (dùng keystore riêng của admin, ký release build)
        ↓
AdminPage → nhóm "Push to Store" (đã tách riêng khỏi nhóm "Marketplace Listing" trong bảng)
  → chọn file AAB + short description (≤80 ký tự) + feature graphic (1024x500)
  → version number TỰ ĐỘNG lấy (không cho gõ tay — mặc định 1.0.0 hoặc version hiện có của game)
  → validate trước khi gọi Google Play:
      - game phải có thumbnail (dùng làm icon) và tối thiểu 2 screenshot
      - version đang chọn không được trùng với 1 bản đang "submitted" hoặc đã "live"
        (nếu bản trước bị "rejected" thì cho phép nộp lại đúng version đó)
        ↓
Bấm "Upload & Submit lên Google Play" → hệ thống tự động:
  1. Tạo edit session (POST /edits)
  2. Upload bundle (PUT /edits/{id}/bundles) → lấy versionCode
  3. Update listing — title, shortDescription, fullDescription (PUT /edits/{id}/listings/{lang})
  4. Upload ảnh: icon (từ thumbnail có sẵn) + feature graphic + toàn bộ screenshot
     (POST /edits/{id}/listings/{lang}/images/{icon|featureGraphic|phoneScreenshots})
  5. Update contact email của developer (PUT /edits/{id}/details)
  6. Gán versionCode vào release track (PUT /edits/{id}/tracks/{track}) — bước từng bị THIẾU ở
     bản code cũ; thiếu bước này commit vẫn "thành công" nhưng KHÔNG thực sự release version nào
  7. Commit edit (POST /edits/{id}:commit)
        ↓
ExternalPublish.status = submitted
```

### Phase 3 — Sau khi submit (tự động, không cần admin canh Play Console)

- `ExternalPublishPollingService` (`@Scheduled`, mặc định 30 phút/lần) tự kiểm tra các bản đang
  `submitted` — Google Play không có webhook nên phải polling.
- Google duyệt xong → `ExternalPublish.status = live`, `game.status = published`, lưu `storeUrl`,
  **tự động thông báo cho developer**.
- Google từ chối → `ExternalPublish.status = rejected` kèm lý do, `game.status` **giữ nguyên**
  `awaiting_store_build`, **tự động thông báo cho admin** → admin sửa & nộp lại (được phép dùng lại
  đúng version cũ vì lần trước chưa thành công).

### Hiển thị trên UI (đã tách riêng theo yêu cầu)

- **Marketplace** (trang công khai): tách tab **Assets** và tab **Games (Source Code)** riêng biệt —
  game nào đã `published` qua Google Play (full_acquisition/co_publishing) **không còn hiển thị**
  trên Marketplace nữa (không còn bán source code sau khi đã bị acquire).
- **AdminPage** (bảng quản trị game): nhóm **Marketplace Listing** và nhóm **Push to Store** hiển thị
  tách biệt bằng divider header ngay trong cùng 1 bảng; badge trạng thái hiển thị đầy đủ cả 6 giá trị
  `GameStatus` (Draft/Pending/Approved/Rejected/Awaiting Build/Published) + badge trạng thái Google
  Play riêng (submitted/live/rejected) ngay trong hàng, không cần mở rộng chi tiết mới thấy.

---

## 2. Các cách lấy API / credential Google Play

### Bước 1 — Tài khoản Google Play Console
Đăng ký tại [Play Console](https://play.google.com/console) — phí 1 lần 25 USD, cần xác minh danh
tính (có thể mất vài ngày với account mới).

### Bước 2 — Tạo Google Cloud project + Service Account
1. Vào [Google Cloud Console](https://console.cloud.google.com) → tạo project mới (hoặc dùng project có sẵn).
2. Bật **Google Play Android Developer API** cho project đó.
3. **IAM & Admin → Service Accounts → Create Service Account** — đặt tên bất kỳ.
4. Vào service account vừa tạo → tab **Keys → Add Key → Create new key → JSON** → tải file JSON về —
   đây chính là file dùng cho `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`.

### Bước 3 — Cấp quyền cho Service Account trong Play Console
1. Play Console → **Setup → API access**.
2. Link tới đúng GCP project ở Bước 2.
3. Tìm service account vừa tạo → **Manage Play Console permissions**.
4. Cấp quyền tối thiểu: **Release to production/testing tracks** + **View app information**.
   Nên cấp ở cấp tài khoản để áp dụng tự động cho mọi app tạo sau này.

### Bước 4 — Set biến môi trường backend
```
GOOGLE_PLAY_MOCK=false
GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=/đường/dẫn/tới/service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.godotlaunch.yourgame
GOOGLE_PLAY_TRACK=production   # hoặc "internal" nếu còn đang closed testing
```

### Tài liệu chính thức (đã xác minh qua tìm kiếm, không suy đoán)

| Chủ đề | Link |
|---|---|
| Tổng quan Google Play Developer API | https://developers.google.com/android-publisher |
| REST API Reference đầy đủ (edits, tracks, bundles, images, listings...) | https://developers.google.com/android-publisher/api-ref/rest |
| Getting Started (setup service account, OAuth, quota) | https://developers.google.com/android-publisher/getting_started |
| Content rating requirements | https://support.google.com/googleplay/android-developer/answer/9859655 |
| Data safety section (bắt buộc, kể cả app không thu thập dữ liệu) | https://support.google.com/googleplay/android-developer/answer/10787469 |
| Chuẩn bị app để review (checklist trước khi submit) | https://support.google.com/googleplay/android-developer/answer/9859455 |
| Yêu cầu closed testing cho personal account mới (12 tester/14 ngày) | https://support.google.com/googleplay/android-developer/answer/14151465 |
| Developer Program Policy | https://support.google.com/googleplay/android-developer/answer/17105854 |

> Lưu ý: yêu cầu closed testing đã được Google **hạ từ 20 xuống 12 tester** kể từ tháng 12/2024 —
> nếu đọc thấy tài liệu/bài viết nào ghi "20 tester", đó là thông tin cũ.

---

## 3. Việc còn thiếu / cần làm tiếp

- [ ] Hoàn thành Phase 1 cho app test hiện tại (Flappy Bird): điền "Nội dung ứng dụng" → upload
      release đầu tiên thủ công qua Play Console.
- [ ] Quyết định có cần hỗ trợ nhiều package name (nhiều game khác nhau cùng lúc) hay không — nếu có,
      cần thêm cột `package_name` vào bảng `games` thay vì dùng 1 env var cố định.
- [ ] Chưa test end-to-end với credential thật (`GOOGLE_PLAY_MOCK=false`) trong môi trường dev — mock
      mode đã verify đủ logic code, còn real mode cần provision đủ Phase 0 + Phase 1 trước khi thử.
