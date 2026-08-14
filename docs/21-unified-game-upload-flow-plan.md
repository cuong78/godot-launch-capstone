# 21. Kế hoạch: Unified Game Upload Flow (Gộp upload media & web demo game bằng thư mục zip)

> Tài liệu này mô tả chi tiết thiết kế luồng tải lên tài nguyên mô tả và bản chơi thử Web Demo của Game mới: thay vì nhà phát triển (Developer) phải upload từng thành phần thủ công (thumbnail, screenshots, video trailer, zip web demo), họ sẽ tải xuống một file template mẫu và chỉ cần tải lên một file ZIP duy nhất chứa đầy đủ cấu trúc quy định. Hệ thống Backend sẽ tự động giải nén, phân tách và xử lý lưu trữ ở chế độ chạy nền (bất đồng bộ) để phòng ngừa Timeout, quét virus và chặn lỗi bảo mật.

---

## 1. Nguyên tắc nghiệp vụ (Business Rules)

### 1.1 Trải nghiệm người dùng hiện tại và cải tiến
- **Hiện trạng:** Khi đăng tải một Game trên nền tảng, tại Bước 2 của trang Upload (`UploadPage.tsx`), người dùng phải thực hiện tải lên riêng lẻ:
  - File ảnh đại diện (Thumbnail).
  - Nhiều file ảnh chụp màn hình (Screenshots).
  - File video trailer giới thiệu.
  - Gói ZIP chứa bản chơi thử Web Demo (Web HTML5 build).
  Thao tác này tốn nhiều bước chọn file, gửi nhiều HTTP requests riêng biệt, dễ gặp lỗi kết nối giữa chừng hoặc lỗi Timeout do file zip web demo có kích thước lớn.
- **Giải pháp mới:** 
  - Hiển thị cấu trúc thư mục chuẩn trực quan tại Bước 2 và cung cấp nút tải xuống **File Template mẫu (`game_template.zip`)**.
  - Người dùng chuẩn bị toàn bộ file mô tả game + file Web HTML5 build vào các thư mục tương ứng, nén lại thành 1 file ZIP lớn và kéo thả upload.
  - Hệ thống tự động phân tích và bóc tách tài nguyên thông qua tác vụ chạy nền bất đồng bộ (Asynchronous Background Task), cập nhật tiến trình trực tiếp trên UI.

### 1.2 Cấu trúc thư mục Template mẫu (`game_template.zip`)
Cây thư mục chuẩn quy định có định dạng như sau:
```text
game_template/
├── thumbnail/
│   └── thumbnail.png (hoặc .jpg, .jpeg - Ảnh đại diện chính, bắt buộc, tối đa 1 file)
├── screenshots/
│   ├── screenshot1.png
│   ├── screenshot2.png
│   └── ... (ảnh chụp mô tả game, tùy chọn, tối đa 10 file)
├── video/
│   └── trailer.mp4 (hoặc .mov, .avi - Trailer giới thiệu game, tùy chọn, tối đa 1 file)
└── web_demo/
    └── [Chứa toàn bộ các file export Web HTML5: index.html, index.js, index.wasm, index.pck, v.v.]
```

### 1.3 Quy tắc xử lý giải nén và phân tách tại Backend
Khi nhận được file ZIP gộp:
1. **Lưu trữ & Trả phản hồi nhanh:** Lưu file nén tạm thời và phản hồi `202 Accepted` ngay lập tức.
2. **Giải nén tạm thời (Chạy nền):** Thực hiện giải nén file ZIP vào thư mục tạm trên máy chủ.
3. **Tự động xử lý bọc ngoài (Unwrap folder):** Phát hiện nếu file zip được đóng gói chứa thư mục cha bọc ngoài (ví dụ `game_template/thumbnail/...`) để tự động định tuyến lại thư mục gốc xử lý.
4. **Xác thực cấu trúc (Validation):**
   - Bắt buộc phải có thư mục `thumbnail/` chứa ít nhất 1 ảnh hợp lệ.
   - Thư mục `screenshots/` chứa **tối đa 10 ảnh**.
   - Nếu có thư mục `web_demo/`, bắt buộc phải chứa các file chạy game HTML5 hợp lệ (phải có đủ file `.html`, `.js`, `.wasm`, `.pck`).
5. **Xử lý Thumbnail:** Upload lên SeaweedFS và gán vào trường `thumbnailUrl` của `Game`.
6. **Xử lý Screenshots:** Upload từng file lên SeaweedFS (được sắp xếp thứ tự chữ cái A-Z theo tên file), lưu vào bảng `Media` với loại `screenshot`.
7. **Xử lý Video Trailer (nếu có):** Upload lên SeaweedFS và lưu vào bảng `Media` với loại `video`.
8. **Xử lý Web Demo (nếu có):** Giải nén an toàn thư mục `web_demo/`, quét virus toàn bộ file con, upload đệ quy lên SeaweedFS dưới thư mục lưu trữ phiên bản `games/{gameId}/web_demo/{version}/` và lưu link file `.html` vào trường `webDemoUrl` của `Game`.
9. **Cập nhật trạng thái:** Cập nhật trạng thái `uploadStatus` thành `SUCCESS`. Kích hoạt quét virus ClamAV đối với file Web Demo.
10. **Dọn dẹp:** Xóa toàn bộ tài nguyên tạm thời trên đĩa cứng máy chủ.

---

## 2. Giải pháp Bảo mật & Hiệu năng (Security & Performance)

### 2.1 Phòng chống lỗi giải nén (Zip Slip & Zip Bomb)
*   **Chặn Zip Slip:** Chuẩn hóa đường dẫn canonical của từng entry và kiểm tra xem có vượt ra ngoài ranh giới thư mục tạm hay không (`!canonicalPath.startsWith(destDir.getCanonicalPath() + File.separator)`).
*   **Chặn Zip Bomb:** Đặt giới hạn dung lượng giải nén tối đa cho Game mô tả là `200 MB` (không tính file web demo lớn, file web demo được giới hạn ở ngưỡng tối đa riêng `300 MB`), giới hạn tối đa `1500` entry và tỷ lệ nén tối đa `100:1`.

### 2.2 Xử lý HTTP Timeout
*   Quá trình giải nén, quét virus ClamAV, upload đệ quy hàng chục file web demo lên SeaweedFS có thể tốn từ 30 giây đến vài phút.
*   Việc chuyển sang `@Async` chạy nền giúp tránh hoàn toàn lỗi 504 Gateway Timeout. Giao diện Frontend sẽ thực hiện Polling định kỳ 3 giây một lần tới endpoint `/api/v1/games/{id}/upload-status`.

---

## 3. Thiết kế API & Cơ sở Dữ liệu

### 3.1 Cấu trúc Cơ sở Dữ liệu
Bổ sung các trường theo dõi tiến trình upload chạy nền vào bảng `games` thông qua migration Flyway `V26__add_unified_upload_status_to_games.sql`:
```sql
ALTER TABLE public.games ADD COLUMN upload_status VARCHAR(50) DEFAULT 'PENDING_UPLOAD' NOT NULL;
ALTER TABLE public.games ADD COLUMN upload_error TEXT DEFAULT NULL;
```

### 3.2 Đặc tả API (Backend)

#### A. Tải xuống file Game Template mẫu
*   **Endpoint:** `GET /api/v1/games/template`
*   **Mô tả:** Trả về file tĩnh `game_template.zip` nằm trong tài nguyên dự án: `src/main/resources/static/templates/game_template.zip`.

#### B. Upload file ZIP gộp của Game
*   **Endpoint:** `POST /api/v1/games/{id}/upload-unified`
*   **Content-Type:** `multipart/form-data`
*   **Body:** `file` (MultipartFile)
*   **Response (HTTP 202 Accepted):**
    ```json
    {
      "success": true,
      "code": "PROCESSING",
      "data": {
        "gameId": "...",
        "status": "PROCESSING"
      }
    }
    ```

#### C. API Polling kiểm tra trạng thái xử lý
*   **Endpoint:** `GET /api/v1/games/{id}/upload-status`
*   **Response:** Trả về trạng thái xử lý `uploadStatus` (PROCESSING, SUCCESS, FAILED) và chi tiết lỗi nếu thất bại.

#### D. Sắp xếp thứ tự ảnh Screenshots
*   **Endpoint:** `PUT /api/v1/games/{id}/reorder-screenshots`
*   **Body:** `List<String>` (Mảng chứa các URL ảnh chụp màn hình theo thứ tự hiển thị mới)
*   **Mô tả:** Cập nhật lại thời gian `createdAt` của các bản ghi `Media` tương ứng để lưu trữ chính xác thứ tự hiển thị mong muốn mà không cần thay đổi cấu trúc bảng.

---

## 4. Quy trình triển khai (Implementation Plan)

### 4.1 Backend (Java Spring Boot)
1.  **Chuẩn bị Template mẫu**: Đóng gói file `game_template.zip` và đặt vào thư mục `src/main/resources/static/templates/game_template.zip`.
2.  **Cập nhật Entity & DTO**:
    *   Thêm trường `uploadStatus` và `uploadError` vào lớp [`Game.java`](file:///c:/Users/Admin/Desktop/SEP/godot-launch-capstone/backend/src/main/java/com/godotlaunch/backend/entity/Game.java).
    *   Cập nhật [`GameResponse.java`](file:///c:/Users/Admin/Desktop/SEP/godot-launch-capstone/backend/src/main/dto/response/GameResponse.java) để trả về trạng thái upload.
3.  **Tạo Helper Chạy nền `UnifiedGameUploadHelper.java`**:
    *   Tương tự như Asset, sử dụng Spring `@Async` để xử lý file ZIP gộp.
    *   Tự động phát hiện bọc ngoài và unwrap folder.
    *   Quét virus, giải nén và lưu trữ riêng biệt: Thumbnail, Screenshots (sắp xếp A-Z), Video, và đệ quy Web Demo.
4.  **Tạo API Endpoints trong `GameController.java`**:
    *   Tích hợp các endpoint download template, upload zip gộp, polling status, và reorder screenshots.

### 4.2 Frontend (React & TypeScript)
1.  **Khai báo API Client**:
    *   Thêm các hàm `uploadUnifiedGame`, `getGameUploadStatus`, và `reorderGameScreenshots` vào client API.
2.  **Cập nhật Step 2 trong `UploadPage.tsx` cho Game**:
    *   Hiển thị sơ đồ cây thư mục hướng dẫn chi tiết của Game (không chứa các file project_config hay readme thừa thãi).
    *   Thay đổi sang nút chọn / kéo thả 1 file ZIP gộp duy nhất.
    *   Hiện màn hình chờ xử lý nền kèm vòng xoay tiến trình và thực hiện polling kiểm tra trạng thái mỗi 3 giây.
    *   Khi hoàn tất (`SUCCESS`), hiển thị xem trước Thumbnail, Video, link chơi thử Web Demo và **hệ thống kéo thả sắp xếp ảnh screenshots** sử dụng `@dnd-kit/core` (không hiển thị chữ overlay "kéo thả" trên ảnh khi tương tác để giao diện tinh giản).

---

## 5. Kiểm thử & Nghiệm thu (Verification)
1.  **Kiểm thử Zip Slip / Zip Bomb**: Upload file zip chèn mã độc traversal hoặc tỷ lệ nén quá lớn -> Đảm bảo hệ thống phát hiện, ghi log alert bảo mật và hủy tiến trình ngay lập tức.
2.  **Kiểm thử Cấu trúc Web Demo**: Upload gói Web Demo thiếu tệp tin `.wasm` hoặc `.pck` -> Xác nhận hệ thống báo lỗi chính xác phần tệp tin còn thiếu.
3.  **Kiểm thử Kéo thả Screenshots**: Kéo thả hoán đổi vị trí hình ảnh mô tả game -> Tải lại trang và kiểm tra thứ tự hình ảnh hiển thị đúng như đã sắp xếp.
