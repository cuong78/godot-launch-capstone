# 07. Live Preview (Game Web Demo)

> Bối cảnh: hội đồng phản biện hỏi "buyer mua source game dựa vào đâu để tin tưởng,
> ngoài ảnh/video trailer?" — ảnh/video là nội dung seller tự chọn, không chứng minh
> được chất lượng/gameplay thật. Câu trả lời: cho buyer **chơi thử bản Web build thật**
> ngay trên trình duyệt trước khi mua, không lộ source.
>
> Quyết định đã chốt:
> - **Chỉ áp dụng cho Game** (mua source game). **KHÔNG áp dụng cho Asset** — asset
>   (ảnh/model/audio) nhìn preview ảnh là đủ, làm thêm demo chạy được là dư thừa.
> - Seller **tự export và upload** bản Web demo riêng, tách biệt hoàn toàn với
>   source code bán. Hệ thống KHÔNG tự build hộ từ source (đơn giản, an toàn, seller
>   tự chịu trách nhiệm giới hạn nội dung demo).
> - Nhúng bằng `<iframe sandbox>` — không cần APK, không cần hạ tầng build riêng.

---

## 0. Nguyên tắc

```
Web demo = bản GIỚI HẠN, KHÔNG PHẢI build đầy đủ.
  → Nếu là bản đầy đủ, buyer chơi được miễn phí toàn bộ game → mất động lực mua.
  → Seller tự export riêng (VD: chỉ 1 level, cắt bớt tính năng), tự chịu trách nhiệm.

Web build = WebAssembly đã compile, KHÔNG PHẢI source đọc được.
  → Buyer chơi được gameplay thật, nhưng không xem/copy được mã .gd gốc.
  → An toàn hơn hẳn phương án "cho xem trực tiếp vài file code mẫu".
```

---

## 1. Vì sao Web export (không phải APK)

| | Web export (Godot) | APK |
|---|---|---|
| Chạy ở đâu | Ngay trong `<iframe>` trên trang chi tiết game | Phải cài lên điện thoại Android |
| Dùng để làm gì ở đây | Live Preview — chơi thử trước khi mua | Luồng publish lên Google Play (`ExternalPublish`) — không liên quan Live Preview |
| Buyer cần làm gì | Không cần gì — mở trang là chơi được | Phải tải + cài đặt |

Godot **đã hỗ trợ sẵn** export sang Web (HTML5/WebAssembly) — không cần tự xây engine hay hạ tầng build. Developer vào **Project → Export → preset "Web"**, Godot tự sinh:

```
index.html   ← trang HTML để nhúng iframe
index.js     ← loader JavaScript
index.wasm   ← code game đã compile sang WebAssembly
index.pck    ← toàn bộ asset đóng gói
```

Developer nén 4 file này thành `.zip`, upload lên GodotLaunch qua nút riêng ("Upload Web Demo") — tách biệt hoàn toàn với nút "Upload Source Code".

---

## 2. Entity (đã làm)

### `Game.webDemoUrl`
```java
// Trỏ tới index.html bản Web build (Godot export "Web") đã giải nén trên
// storage — cho buyer chơi thử ngay trên trình duyệt trước khi mua, KHÔNG
// lộ source (WebAssembly đã biên dịch). NULL nếu seller không cung cấp.
// Seller tự chịu trách nhiệm giới hạn nội dung bản demo.
@Column(name = "web_demo_url", columnDefinition = "TEXT")
private String webDemoUrl;
```
NULL = seller không cung cấp demo (fallback về ảnh/video trailer như cũ).

### `FileType.web_demo` (mới)
```java
web_demo,  // Godot export "Web" (.html/.js/.wasm/.pck) — Live Preview chơi thử trước khi mua
```

### Migration
`V22__add_game_web_demo.sql` — `ALTER TABLE games ADD COLUMN web_demo_url text;`

---

## 3. Luồng upload (service — chưa làm)

```
Developer export Web (Godot) → nén .zip (index.html/.js/.wasm/.pck)
  → upload qua endpoint riêng, FileType.web_demo
  → backend: virus scan (tái dùng ClamAV, pattern giống SourceSnapshot)
             → giải nén ra 1 thư mục public trên storage (SeaweedFS)
             → lưu path tới index.html vào Game.webDemoUrl
```

### Giới hạn cần áp dụng
- Dung lượng zip tối đa (đề xuất 50-100MB) — tránh load chậm phản tác dụng (buyer mất kiên nhẫn thoát trang trước khi "cảm nhận" được gì)
- Virus scan trước khi giải nén (tái dùng cơ chế đã có ở `SourceSnapshot.virusClean/virusScanned`)
- Chỉ nhận đúng bộ 4 file Godot Web export — validate cấu trúc zip trước khi giải nén

---

## 4. Frontend — nhúng iframe (chưa làm)

```html
<iframe
  src="{game.webDemoUrl}"
  sandbox="allow-scripts allow-same-origin"
  width="800" height="600"
  loading="lazy">
</iframe>
```

- `sandbox` **bắt buộc** — nội dung là code người dùng khác upload lên, không kiểm soát được, phải cô lập để tránh XSS/tấn công qua iframe.
- Hiện ở trang chi tiết game, cạnh ảnh/video trailer — chỉ hiện nếu `webDemoUrl != null`.
- Độ nặng thực tế phụ thuộc kích thước `.wasm`/`.pck` (game 2D đơn giản: 10-30MB, tải vài giây; game 3D nhiều asset: có thể 100MB+) — Godot tự sinh sẵn màn hình loading trong bản export Web.

---

## 5. Chống lừa đảo — nối vào AI Review đã có (giai đoạn sau)

Seller có thể upload demo của **game khác** (hay hơn) để dụ mua, thay vì demo đúng game đang bán. Xử lý bằng cách mở rộng `AiReviewReport.mediaMatchScore` (đã có sẵn — xem [05. AI Review](05-ai-review-plan.md) mục 6.2):

```
Web demo build → chụp screenshot tự động (headless browser load iframe)
  → đưa vào CLIP cùng với title/description/category
  → nếu KHÔNG khớp → flag "demo content mismatch" cho admin xem
```

Không cần module AI mới — tái dùng pipeline CLIP media-match đã thiết kế cho ảnh/video, chỉ thêm 1 nguồn ảnh đầu vào (screenshot chụp từ demo).

---

## 6. Tasks tổng hợp

### Đã xong (entity)
- [x] `Game.webDemoUrl`
- [x] `FileType.web_demo`
- [x] Migration `V22`

### Cần làm (service + frontend)
- [ ] Endpoint upload Web demo riêng (`FileType.web_demo`) — validate cấu trúc zip (đúng bộ index.html/.js/.wasm/.pck)
- [ ] Giới hạn dung lượng upload (đề xuất 50-100MB)
- [ ] Virus scan trước khi giải nén (tái dùng pattern `SourceSnapshot`)
- [ ] Giải nén → serve static từ storage → lưu `webDemoUrl`
- [ ] Frontend: `<iframe sandbox>` ở trang chi tiết game, ẩn nếu `webDemoUrl == null`
- [ ] (Giai đoạn sau) Nối vào AI Review: chụp screenshot demo → CLIP match với mô tả game

---

## 7. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Seller upload bản đầy đủ thay vì demo giới hạn → buyer chơi free toàn bộ game | Seller tự chịu trách nhiệm (đã chốt); cân nhắc điều khoản rõ trong hướng dẫn upload |
| Seller upload demo game KHÁC để lừa buyer | Nối AI review (mục 5) — chưa làm ngay, ghi nhận rủi ro tạm thời ở giai đoạn đầu |
| Game 3D nặng → load chậm, buyer thoát trang | Giới hạn dung lượng upload + khuyến nghị seller tối ưu asset bản demo |
| XSS/tấn công qua nội dung iframe (code người dùng khác) | `sandbox` attribute bắt buộc, không có `allow-top-navigation`/`allow-popups` |
| Tốn storage nếu nhiều seller upload demo lớn | Giới hạn dung lượng; cân nhắc giới hạn 1 demo/game (ghi đè bản cũ khi upload mới) |

---

## 8. Những gì ĐÃ CÓ (tái sử dụng)

| Có sẵn | Dùng cho |
|---|---|
| StorageRouter + FileType | Thêm `web_demo`, upload/serve qua adapter có sẵn (SeaweedFS) |
| ClamAV (đã có, dùng cho source scan) | Virus scan zip trước khi giải nén |
| `AiReviewReport.mediaMatchScore` + CLIP pipeline | Đối chiếu demo ↔ mô tả game (giai đoạn sau, mục 5) |
| Pattern `SourceSnapshot` (virusClean/virusScanned) | Mẫu cho luồng scan Web demo zip |
