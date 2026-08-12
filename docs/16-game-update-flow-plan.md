# 16. Luồng Cập nhật Game (Game Update Flow)

> Tài liệu này mô tả chi tiết luồng cập nhật phiên bản mới của game qua GitHub:
> Đồng bộ từ repo -> quét virus & snapshot -> AI review & plagiarism -> admin duyệt -> kích hoạt phiên bản mới, kèm theo các quy tắc bảo mật tải file và quy tắc tài chính liên quan.

---

## 1. Nguyên tắc nghiệp vụ (Đã thống nhất)

### 1.1 Khách hàng tải game
- **Tải phiên bản mới nhất:** Người mua khi nhấn tải xuống sẽ **luôn nhận được phiên bản hoạt động mới nhất** (có nhãn `is_current = true` trong cơ sở dữ liệu). Điều này đảm bảo người chơi có được trải nghiệm sửa lỗi và cải tiến tính năng tốt nhất.
- **Không hỗ trợ tải bản cũ:** Chợ game chỉ cung cấp nút tải xuống cho bản phát hành ổn định hiện tại, không duy trì lịch sử tải các bản build cũ để tránh người chơi gặp lỗi do các phiên bản lỗi thời.

### 1.2 Phí cập nhật phiên bản mới
- **Hoàn toàn miễn phí:** Quyền sở hữu game là vĩnh viễn. Khi người dùng đã mua game một lần, họ có quyền tải về mọi bản cập nhật tiếp theo của game đó mà không cần trả thêm bất kỳ chi phí nào. Hệ thống chỉ đối chiếu quyền sở hữu đối với game, không quan tâm phiên bản.

### 1.3 Giữ nguyên trạng thái hiển thị trên chợ
- **Không gây gián đoạn dịch vụ:** Khi nhà phát triển đẩy bản cập nhật, game đã phát hành **vẫn giữ nguyên trạng thái `published`** và người mua mới vẫn có thể xem, mua và tải phiên bản đã duyệt trước đó. Game chỉ được cập nhật mã nguồn mới sau khi Admin phê duyệt.

---

## 2. Thiết kế Cơ sở Dữ liệu & Thực thể

Để theo dõi bản cập nhật đang chờ duyệt mà không làm ảnh hưởng đến trạng thái của game đang hoạt động, hệ thống sử dụng một trường liên kết tạm thời `pending_update_snapshot_id`.

```sql
-- Migration V19__add_pending_update_snapshot_to_games.sql
ALTER TABLE public.games ADD COLUMN pending_update_snapshot_id uuid;
ALTER TABLE public.games ADD CONSTRAINT fk_games_pending_update_snapshot 
    FOREIGN KEY (pending_update_snapshot_id) REFERENCES public.source_snapshots(id) ON DELETE SET NULL;
```

### 2.1 Cấu trúc thực thể `Game`
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "pending_update_snapshot_id")
private SourceSnapshot pendingUpdateSnapshot;
```

---

## 3. Quy trình Nghiệp vụ chi tiết

### Luồng Tuần tự (Sequence)

```
Developer                       Platform Backend                  Source Processing Service             Admin
    |                                   |                                     |                           |
    |--- 1. Đồng bộ repo GitHub ------->|                                     |                           |
    |    (submitGameRepo)               |                                     |                           |
    |                                   |--- 2. Yêu cầu xử lý mã nguồn ------>|                           |
    |                                   |                                     |                           |
    |                                   |<-- 3. Trả về kết quả & Zip URL -----|                           |
    |                                   |                                                                 |
    |                                   |--- 4. Tạo SourceSnapshot mới & liên kết làm pendingUpdate ------|
    |                                   |--- 5. Khởi chạy AI review & plagiarism (Bất đồng bộ) ----------|
    |                                   |                                                                 |
    |                                   |    (Game giữ nguyên trạng thái 'published' trên chợ)           |
    |                                   |                                                                 |
    |                                   |                                     |                           |
    |                                   |                                     |--- 6. Admin xem xét ---->|
    |                                   |                                     |    bản cập nhật mới       |
    |                                   |                                     |                           |
    |                                   |<-- 7. Duyệt / Từ chối cập nhật ---------------------------------|
```

### 3.1 Bước 1: Nhà phát triển gửi bản cập nhật
1. Developer nhấn **"Trigger Update from GitHub"** trên Dashboard.
2. Hệ thống gọi API `submitGameRepo` nhưng phát hiện game đã ở trạng thái `published` (hoặc `approved`/`awaiting_store_build`):
   - Trạng thái game **không đổi** (vẫn là `published`).
   - Gọi Source Processing Service để clone, quét virus (ClamAV), quét dự án Godot.
   - Tạo thực thể `SourceSnapshot` mới, lưu trường `pending_update_snapshot_id` trỏ tới snapshot này.
   - Chạy AI Review & Plagiarism kiểm tra mã nguồn bản cập nhật ở chế độ chạy nền.

### 3.2 Bước 2: Admin kiểm duyệt bản cập nhật
- Game có bản cập nhật đang chờ duyệt sẽ hiển thị trong hàng chờ kiểm duyệt (Moderation Queue) của Admin với nhãn **"Update Pending"**.
- Admin có thể tải bản zip của cập nhật mới từ `pendingUpdateFileUrl` để chạy thử/kiểm duyệt.

#### Nếu Admin Duyệt (Approve):
1. Hệ thống gọi `VersionUtils.updateGameVersionFile(game, pendingSnapshot.getBundleUrl(), gameVersionRepository)`.
   - Vô hiệu hóa phiên bản hiện tại (`is_current = false`).
   - Tăng mã phiên bản tự động (ví dụ: `1.0.0` -> `1.0.1`).
   - Tạo bản ghi `GameVersion` mới với URL là bundle nguồn mới, gán `is_current = true`.
2. Reset trường `pending_update_snapshot_id = null`.
3. Nếu loại phát hành là Google Play (`co_publishing`/`full_acquisition`), hệ thống chuyển trạng thái game về `awaiting_store_build` để Admin chuẩn bị upload file APK/AAB mới. Nếu là Marketplace, game vẫn giữ nguyên `published` nhưng với mã nguồn mới.

#### Nếu Admin Từ chối (Reject):
1. Hệ thống xóa file zip cập nhật lỗi trên storage (SeaweedFS).
2. Reset trường `pending_update_snapshot_id = null`.
3. Game giữ nguyên trạng thái và phiên bản đang hoạt động bình thường, không bị ảnh hưởng.

---

## 4. Bảo mật Tải Game (Security Resolution)

Để tránh lỗ hổng bảo mật người dùng tải nhầm các mã nguồn cập nhật chưa duyệt:
- **Trước đây:** Luồng tải game đọc snapshot mới nhất theo thời gian tạo (`findFirstByGameIdOrderByCreatedAtDesc`). Điều này dẫn đến việc người mua tải nhầm bản cập nhật chưa duyệt khi nó vừa được submit.
- **Giải pháp:** API tải game (`DownloadServiceImpl`) và trường `fileUrl` hiển thị cho người mua sẽ được truy vấn trực tiếp từ phiên bản đang hoạt động được phê duyệt:
```java
GameVersion currentVer = gameVersionRepository.findByGame_IdAndIsCurrentTrue(gameId)
    .orElseThrow(() -> new AppException(ErrorCode.FILE_NOT_FOUND));
String downloadUrl = currentVer.getFileUrl();
```
Điều này đảm bảo luồng tải game được phân quyền chặt chẽ và tuyệt đối an toàn.
