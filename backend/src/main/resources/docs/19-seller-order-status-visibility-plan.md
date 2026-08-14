# 19. Kế hoạch: Seller thấy đầy đủ trạng thái đơn hàng (không chỉ đơn đã thành công)

> Giao cho thành viên khác triển khai. Tài liệu mô tả hiện trạng đã xác nhận
> qua code, khoảng trống cần lấp, và các bước triển khai theo thứ tự.
>
> **Lưu ý phạm vi:** Tài liệu này CHỈ đặc tả thay đổi ở code nghiệp vụ
> (`main`), không đặt ra yêu cầu viết/sửa test (`test`). Khi triển khai, bỏ
> qua hoàn toàn việc cập nhật unit test/integration test để tiết kiệm quota.

---

## 0. Bối cảnh — vì sao cần làm

Hệ thống có 6 trạng thái thanh toán (`PaymentStatus`):
`PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`.

- **Phía buyer** (trang "Quản lý đơn hàng", `PaymentDetailPage.tsx`) đã hiển
  thị đầy đủ cả 6 trạng thái, có badge màu, icon, câu giải thích riêng cho
  từng trạng thái (`getStatusMeta()`), và có ô đếm "cần chú ý" riêng cho
  `PENDING`/`PROCESSING`.
- **Phía seller** (tab "Doanh thu" trong `DashboardPage.tsx`) **chỉ thấy đơn
  đã bán thành công** — hoàn toàn không biết có khách đang thử mua nhưng
  chưa thanh toán xong (`PENDING`/`PROCESSING`), hay đã từng có người định
  mua nhưng thất bại/hủy/hết hạn (`FAILED`/`CANCELLED`/`EXPIRED`).

Đây không phải bug UI thiếu sót — mà là **giới hạn kiến trúc backend hiện
tại**: nguồn dữ liệu seller dùng để tính doanh thu là bảng `transactions`
(ví/ledger), và bản ghi `Transaction` type `revenue_share` **chỉ được tạo
khi tiền đã thực sự chia cho seller** — tức chỉ khi thanh toán đã `PAID`.
Không có `Transaction` nào đại diện cho đơn `PENDING`/`FAILED`/`CANCELLED`/
`EXPIRED` cả, nên seller không có cách nào nhìn thấy chúng qua API hiện tại.

**Giá trị nghiệp vụ khi làm xong:** seller biết được có bao nhiêu người đang
quan tâm/thử mua sản phẩm của họ nhưng chưa chốt (dữ liệu phễu bán hàng —
funnel), thay vì chỉ thấy con số doanh thu cuối cùng.

---

## 1. Đã xác nhận qua code (không suy đoán)

### 1.1 Enum trạng thái

`backend/src/main/java/com/godotlaunch/backend/entity/enums/PaymentStatus.java`:
```java
public enum PaymentStatus {
    PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED
}
```

### 1.2 `Order` không có trạng thái — chỉ tồn tại khi đã thanh toán xong

`backend/src/main/java/com/godotlaunch/backend/entity/Order.java` không có
cột trạng thái nào. Với luồng thanh toán bằng ví nội bộ (luồng chính đang
dùng ở Marketplace/CheckoutPage), `Order` được tạo **PAID ngay lập tức**
trong cùng transaction lúc mua — không có khái niệm "đơn đang chờ".

### 1.3 `Payment` mới có đủ 6 trạng thái — dùng cho luồng PayOS

`backend/src/main/java/com/godotlaunch/backend/entity/Payment.java`, cột
`payment_status` kiểu `PaymentStatus`. Đây là luồng thanh toán qua PayOS
trực tiếp (QR chuyển khoản, khác luồng ví nội bộ) — đi đủ qua các trạng thái
`PENDING → PROCESSING → PAID` hoặc rẽ nhánh `FAILED`/`CANCELLED`/`EXPIRED`.

### 1.4 Doanh thu seller lấy từ `Transaction`, không phải `Order`/`Payment`

`backend/src/main/java/com/godotlaunch/backend/repository/TransactionRepository.java`
dòng 37-47:
```java
@Query("SELECT new com.godotlaunch.backend.dto.projection.ProductSalesRow(" +
        "t.asset.id, t.asset.title, t.asset.thumbnailUrl, COUNT(t), COALESCE(SUM(t.amount), 0)) " +
        "FROM Transaction t WHERE t.wallet.id = :walletId AND t.type = :type AND t.asset IS NOT NULL " +
        "GROUP BY t.asset.id, t.asset.title, t.asset.thumbnailUrl")
List<ProductSalesRow> sumAssetSalesByWalletIdAndType(...);
// tương tự sumGameSalesByWalletIdAndType cho game
```
Gọi với `type = TxnType.revenue_share` tại
`WithdrawalRequestServiceImpl.getDeveloperSalesStats()` (dòng 110-137) —
**method này nằm trong `WithdrawalRequestServiceImpl`, không phải 1 service
riêng cho sales/order** — điểm cần lưu ý khi tìm code để sửa.

### 1.5 API + Frontend hiện có

- Endpoint: `GET /api/v1/wallets/sales-stats`
  (`DeveloperWithdrawalController.java` dòng 46-53), role `DEVELOPER`, trả
  `DeveloperSalesStatsResponse` (`totalUnitsSold`, `totalRevenue`,
  `products: ProductSalesResponse[]`).
- `ProductSalesResponse`/`ProductSalesRow` hiện chỉ có:
  `productId, productType, title, thumbnailUrl, unitsSold, revenue` — không
  có field nào cho số lượng đơn `pending`/`failed`/`cancelled`/`expired`.
- Frontend render tại `frontend/src/page/DashboardPage.tsx` dòng
  1940-1988 — bảng "Doanh thu theo sản phẩm", cột: tên sản phẩm, loại,
  `unitsSold`, `revenue`. Không có cột trạng thái.
- Đối chiếu bên buyer đã làm đúng, dùng làm **mẫu tham khảo UI**:
  `frontend/src/page/PaymentDetailPage.tsx` hàm `getStatusMeta()` (dòng
  73-125) — copy đúng pattern màu badge/icon/helper text cho 6 trạng thái,
  dùng lại y hệt namespace i18n `payment:status.*` đã có sẵn (không cần tạo
  key mới, xem mục 3.4).

---

## 2. Đã tìm ra cách liên kết Payment → sản phẩm/seller — KHÔNG cần migration

`Payment` entity (mục 1.3) không có cột `asset_id`/`game_id`/`seller_id`
trực tiếp, nhưng **không cần thêm** — hệ thống đã có sẵn cơ chế liên kết
qua field `paymentReference`, dùng ngay từ lúc tạo `Payment` (còn `PENDING`,
trước khi có `Order`):

`PaymentServiceImpl.createPayOSPayment()` (dòng 85-164) khi mua 1 asset:
```java
String buyRef = "BUY_ASSET:" + item.getId();   // dòng 106
payment.setPaymentReference(buyRef);            // dòng 117
```
(Tương tự có prefix `"BUY_GAME:" + gameId` cho luồng mua game nguồn.)

Và **đã có sẵn logic parse ngược lại**, dùng để trả `PaymentResponse` cho
buyer — `PaymentServiceImpl.mapToResponse()` (dòng ~800-840):
```java
String ref = payment.getPaymentReference();
if (ref != null && ref.startsWith("BUY_ASSET:")) {
    UUID assetId = UUID.fromString(ref.substring("BUY_ASSET:".length()));
    Asset asset = assetRepository.findById(assetId).orElse(null);
    if (asset != null) {
        sellerId = asset.getSeller().getId();
        sellerEmail = asset.getSeller().getEmail();
        sellerFullName = asset.getSeller().getFullName();
        assetType = "asset";
    }
} else if (ref != null && ref.startsWith("BUY_GAME:")) {
    // tương tự qua gameRepository + game.getCreator()
}
```
Logic này chạy cho **mọi trạng thái Payment**, không chỉ `PAID` — nghĩa là
`sellerId`/`sellerEmail` đã tính được ngay cả với đơn `PENDING`/`FAILED`/
`CANCELLED`/`EXPIRED`. `PaymentResponse` DTO đã có sẵn các field này
(`sellerId`, `sellerEmail`, `sellerFullName`, `marketplaceItemId`,
`marketplaceItemTitle`) — xem `dto/response/PaymentResponse.java`.

**Kết luận: không cần bổ sung cột/migration nào cho `payments`.** Việc còn
thiếu chỉ là 1 **query mới lọc theo `sellerId`** (hiện `PaymentRepository`
chưa có query nào lọc theo seller — chỉ có theo `walletId`/buyer), vì cách
map sellerId hiện tại nằm ở tầng service (Java, sau khi query), không lọc
được trực tiếp trong SQL/JPQL bằng cách thông thường do phải parse chuỗi
`paymentReference`. Xem cách xử lý ở Bước 2.

---

## 3. Việc cần làm, chia theo bước

### Bước 1 — Backend: query lấy Payment theo seller (bất kỳ trạng thái nào)

`PaymentRepository` hiện chỉ có query lọc theo `walletId` (= buyer). Vì
`sellerId` không phải cột thật trong bảng `payments` (chỉ suy ra được bằng
cách parse `paymentReference`, xem mục 2), **không thể** viết 1 câu JPQL/SQL
đơn giản `WHERE seller_id = :sellerId` như bình thường. 2 cách khả thi:

- **Cách 1 (đơn giản, đủ dùng, khuyến nghị bắt đầu)**: Query lấy TẤT CẢ
  `Payment` có `paymentReference LIKE 'BUY_ASSET:%'` hoặc
  `LIKE 'BUY_GAME:%'` (không lọc seller trong SQL), rồi lọc/group ở tầng
  Java trong `PaymentServiceImpl` — tái dùng đúng logic parse
  `paymentReference` → `sellerId` đã có sẵn ở `mapToResponse()` (mục 2),
  refactor thành 1 method dùng chung. Chấp nhận được về hiệu năng ở quy mô
  hiện tại của hệ thống (số lượng payment còn nhỏ); có thể tối ưu SQL sau
  nếu cần.
- **Cách 2 (chuẩn hơn, tốn công hơn)**: Thêm migration mới bổ sung cột
  `asset_id`/`game_id` (nullable) vào bảng `payments`, set giá trị ngay lúc
  `createPayOSPayment()` tạo Payment (song song với việc set
  `paymentReference` như hiện tại, không thay thế nó — giữ tương thích
  ngược). Sau đó viết được JPQL lọc trực tiếp qua join
  `asset.seller.id = :sellerId` hoặc `game.creator.id = :sellerId`, sạch và
  nhanh hơn Cách 1.

Người triển khai tự chọn — Cách 1 đủ để hoàn thành mục tiêu nghiệp vụ, Cách 2
là cải tiến kỹ thuật có thể làm sau nếu còn thời gian.

### Bước 2 — Backend: API thống kê theo trạng thái cho seller

Sau khi có được danh sách `Payment` theo seller (Bước 1), có 2 hướng cho
hình dạng dữ liệu trả về:

- **Hướng A (đơn giản hơn)**: mở rộng `ProductSalesResponse` (không phá
  field cũ, chỉ thêm) với các field đếm riêng theo trạng thái —
  `pendingCount`, `failedCount`, `cancelledCount`, `expiredCount` — bên
  cạnh `unitsSold` hiện có (giữ nguyên ý nghĩa "đã bán thành công"). Gắn vào
  luôn endpoint `GET /api/v1/wallets/sales-stats` đã có.
- **Hướng B (chi tiết hơn, tốn công hơn)**: thêm 1 endpoint riêng
  `GET /api/v1/wallets/order-status-breakdown` trả danh sách đơn hàng dạng
  list (không chỉ tổng hợp theo sản phẩm) — mỗi phần tử là 1
  `PaymentResponse` (DTO đã có sẵn đủ field `sellerId`/`marketplaceItemTitle`/
  `paymentStatus`...), để seller xem được từng đơn cụ thể kèm trạng thái,
  thời gian, buyer — giống hệt trải nghiệm buyer đang có ở
  `PaymentDetailPage.tsx`.

Khuyến nghị bắt đầu Hướng A trước vì tận dụng được UI bảng sẵn có ở
`DashboardPage.tsx` và không cần trang mới, Hướng B làm sau nếu còn thời
gian và muốn trải nghiệm đầy đủ hơn.

### Bước 3 — Frontend: hiển thị trạng thái trong tab Doanh thu

Sửa `frontend/src/page/DashboardPage.tsx` khu vực bảng "Doanh thu theo sản
phẩm" (dòng ~1940-1988):
- Thêm cột mới hiển thị số đơn theo từng trạng thái (nếu chọn Hướng A) —
  có thể dùng dạng badge nhỏ, không cần chiếm nhiều không gian, ví dụ
  "3 đang chờ" / "1 thất bại" đặt cạnh số liệu đã bán.
- Nếu chọn Hướng B: thêm 1 tab/khu vực mới riêng "Đơn hàng đang chờ xử lý"
  bên cạnh bảng doanh thu hiện có, tái dùng `getStatusMeta()` pattern từ
  `PaymentDetailPage.tsx` (copy cách render, không cần import chéo 2 trang).

### Bước 4 — i18n

Nếu chỉ thêm số đếm cạnh bảng hiện có (Hướng A): tái dùng namespace
`payment:status.*` đã có sẵn cho label (`status.pending.label`,
`status.failed.label`...) — không cần tạo key mới, chỉ cần import đúng
namespace `payment` vào `DashboardPage.tsx` nếu chưa có sẵn (kiểm tra
`useTranslation([...])` hiện tại của trang, dòng đầu file).

Nếu làm Hướng B (trang riêng): có thể cần thêm vài key mới trong
`frontend/src/locales/{vi,en,ja}/dashboard.json` cho tiêu đề khu vực mới —
đặt tên key theo đúng convention đã dùng trong file (xem cấu trúc
`workspace.purchaseSubtitle` đã có làm ví dụ).

---

## 4. Việc KHÔNG làm trong phạm vi kế hoạch này

- Không đổi luồng thanh toán bằng ví nội bộ (Order tạo PAID ngay lập tức) —
  đây là hành vi nghiệp vụ đã quyết định trước, không phải bug.
- Không bắt buộc chọn Hướng A hay B — để người triển khai tự quyết theo thời
  gian thực tế, miễn kết quả cuối là seller nhìn thấy được nhiều hơn chỉ mỗi
  "đã bán thành công".
- Không đổi cách buyer nhìn thấy trạng thái (`PaymentDetailPage.tsx`) — đã
  đúng, chỉ dùng làm mẫu tham khảo, không sửa.
- **Không viết/sửa test.** Bỏ qua hoàn toàn việc cập nhật unit test/
  integration test cho các thay đổi trong kế hoạch này, kể cả khi sửa
  signature của method/DTO khiến test cũ (nếu có) không còn compile — chấp
  nhận để test cũ fail hoặc xoá nếu không còn liên quan, không đầu tư công
  sức sửa lại cho pass.
