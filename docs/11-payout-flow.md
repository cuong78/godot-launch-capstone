# 11. GodotLaunch Payout Flow

## 1. Mục tiêu tài liệu

Tài liệu này mô tả chi tiết luồng rút tiền hiện tại của GodotLaunch, từ lúc developer tạo withdrawal request đến khi admin tạo payout order và hệ thống đồng bộ trạng thái payout từ PayOS.

Tài liệu bám theo implementation hiện tại trong source code.

---

## 2. Phân biệt 3 loại tiền trong hệ thống

Đây là điểm rất quan trọng vì dễ nhầm.

## 2.1. Doanh thu nội bộ của developer

Đây là số dư đang nằm trong `Wallet` nội bộ của GodotLaunch.

Nguồn hình thành:

- buyer thanh toán thành công,
- hệ thống chia hoa hồng,
- seller nhận `net revenue` vào wallet.

Đây **không phải** là số dư trực tiếp trong tài khoản ngân hàng của developer.

## 2.2. Số dư payout account của nền tảng

Đây là số dư thật của kênh chi PayOS / tài khoản payout mà admin đang dùng để chuyển tiền ra ngoài hệ thống.

Backend kiểm tra số dư này qua:

```text
GET /api/v1/admin/payout/balance
```

## 2.3. Tài khoản ngân hàng của developer

Đây là nơi tiền thật sẽ đi tới khi payout của PayOS thành công.

---

## 3. Mục tiêu nghiệp vụ hiện tại

Luồng payout hiện tại hỗ trợ:

- developer tạo yêu cầu rút tiền,
- admin xem queue rút tiền,
- admin tạo PayOS payout order,
- hệ thống đồng bộ trạng thái payout,
- chỉ khi PayOS xác nhận thành công thì mới:
  - trừ wallet nội bộ,
  - tạo transaction withdrawal,
  - đánh dấu withdrawal `completed`.

Nói ngắn gọn:

```text
Marketplace revenue
-> Wallet nội bộ
-> Developer tạo withdrawal
-> Admin tạo payout order
-> PayOS xử lý
-> Success mới trừ wallet
```

---

## 4. Các thành phần chính

### Backend

- `backend/src/main/java/com/godotlaunch/backend/controller/DeveloperWithdrawalController.java`
  API cho developer xem wallet, tạo request, xem lịch sử.

- `backend/src/main/java/com/godotlaunch/backend/controller/AdminWithdrawalController.java`
  API cho admin quản lý withdrawal queue, approve, sync status, reject.

- `backend/src/main/java/com/godotlaunch/backend/controller/AdminPayoutController.java`
  API cho admin xem số dư payout account.

- `backend/src/main/java/com/godotlaunch/backend/service/impl/WithdrawalRequestServiceImpl.java`
  Nghiệp vụ chính của withdrawal request và tạo payout order.

- `backend/src/main/java/com/godotlaunch/backend/service/impl/WithdrawalStatusSynchronizerImpl.java`
  Đồng bộ trạng thái payout từ PayOS và finalize withdrawal.

- `backend/src/main/java/com/godotlaunch/backend/service/payout/PayOSPayoutGateway.java`
  Adapter gọi PayOS payout APIs.

### Frontend

- `frontend/src/page/WalletPage.tsx`
  Developer xem ví doanh thu và gửi withdrawal request.

- `frontend/src/components/admin/AdminWithdrawalPanel.tsx`
  Admin queue quản lý payout.

- `frontend/src/components/admin/AdminWithdrawalDetailModal.tsx`
  Popup detail hiện đại cho từng withdrawal request.

- `frontend/src/api/walletApi.ts`
  API client cho wallet / withdrawal / admin payout actions.

---

## 5. Dữ liệu cốt lõi

## 5.1. Developer wallet summary

`DeveloperWalletSummaryResponse` hiện tại có:

- `walletId`
- `developerId`
- `developerEmail`
- `developerFullName`
- `currency`
- `walletBalance`
- `availableBalance`
- `pendingBalance`
- `totalRevenue`
- `updatedAt`

## 5.2. Withdrawal response

`WithdrawalResponse` hiện tại có:

- `id`
- `developerId`
- `developerEmail`
- `developerFullName`
- `walletId`
- `amount`
- `currency`
- `bankName`
- `bankAccount`
- `accountHolder`
- `transferReference`
- `payosPayoutId`
- `payosReferenceId`
- `payosStatus`
- `payosCreatedAt`
- `status`
- `processedById`
- `processedByFullName`
- `processedAt`
- `remark`
- `createdAt`
- `updatedAt`

`WithdrawalDetailResponse` kế thừa thêm:

- `walletBalance`
- `availableBalance`
- `pendingBalance`
- `totalRevenue`
- `qrPayload`
- `standardQrImageUrl`
- `preferredQrImageUrl`

Lưu ý:

- UI admin hiện tại không còn dùng Dynamic QR như trước,
- nhưng backend vẫn đang giữ các field QR để tương thích dữ liệu cũ.

---

## 6. Endpoint hiện có

## 6.1. Wallet APIs (customer & developer)

### `GET /api/v1/wallets/summary`

Lấy tóm tắt ví (số dư khả dụng, đang chờ xử lý, doanh thu) của user hiện tại (customer hoặc developer).

### `GET /api/v1/wallets/withdrawals`

Lấy lịch sử withdrawal của user hiện tại.

### `POST /api/v1/wallets/withdrawals`

Tạo withdrawal request mới.

Request:

```json
{
  "amount": 10000,
  "bankName": "MBBank",
  "bankAccount": "0123456789",
  "accountHolder": "NGUYEN VAN A",
  "note": "Withdraw June revenue"
}
```

### `GET /api/v1/wallets/withdrawals/{id}`

Lấy chi tiết một withdrawal request của chính user đó.

## 6.2. Admin APIs

### `GET /api/v1/admin/withdrawals`

Lấy withdrawal queue cho admin.

### `GET /api/v1/admin/withdrawals/{id}`

Lấy detail của một withdrawal request.

### `POST /api/v1/admin/withdrawals/{id}/approve`

Tạo PayOS payout order cho withdrawal request.

### `POST /api/v1/admin/withdrawals/{id}/processing`

Đánh dấu thủ công là `processing` nếu cần.

### `POST /api/v1/admin/withdrawals/{id}/complete`

Đồng bộ trạng thái PayOS và chỉ complete khi payout thực sự thành công.

### `POST /api/v1/admin/withdrawals/{id}/sync-status`

Đồng bộ riêng trạng thái payout.

### `POST /api/v1/admin/withdrawals/{id}/reject`

Reject request.

Request:

```json
{
  "remark": "Invalid bank information"
}
```

## 6.3. Admin payout account API

### `GET /api/v1/admin/payout/balance`

Lấy số dư thật của PayOS payout account.

Response dạng rút gọn:

```json
{
  "success": true,
  "status": 200,
  "data": {
    "accountNumber": "0000123456789",
    "accountName": "NGUYEN VAN A",
    "currency": "VND",
    "balance": 5000000,
    "status": "ACTIVE"
  }
}
```

---

## 7. Wallet metrics được tính như thế nào

`WithdrawalRequestServiceImpl` đang tính các metric quan trọng như sau:

### `walletBalance`

Số dư nội bộ đang có trong ví của developer.

### `pendingBalance`

Tổng tiền của các withdrawal request đang ở trạng thái:

- `pending`
- `processing`
- `approved`

### `availableBalance`

```text
availableBalance = walletBalance - pendingBalance
```

Nếu nhỏ hơn 0 thì bị ép về 0.

### `totalRevenue`

Tổng doanh thu tích lũy được tính từ các transaction completed có type:

- `source_code_purchase`
- `asset_purchase`
- `revenue_share`

Điểm này giúp UI tách rõ:

- tổng doanh thu,
- số dư đã có trong ví,
- phần đang bị giữ bởi các yêu cầu rút tiền chưa xong.

---

## 8. Luồng developer tạo withdrawal request

## 8.1. Điều kiện hợp lệ

Request tạo withdrawal phải đạt:

- `amount` không null
- `amount >= 10000`
- `bankName` không rỗng
- `bankAccount` không rỗng
- `accountHolder` không rỗng
- `amount <= availableBalance`

Nếu số tiền yêu cầu lớn hơn số tiền khả dụng:

- backend reject request,
- không cho tạo withdrawal.

## 8.2. Dữ liệu được lưu

Khi request hợp lệ, backend tạo `WithdrawalRequest` với:

- amount
- currency = `VND`
- bankName
- bankAccount
- accountHolder
- note được lưu vào `remark`
- status = `pending`
- transfer reference dạng `GLWD-...`

Lưu ý:

- Ở bước này ví chưa bị trừ.
- Chỉ mới “giữ chỗ” logic qua `pendingBalance`.

---

## 9. Luồng admin tạo payout order

Đây là bước rất hay bị nhầm với “đã chuyển tiền xong”.

Thực tế:

```text
Approve ở đây = tạo PayOS payout order
Không đồng nghĩa completed ngay
```

## 9.1. Backend làm gì khi admin bấm approve

Endpoint:

```text
POST /api/v1/admin/withdrawals/{id}/approve
```

`WithdrawalRequestServiceImpl.approveWithdrawal()` thực hiện:

1. Load withdrawal theo id.
2. Chỉ cho phép các status hợp lệ:
   - `pending`
   - hoặc case legacy `approved` nhưng chưa có `payosPayoutId`
3. Gọi `payoutGateway.getBalance()`.
4. So sánh số dư payout account với amount cần chi.
5. Nếu không đủ tiền:
   - ném `INSUFFICIENT_PAYOUT_BALANCE`
6. Nếu đủ tiền:
   - build `PayoutGatewayCreateRequest`
   - gọi `payoutGateway.createPayout(...)`
7. Lưu thông tin PayOS trả về:
   - `payosPayoutId`
   - `payosReferenceId`
   - `payosStatus`
   - `payosCreatedAt`
8. Update:
   - `processedBy`
   - `processedAt`
   - `transferReference`
9. Chuyển `status = processing`

## 9.2. Ví nội bộ có bị trừ ở đây không

Không.

Đây là nguyên tắc rất quan trọng của implementation hiện tại:

- `approve` chỉ tạo payout order
- ví developer chưa bị trừ
- transaction withdrawal chưa được tạo

---

## 10. Mapping từ withdrawal sang PayOS payout request

Backend build request sang PayOS với các field chính:

- `referenceId`
  Dùng từ `transferReference`

- `amount`
  Dùng từ amount của withdrawal

- `description`
  Dạng `Withdrawal #<8 ký tự đầu của id>`

- `toBankBin`
  Resolve từ `bankName`

- `toAccountNumber`
  Lấy từ bank account sau khi bỏ khoảng trắng

- `category`
  Hiện tại dùng `["payment"]`

Hệ thống có bảng map bank BIN nội bộ cho nhiều ngân hàng phổ biến như:

- MBBank
- ACB
- Techcombank
- Vietcombank
- BIDV
- VPBank
- TPBank
- Sacombank

Nếu tên ngân hàng không map được đúng BIN, payout có thể thất bại ở tầng gateway.

---

## 11. Trạng thái withdrawal

Enum hiện tại:

- `pending`
- `approved`
- `processing`
- `failed`
- `rejected`
- `completed`
- `cancelled`

### Ý nghĩa thực tế trong flow hiện tại

- `pending`
  Developer vừa tạo request, admin chưa xử lý.

- `processing`
  Admin đã tạo payout order, PayOS đang xử lý hoặc chờ xác nhận thành công.

- `completed`
  PayOS payout thành công, wallet đã bị trừ, transaction withdrawal đã được tạo.

- `failed`
  PayOS payout thất bại hoặc sync status trả về trạng thái fail.

- `rejected`
  Admin từ chối request.

- `approved`
  Chủ yếu là trạng thái legacy / dữ liệu cũ. Flow hiện tại ưu tiên `processing` sau bước approve.

---

## 12. Synchronize payout status và complete withdrawal

`WithdrawalStatusSynchronizerImpl` là nơi quyết định cuối cùng payout đã hoàn tất chưa.

## 12.1. Khi nào sync được gọi

Hiện tại có thể được gọi qua:

- `POST /api/v1/admin/withdrawals/{id}/complete`
- `POST /api/v1/admin/withdrawals/{id}/sync-status`

Frontend admin cũng đang có logic:

- sau khi approve xong sẽ thử sync thêm một lần,
- nếu chưa về thành công thì hiển thị notice phù hợp.

## 12.2. Backend sync làm gì

1. Đảm bảo withdrawal đang ở status có thể sync.
2. Đảm bảo có `payosPayoutId`.
3. Gọi `payoutGateway.getStatus(payosPayoutId)`.
4. Đọc trạng thái thật từ PayOS.

## 12.3. Nếu payout SUCCESS

Chỉ ở bước này backend mới:

1. Lock wallet của developer.
2. Kiểm tra idempotency:
   - nếu transaction đã tồn tại thì không làm trùng
3. Kiểm tra wallet balance đủ để trừ.
4. Trừ wallet:

```text
wallet.balance = wallet.balance - withdrawal.amount
```

5. Tạo `Transaction` mới:
   - amount = số âm
   - netAmount = số âm
   - platformCommission = 0
   - type = `withdrawal`
   - status = `completed`
   - description = `Withdrawal via PayOS`
6. Gắn transaction vào withdrawal.
7. Đổi withdrawal sang `completed`.

## 12.4. Nếu payout FAILED

Backend:

- đổi status thành `failed`
- cập nhật `payosStatus`
- append failure reason vào `remark`
- không trừ wallet
- không tạo transaction

## 12.5. Nếu payout vẫn PROCESSING

Backend:

- giữ nguyên status `processing`
- cập nhật `payosStatus`
- không trừ wallet
- không tạo transaction

---

## 13. Idempotency và chống xử lý trùng

Payout sync có thể bị gọi nhiều lần.

Implementation hiện tại đã cố gắng chống double-processing bằng các rule:

- chỉ complete khi status gateway thực sự success,
- nếu withdrawal đã có transaction thì không trừ ví lần nữa,
- nếu status đã là `completed` thì sync lại cũng không tạo thêm transaction,
- wallet chỉ bị trừ ở bước success cuối cùng.

Điều này đặc biệt quan trọng khi:

- admin bấm sync nhiều lần,
- frontend retry,
- webhook hoặc poll nội bộ lặp lại trong tương lai.

---

## 14. Transaction khi withdrawal completed

Khi payout thành công, backend tạo 1 transaction loại withdrawal.

Đặc điểm:

- `amount` là số âm
- `netAmount` là số âm
- `platformCommission = 0`
- `type = withdrawal`
- `status = completed`
- `description = Withdrawal via PayOS`

Ý nghĩa:

- payment marketplace làm tăng ví,
- withdrawal completed làm giảm ví,
- toàn bộ ledger vẫn cân đối và truy vết được.

---

## 15. Frontend flow hiện tại

## 15.1. Developer side

`WalletPage.tsx` hiện đang làm các việc chính:

- hiển thị ví doanh thu
- hiển thị available balance / pending balance / total revenue
- cho developer nhập form rút tiền
- hiển thị lịch sử withdrawal

## 15.2. Admin side

`AdminWithdrawalPanel.tsx`:

- load withdrawal queue
- filter / chọn request
- mở detail modal
- gọi approve / reject / sync

`AdminWithdrawalDetailModal.tsx`:

- hiển thị developer information
- hiển thị wallet information
- hiển thị bank information
- hiển thị payout tracking
- có action:
  - `Create Payout Order`
  - `Sync PayOS Status`
  - `Reject Request`

UI admin hiện tại đã bỏ phần Dynamic QR khỏi trọng tâm vận hành payout.

---

## 16. Ví dụ request/response

## 16.1. Developer tạo request

```http
POST /api/v1/wallets/withdrawals
Authorization: Bearer <developer-token>
Content-Type: application/json
```

```json
{
  "amount": 10000,
  "bankName": "MBBank",
  "bankAccount": "0123456789",
  "accountHolder": "NGUYEN VAN A",
  "note": "Withdraw June revenue"
}
```

Ví dụ response rút gọn:

```json
{
  "success": true,
  "status": 201,
  "message": "Withdrawal request submitted successfully.",
  "data": {
    "id": "11cc2849-3b2c-483c-85bf-7e58431a2d6a",
    "amount": 10000,
    "currency": "VND",
    "status": "pending",
    "transferReference": "GLWD-EXAMPLE001",
    "bankName": "MBBank",
    "bankAccount": "0123456789",
    "accountHolder": "NGUYEN VAN A"
  }
}
```

## 16.2. Admin tạo payout order

```http
POST /api/v1/admin/withdrawals/11cc2849-3b2c-483c-85bf-7e58431a2d6a/approve
Authorization: Bearer <admin-token>
Content-Type: application/json
```

```json
{
  "remark": "Approved by finance admin"
}
```

Ví dụ response rút gọn:

```json
{
  "success": true,
  "status": 200,
  "message": "Withdrawal payout order created successfully.",
  "data": {
    "id": "11cc2849-3b2c-483c-85bf-7e58431a2d6a",
    "status": "processing",
    "payosPayoutId": "po_123456789",
    "payosReferenceId": "GLWD-EXAMPLE001",
    "payosStatus": "PROCESSING",
    "processedAt": "2026-06-29T08:10:11Z"
  }
}
```

## 16.3. Admin sync payout status

```http
POST /api/v1/admin/withdrawals/11cc2849-3b2c-483c-85bf-7e58431a2d6a/sync-status
Authorization: Bearer <admin-token>
```

Ví dụ response khi hoàn tất:

```json
{
  "success": true,
  "status": 200,
  "message": "Withdrawal payout status synchronized successfully.",
  "data": {
    "id": "11cc2849-3b2c-483c-85bf-7e58431a2d6a",
    "status": "completed",
    "payosStatus": "SUCCEEDED",
    "payosPayoutId": "po_123456789",
    "payosReferenceId": "GLWD-EXAMPLE001"
  }
}
```

---

## 17. Các lỗi thường gặp

### `INVALID_WITHDRAWAL_STATUS`

Nguyên nhân:

- request đang ở trạng thái không còn hợp lệ để approve hoặc sync,
- ví dụ đã `completed`, `rejected`, hoặc case cũ `approved` nhưng dữ liệu không khớp.

### `PAYOUT_BALANCE_FETCH_FAILED`

Nguyên nhân:

- backend không gọi được PayOS payout balance API,
- sai payout credentials,
- IP backend chưa whitelist đúng,
- payout channel chưa active,
- lỗi mạng / timeout.

### `INSUFFICIENT_PAYOUT_BALANCE`

Nguyên nhân:

- payout account của nền tảng không đủ tiền thật để chi,
- khác với wallet nội bộ của developer.

Ví dụ:

- developer wallet có 50,000 VND
- nhưng PayOS payout balance của admin chỉ còn 0
- thì vẫn không tạo payout order được

### Request ở `processing` lâu

Điều này có nghĩa:

- payout order đã được tạo,
- nhưng PayOS chưa trả về success cuối cùng,
- admin cần sync status lại.

### Request `completed` nhưng người dùng báo chưa thấy tiền

Khi đó cần kiểm tra:

1. PayOS status thật có đúng success không.
2. Bank BIN mapping có đúng ngân hàng không.
3. Account number / account holder có đúng không.
4. Có độ trễ từ ngân hàng đích không.

---

## 18. Checklist vận hành thực tế

Để payout hoạt động ổn định, cần có đủ:

### PayOS payout credentials

- payout client id
- payout api key
- payout checksum key

### Kênh chi PayOS active

- payout channel tồn tại
- payout account có đủ tiền
- trạng thái kênh là active

### IP whitelist đúng

Nếu PayOS yêu cầu whitelist IP:

- phải thêm public IP của backend đang gọi payout API

### Dữ liệu ngân hàng đầu vào đúng

- bank name map ra đúng BIN
- bank account đúng số tài khoản
- account holder đúng tên nhận

---

## 19. Sơ đồ luồng tóm tắt

```text
Buyer thanh toán marketplace thành công
  -> Seller wallet tăng theo net revenue
  -> Developer mở WalletPage
  -> Tạo withdrawal request
  -> status = pending
  -> Admin mở AdminWithdrawalPanel
  -> Xem detail
  -> Create Payout Order
  -> Backend kiểm tra payout balance
  -> Gọi PayOS create payout
  -> status = processing
  -> Admin sync status
  -> Nếu PayOS success:
       wallet -= amount
       tạo transaction withdrawal
       status = completed
     Nếu PayOS failed:
       wallet giữ nguyên
       status = failed
```

---

## 20. Kết luận

Luồng payout hiện tại của GodotLaunch đã tách rất rõ 3 giai đoạn:

1. Tạo yêu cầu rút tiền nội bộ
2. Tạo payout order ra PayOS
3. Chỉ khi PayOS success mới finalize vào sổ cái nội bộ

Điểm mạnh của implementation hiện tại:

- không trừ ví quá sớm,
- có kiểm tra payout balance trước khi tạo order,
- có sync status riêng,
- có idempotency cho bước finalize,
- transaction withdrawal được ghi nhận rõ ràng.

Nếu sau này mở rộng tiếp, các hướng phù hợp nhất là:

- auto polling payout status,
- webhook payout nếu PayOS hỗ trợ đầy đủ,
- notification cho developer khi payout completed / failed,
- dashboard tài chính chi tiết hơn cho admin.
