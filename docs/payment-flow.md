# GodotLaunch Payment Flow

## 1. Mục tiêu tài liệu

Tài liệu này mô tả đầy đủ luồng thanh toán marketplace hiện tại của GodotLaunch, bao gồm:

- Người dùng bấm mua sản phẩm.
- Hệ thống tạo phiên thanh toán PayOS.
- PayOS redirect người dùng sang trang thanh toán.
- Webhook và luồng đồng bộ trạng thái cập nhật thanh toán nội bộ.
- Chia doanh thu cho nền tảng và seller.
- Cấp quyền tải source code sau khi mua thành công.

Tài liệu bám theo implementation hiện tại trong source code, không mô tả kiến trúc giả định.

---

## 2. Phạm vi nghiệp vụ

Luồng payment hiện tại áp dụng cho marketplace item có 2 loại:

- `source_code`
- `asset`

Buyer có thể là:

- `customer`
- `developer`

Seller là:

- `developer`

Payment provider hiện tại:

- `PayOS`

Đơn vị tiền tệ mặc định:

- `VND`

---

## 3. Các thành phần chính

### Backend

- `backend/src/main/java/com/godotlaunch/backend/controller/PaymentController.java`
  Vai trò: public API cho create, confirm, cancel, webhook, history, status.

- `backend/src/main/java/com/godotlaunch/backend/service/impl/PaymentServiceImpl.java`
  Vai trò: xử lý nghiệp vụ payment, order, revenue split, wallet update, download permission.

- `backend/src/main/java/com/godotlaunch/backend/service/payment/PayOSPaymentGateway.java`
  Vai trò: adapter gọi PayOS SDK cho create/get/cancel payment link và verify webhook.

- `backend/src/main/java/com/godotlaunch/backend/controller/DownloadController.java`
  Vai trò: endpoint tải source code sau khi buyer đã mua thành công.

- `backend/src/main/java/com/godotlaunch/backend/controller/AdminPlatformSettingsController.java`
  Vai trò: admin cấu hình commission rate của nền tảng.

### Frontend

- `frontend/src/api/paymentApi.ts`
  API client cho payment flow.

- `frontend/src/page/PaymentDetailPage.tsx`
  Trang payment center / chi tiết thanh toán.

- `frontend/src/page/PaymentResultPage.tsx`
  Trang nhận kết quả trả về sau khi PayOS redirect.

- `frontend/src/components/PurchasedInventoryPanel.tsx`
  Hiển thị inventory đã mua thành công, kèm nút download nếu là source code.

- `frontend/src/components/admin/AdminPaymentVerificationPanel.tsx`
  Màn hình admin theo dõi payment.

---

## 4. Endpoint hiện có

### Buyer / Developer APIs

#### `POST /api/v1/payments/create`

Tạo mới hoặc resume một payment session cho 1 marketplace item.

Request:

```json
{
  "marketplaceItemId": "11111111-2222-3333-4444-555555555555"
}
```

Response thành công sẽ trả về `PaymentResponse`, trong đó quan trọng nhất là:

- `id`
- `orderId`
- `paymentStatus`
- `checkoutUrl`
- `amount`
- `currency`
- `marketplaceItemType`

#### `POST /api/v1/payments/{paymentId}/confirm`

Đồng bộ lại trạng thái payment từ PayOS.

#### `POST /api/v1/payments/{paymentId}/cancel`

Hủy payment session đang active.

#### `GET /api/v1/payments/my-payments`

Lấy lịch sử thanh toán của user hiện tại.

#### `GET /api/v1/payments/{paymentId}`

Lấy chi tiết payment theo `paymentId`.

#### `GET /api/v1/payments/order/{orderId}`

Lấy chi tiết payment theo `orderId`.

#### `GET /api/v1/payments/status/{orderId}`

Lấy summary status để frontend poll / refresh nhẹ hơn.

### Webhook API

#### `POST /api/v1/payments/webhook`

Endpoint PayOS gọi về để xác nhận trạng thái thanh toán.

### Download API

#### `GET /api/v1/downloads/{purchaseId}`

Endpoint tải source code sau khi mua thành công.

Lưu ý:

- Route đang dùng `purchaseId`, nhưng trong implementation hiện tại `downloadUrl` được generate theo `orderId`.
- `PaymentServiceImpl` đang build download URL theo dạng:

```text
/api/v1/downloads/{orderId}
```

---

## 5. Cấu trúc response payment quan trọng

`PaymentResponse` hiện tại gồm các field đáng chú ý:

- `id`
- `orderId`
- `marketplaceItemId`
- `marketplaceItemTitle`
- `marketplaceItemType`
- `buyerId`
- `buyerEmail`
- `sellerId`
- `sellerEmail`
- `orderStatus`
- `paymentProvider`
- `paymentStatus`
- `amount`
- `currency`
- `payosOrderCode`
- `payosPaymentLinkId`
- `payosTransactionId`
- `checkoutUrl`
- `paymentReference`
- `paidAt`
- `downloadUrl`
- `createdAt`
- `updatedAt`

Điểm quan trọng:

- `checkoutUrl` dùng để redirect sang PayOS.
- `downloadUrl` chỉ có ý nghĩa khi payment đã hoàn tất và item là `source_code`.

---

## 6. Luồng end-to-end đầy đủ

## 6.1. User bấm mua sản phẩm

Frontend gọi:

```text
POST /api/v1/payments/create
```

Backend thực hiện các bước:

1. Xác định buyer từ `Principal`.
2. Chỉ cho phép role `customer` hoặc `developer`.
3. Tìm `MarketplaceItem`.
4. Chặn mua sản phẩm không active.
5. Chặn user mua chính sản phẩm của mình.
6. Tạo hoặc tái sử dụng `Order`.
7. Tạo hoặc tái sử dụng `Payment`.

---

## 6.2. Hệ thống có thể create mới hoặc resume session cũ

`PaymentServiceImpl` không luôn tạo payment link mới.

Nó xử lý theo các trường hợp:

### Trường hợp A: payment đã `PAID`

- Không tạo payment link mới.
- Trả lại payment hiện tại.

### Trường hợp B: có active checkout chưa thanh toán

- Gọi PayOS để sync trạng thái.
- Nếu link vẫn hợp lệ, hệ thống reuse link cũ.

### Trường hợp C: giá sản phẩm thay đổi trong lúc buyer chưa trả tiền

- Hủy payment link cũ.
- Update lại `Order` và `Payment` theo giá mới.
- Tạo link PayOS mới.

### Trường hợp D: chưa có payment link

- Tạo PayOS payment link mới.

Điều này giúp tránh:

- tạo trùng order,
- tạo trùng payment,
- tạo nhiều link không cần thiết,
- buyer trả tiền theo giá cũ khi item đã đổi giá.

---

## 6.3. Tạo PayOS payment link

Khi cần tạo link mới, backend build request với các thông tin chính:

- `orderCode`: số `long` unique nội bộ để map với PayOS
- `amount`: số tiền theo chuẩn PayOS
- `description`: mã rút gọn bắt đầu bằng `GL...`
- `buyerName`
- `buyerEmail`
- `returnUrl`
- `cancelUrl`
- `expiredAt`: hiện tại là 30 phút từ lúc tạo

`PayOSPaymentGateway.createPayment()` trả về:

- `orderCode`
- `paymentLinkId`
- `checkoutUrl`
- `qrCode`
- `status`

Sau đó `PaymentServiceImpl` lưu các field này vào payment nội bộ.

---

## 6.4. Frontend redirect buyer sang PayOS

Frontend lấy `checkoutUrl` từ response và mở trang thanh toán PayOS.

Tại đây buyer:

- quét QR,
- chuyển khoản,
- hoặc hủy giao dịch.

---

## 6.5. Buyer quay lại ứng dụng

PayOS redirect về frontend qua:

- success URL
- cancelled URL

Sau khi quay về:

- `PaymentResultPage.tsx` đọc `paymentId`
- frontend gọi API confirm / status để refresh payment thật
- giao diện hiển thị:
  - thanh toán thành công,
  - đã hủy,
  - đang chờ xác nhận,
  - hoặc thất bại

---

## 6.6. Webhook là bước chốt trạng thái chuẩn nhất

PayOS sẽ gọi:

```text
POST /api/v1/payments/webhook
```

Backend không update mù theo payload.

Thay vào đó:

1. Verify webhook bằng PayOS SDK.
2. Nhận diện request validation đặc biệt từ PayOS Merchant Dashboard.
3. Nếu chỉ là validation request, trả `200 OK` và không xử lý payment.
4. Nếu là webhook thật:
   - đọc `orderCode`
   - đối chiếu payment nội bộ
   - kiểm tra amount
   - gọi lại gateway để lấy trạng thái thật
   - chỉ complete payment khi trạng thái cuối cùng là `PAID`

Đây là điểm rất quan trọng để tránh:

- fake callback,
- payload sai amount,
- trạng thái chưa final mà đã ghi nhận paid,
- duplicate webhook xử lý 2 lần.

---

## 7. Webhook validation của PayOS

Khi admin cấu hình webhook URL trên dashboard PayOS, PayOS sẽ gửi một request kiểm tra endpoint.

Implementation hiện tại trong `PayOSPaymentGateway` đã hỗ trợ riêng case này:

- không ném `PAYMENT_WEBHOOK_INVALID`
- không xử lý như một giao dịch thật
- chỉ trả về success để dashboard lưu webhook URL thành công

Điều này giúp webhook URL được PayOS accept ngay từ bước cấu hình.

---

## 8. Payment status lifecycle

Enum hiện tại:

- `PENDING`
- `PROCESSING`
- `PAID`
- `FAILED`
- `CANCELLED`
- `EXPIRED`

Luồng điển hình:

```text
PENDING
  -> PROCESSING
  -> PAID
```

Các nhánh kết thúc khác:

```text
PENDING -> CANCELLED
PENDING -> FAILED
PENDING -> EXPIRED
```

### Ý nghĩa thực tế

- `PENDING`
  Payment vừa tạo, buyer chưa hoàn tất.

- `PROCESSING`
  Hệ thống đã thấy PayOS có tiến triển hoặc đang chờ finalize.

- `PAID`
  Thanh toán hoàn tất, order paid, revenue split đã chạy.

- `CANCELLED`
  Buyer hoặc hệ thống đã hủy payment link.

- `FAILED`
  Gateway báo thanh toán lỗi.

- `EXPIRED`
  Payment link hết hạn.

---

## 9. Trường hợp đặc biệt: sản phẩm miễn phí

Nếu `amount == 0`:

- backend không tạo PayOS payment link,
- payment được complete ngay nội bộ,
- `paymentReference` được gán dạng `FREE-...`,
- order được đánh dấu paid,
- quyền download được cấp ngay nếu là `source_code`.

Đây là luồng bypass payment gateway.

---

## 10. Revenue split sau khi thanh toán thành công

Sau khi payment được finalize thành `PAID`, `PaymentServiceImpl.completePaidPayment()` sẽ chạy revenue split.

## 10.1. Commission rate không fix cứng trong code

Commission rate được đọc từ:

```text
GET /api/v1/admin/platform-settings
PUT /api/v1/admin/platform-settings
```

Admin có thể cấu hình:

- `10`
- `15`
- `20`
- hoặc giá trị khác trong khoảng hợp lệ

Implementation hiện tại đọc commission rate từ `PlatformSettingsService`.

## 10.2. Công thức

```text
platformCommission = paymentAmount * commissionRate / 100
sellerRevenue = paymentAmount - platformCommission
```

Tính bằng `BigDecimal`.

## 10.3. Dữ liệu được cập nhật

Khi payment thành công:

1. Tạo `Transaction`
2. `Transaction.amount = full payment amount`
3. `Transaction.platformCommission = commission`
4. `Transaction.netAmount = sellerRevenue`
5. `sellerWallet.balance += sellerRevenue`
6. `order.status = PAID`
7. `payment.status = PAID`

### Loại transaction

- `asset_purchase`
- `source_code_purchase`

Phụ thuộc item type.

---

## 11. Download permission sau khi mua

Chỉ item `source_code` mới có nút download.

Điều kiện để `downloadUrl` được generate:

1. `order.status == PAID`
2. `payment.status == PAID`
3. `itemType == source_code`
4. có source bundle hoặc file URL hợp lệ

Khi đó backend trả:

```text
/api/v1/downloads/{orderId}
```

### Asset thì sao?

Nếu item là `asset`:

- buyer vẫn mua thành công,
- payment vẫn `PAID`,
- inventory vẫn hiển thị owned / purchased,
- nhưng không có nút download source code.

---

## 12. Bảo mật và validation quan trọng

Implementation hiện tại đã có các rule đáng chú ý:

- Chỉ `customer` hoặc `developer` được tạo payment.
- User không thể mua sản phẩm của chính mình.
- User không thể mua item inactive.
- Webhook phải verify qua PayOS SDK.
- Webhook validation request được tách riêng, không làm bẩn dữ liệu payment.
- Duplicate webhook không được finalize 2 lần.
- Amount trong webhook được đối chiếu với amount nội bộ.
- Download endpoint yêu cầu authenticated user và kiểm tra ownership.

---

## 13. Download API bảo vệ như thế nào

`DownloadController` yêu cầu role:

- `CUSTOMER`
- `DEVELOPER`

`DownloadService` sẽ kiểm tra:

1. Purchase / order có tồn tại không.
2. User hiện tại có phải buyer không.
3. Trạng thái mua đã completed chưa.
4. Sản phẩm có phải `source_code` không.

Nếu không đạt điều kiện:

- request bị chặn,
- không trả physical path ra ngoài,
- file được stream qua backend.

---

## 14. Cấu hình cần có để payment hoạt động

Tối thiểu backend cần:

- PayOS client id
- PayOS api key
- PayOS checksum key
- frontend base URL để tạo `returnUrl` / `cancelUrl`
- webhook URL public nếu muốn PayOS callback từ internet

Ngoài ra:

- PayOS merchant phải được cấu hình webhook URL đúng.
- Nếu dùng local, thường cần `ngrok` hoặc tunnel tương tự cho webhook.

---

## 15. Các lỗi thường gặp

### `PAYMENT_GATEWAY_ERROR`

Nguyên nhân hay gặp:

- sai PayOS credentials,
- PayOS service lỗi,
- merchant chưa cấu hình đúng,
- request amount / payload không hợp lệ,
- mạng không gọi được PayOS.

### `PAYMENT_WEBHOOK_INVALID`

Thường do:

- payload webhook không verify được,
- checksum / secret sai,
- request không đúng format PayOS.

### `400` khi bấm Pay With PayOS

Thường do:

- item không hợp lệ,
- user đang mua chính sản phẩm của mình,
- item inactive,
- request thiếu `marketplaceItemId`.

### `downloadUrl` không xuất hiện

Kiểm tra:

1. Item có phải `source_code` không.
2. Payment đã `PAID` chưa.
3. Order đã `PAID` chưa.
4. Source bundle / file URL đã sẵn sàng chưa.

---

## 16. Ví dụ API thực tế

## 16.1. Tạo payment

Request:

```http
POST /api/v1/payments/create
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "marketplaceItemId": "4e165bcc-e1ff-4170-8254-381bc750318f"
}
```

Ví dụ response rút gọn:

```json
{
  "success": true,
  "status": 200,
  "message": "PayOS payment session created successfully",
  "data": {
    "id": "29d4f4f2-baae-4f4c-b5b3-79ca3d278aea",
    "orderId": "1c9b70df-7a02-4f0e-b45c-cc6ec0cc7a7b",
    "marketplaceItemId": "4e165bcc-e1ff-4170-8254-381bc750318f",
    "marketplaceItemTitle": "Godot Game Source",
    "marketplaceItemType": "source_code",
    "paymentStatus": "PENDING",
    "amount": 10000,
    "currency": "VND",
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "downloadUrl": null
  }
}
```

## 16.2. Sau khi thanh toán thành công

Ví dụ response rút gọn:

```json
{
  "success": true,
  "status": 200,
  "message": "Payment retrieved successfully",
  "data": {
    "id": "29d4f4f2-baae-4f4c-b5b3-79ca3d278aea",
    "orderId": "1c9b70df-7a02-4f0e-b45c-cc6ec0cc7a7b",
    "paymentStatus": "PAID",
    "orderStatus": "PAID",
    "amount": 10000,
    "currency": "VND",
    "paidAt": "2026-06-29T10:15:22Z",
    "downloadUrl": "/api/v1/downloads/1c9b70df-7a02-4f0e-b45c-cc6ec0cc7a7b"
  }
}
```

---

## 17. Sơ đồ luồng tóm tắt

```text
Buyer
  -> Frontend bấm Buy / Pay
  -> POST /api/v1/payments/create
  -> Backend tạo hoặc resume Order + Payment
  -> PayOSPaymentGateway.createPayment()
  -> Trả checkoutUrl
  -> Redirect sang PayOS
  -> Buyer thanh toán
  -> PayOS redirect về frontend
  -> PayOS webhook gọi backend
  -> Backend verify webhook
  -> Đồng bộ trạng thái thật từ PayOS
  -> Payment PAID
  -> Order PAID
  -> Revenue split
  -> Seller wallet tăng theo net revenue
  -> Nếu source_code thì trả downloadUrl
```

---

## 18. Kết luận

Luồng payment hiện tại của GodotLaunch đã bao gồm đủ các phần quan trọng cho marketplace thực tế:

- tạo payment session,
- resume session cũ,
- webhook verification,
- free item bypass,
- revenue split theo commission do admin cấu hình,
- cập nhật seller wallet,
- phân quyền download riêng cho `source_code`.

Nếu sau này mở rộng thêm:

- refund,
- partial payment,
- nhiều payment provider,
- invoice,
- tax,

thì `PaymentServiceImpl` và `PayOSPaymentGateway` là 2 điểm trung tâm cần mở rộng trước.
