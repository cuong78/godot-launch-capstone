# 17. Kế hoạch cải thiện luồng Checkout → Nạp tiền → Thanh toán PayOS

> Tài liệu này mô tả kế hoạch nâng cấp trải nghiệm khi buyer mua game/asset trong
> marketplace mà ví không đủ tiền: tự động gợi ý số tiền cần nạp, giữ context giỏ
> hàng qua vòng nạp tiền, tự build trang thanh toán PayOS theo giao diện riêng của
> GodotLaunch thay vì redirect sang `pay.payos.vn`, và tự động hỏi xác nhận thanh
> toán khi quay lại trang checkout sau khi nạp tiền thành công.
>
> **Lưu ý phạm vi:** Tài liệu này CHỈ đặc tả thay đổi ở code nghiệp vụ
> (`main`), không đặt ra yêu cầu viết/sửa test (`test`). Khi triển khai, bỏ qua
> hoàn toàn việc cập nhật unit test/integration test để tiết kiệm quota — có
> thể để test cũ tự fail nếu signature đổi, xử lý sau nếu cần.

---

## 0. Hiện trạng đã xác nhận qua code (không suy đoán)

Khảo sát trực tiếp code trước khi lập kế hoạch, để plan bám sát kiến trúc thật:

1. **CheckoutPage hiện tại dùng ví nội bộ, không qua PayOS trực tiếp.**
   `CheckoutPage.tsx` gọi `orderApi.createOrder()` → `OrderServiceImpl.buy()`
   (`backend/.../service/impl/OrderServiceImpl.java`). Nếu `spendableBalance <
   totalAmount`, backend ném `InsufficientBalanceException` kèm
   `shortfall = price - spendableBalance` — đã có sẵn số tiền thiếu chính xác,
   chỉ chưa được frontend tận dụng.
2. **Không có cơ chế truyền "suggested amount" sang WalletPage.** Điều hướng
   dùng router tự chế (`ScreenType`/`setCurrentScreen`, không phải React
   Router thật). `CheckoutPage`'s `onGoToWallet` chỉ gọi
   `setCurrentScreen('wallet')` — không truyền kèm bất kỳ state/query nào.
3. **Field "Số tiền nạp (VND)" luôn khởi tạo rỗng** qua hook
   `useFormattedAmountInput` (`useState('')`), không đọc từ URL/props nào.
4. **PayOS SDK (`vn.payos:payos-java:2.0.1`) không có tham số custom giao
   diện trang thanh toán.** `CreatePaymentLinkRequest` chỉ nhận
   orderCode/amount/description/cancelUrl/returnUrl/buyer info/items — không
   theme/logo. Redirect hiện tại (`window.location.href = checkoutUrl`) đưa
   thẳng người dùng ra khỏi domain, sang `pay.payos.vn` — đúng là ảnh chụp
   màn hình bạn gửi.
5. **Nhưng response tạo payment link đã có sẵn `qrCode`, `bin`,
   `accountNumber`, `accountName`** (`CreatePaymentLinkResponse.java` trong
   SDK) — đủ dữ liệu để tự vẽ 1 trang QR thanh toán mang giao diện riêng, y
   hệt cơ chế card VietQR bạn đã thấy khi test rút tiền. Backend
   (`PayOSPaymentGateway.createPayment()`) **đã map `qrCode` vào
   `PaymentGatewayCreateResponse`** (dòng 67) nhưng field này **dừng lại ở
   DTO nội bộ, chưa được truyền tiếp ra `PaymentResponse`** (DTO trả cho
   frontend) — đây là gap cần lấp, không phải xây từ đầu.
6. **`returnUrl`/`cancelUrl` hiện trỏ về `/payment/success` /
   `/payment/cancelled?paymentId=...`** cho cả luồng mua item lẫn top-up ví
   (`PaymentServiceImpl.buildFrontendUrl()`). Không phân biệt được bằng URL,
   chỉ phân biệt được ở `PaymentResultPage` bằng việc `payment.orderId` có
   null hay không.
7. **Không có polling/scheduler nền nào đồng bộ trạng thái payment/top-up**
   (khác hẳn với `WithdrawalPayoutSyncScheduler` đã có cho rút tiền). Đồng bộ
   hiện tại hoàn toàn "on-demand": qua webhook PayOS gọi vào backend, hoặc
   frontend tự gọi `confirmPayment()` khi mount `PaymentResultPage`/khi mở lại
   `WalletPage`.
8. **Giỏ hàng (`cart`) chỉ tồn tại trong React state của `App.tsx`, không có
   sessionStorage/localStorage.** Vì redirect sang PayOS là điều hướng ra khỏi
   domain (full page navigation), quay lại app sau khi quét QR trên
   `pay.payos.vn` **hiện tại làm mất sạch giỏ hàng/context checkout đang dở
   dang** — đây là nguyên nhân chính khiến bạn phải tự bấm mua lại sau khi nạp
   tiền.

---

## 1. Mục tiêu UX cuối cùng

```
Vào game / giỏ hàng
   │
   ▼
Bấm "Thanh toán" (Checkout)
   │
   ▼
Ví không đủ tiền? ── Không ──► Trừ ví, tạo Order PAID ngay (giữ nguyên hiện tại)
   │ Có
   ▼
Hiện banner "Số dư không đủ, cần nạp thêm {shortfall}đ"
   │
   ▼
Bấm "Nạp thêm tiền" → sang WalletPage, ô "Số tiền nạp (VND)"
TỰ ĐỘNG điền sẵn đúng số tiền còn thiếu (làm tròn lên bội số hợp lệ nếu cần)
   │
   ▼
Bấm "Nạp tiền qua PayOS" → hiện trang thanh toán QR MANG GIAO DIỆN GODOTLAUNCH
(không redirect sang pay.payos.vn) — người dùng quét mã bằng app ngân hàng
   │
   ▼
Thanh toán xong (webhook PayOS báo về backend, ví được cộng tiền)
   │
   ▼
Trang tự phát hiện đã PAID (poll ngắn hạn, xem mục 4.4) → tự điều hướng
người dùng quay lại ĐÚNG CheckoutPage đang dở dang trước đó
   │
   ▼
Tự bật popup: "Ví đã có đủ số dư. Bạn có muốn thanh toán đơn hàng
[tên game] ngay bây giờ không?" [Có, thanh toán] [Để sau]
   │
   ▼
Bấm "Có" → gọi lại đúng luồng orderApi.createOrder() như bình thường
```

Khi vào ví **không** thông qua luồng thiếu tiền từ checkout (user tự bấm vào
trang Ví từ menu), ô "Số tiền nạp" giữ nguyên rỗng như hiện tại — không có gì
đổi ở nhánh này.

---

## 2. Thiết kế: giữ context checkout qua vòng nạp tiền

### 2.1 Vì sao không dùng React state (`App.tsx`) như hiện tại

Chuyển sang trang thanh toán PayOS tự dựng (mục 3) thì **không còn rời khỏi
domain nữa** — về lý thuyết state có thể sống sót. Nhưng vẫn cần một lớp lưu
trữ bền hơn state thuần, vì:
- User có thể reload tab thủ công trong lúc chờ quét QR.
- User có thể đóng tab, mở lại từ lịch sử trình duyệt.
- An toàn hơn nếu sau này vẫn cần fallback redirect ra `checkoutUrl` gốc của
  PayOS (ví dụ khi ngân hàng của user không hỗ trợ hiển thị QR embed).

→ Dùng `sessionStorage` (đã có tiền lệ trong `App.tsx` cho
`paymentOrders`/`selectedPaymentOrderId`), key mới:
`godotlaunch.pendingCheckoutContext`.

### 2.2 Cấu trúc dữ liệu lưu tạm

```ts
interface PendingCheckoutContext {
  cartItemIds: string[];       // hoặc snapshot rút gọn của cart để render lại banner
  totalAmount: number;
  shortfall: number;
  createdAt: string;           // ISO — dùng để tự hết hạn (vd sau 30 phút thì bỏ qua)
  triggeredTopUpPaymentId: string; // id của Payment top-up vừa tạo, để đối chiếu lúc quay lại
}
```

Ghi ngay trước khi điều hướng sang WalletPage (bước 3.3), xoá ngay sau khi:
- Popup xác nhận thanh toán được xử lý xong (dù bấm Có hay Để sau), hoặc
- Quá hạn `createdAt` (tránh popup "hồi sinh" một checkout đã nguội từ rất lâu
  trước, vd user nạp tiền cho việc khác rồi quay lại app nhiều ngày sau).

### 2.3 Vì sao không thử khôi phục nguyên `cart` đầy đủ

Cart có thể đã đổi (giá game thay đổi, item bị gỡ khỏi marketplace) trong lúc
user đi nạp tiền. Plan này chỉ khôi phục **ý định thanh toán** (đủ dữ liệu để
hỏi lại "bạn có muốn thanh toán X đồng cho [tên món] không") — khi user bấm
"Có", gọi lại API `createOrder` bình thường và để backend tự validate lại giá/
tồn tại y hệt lần đầu (không có gì đặc biệt, không bypass logic cũ).

---

## 3. Thay đổi cụ thể theo từng bước

### 3.1 Backend — trả `shortfall` sớm hơn, trước khi user bấm nút thật

Hiện tại `shortfall` chỉ có được SAU khi gọi `POST /api/orders` và nhận lỗi
`INSUFFICIENT_BALANCE`. Đủ dùng — không cần thêm endpoint "pre-check" riêng.
Việc cần làm: đảm bảo response lỗi này luôn có `shortfall` chính xác (đã có
sẵn ở `OrderServiceImpl.java`, chỉ cần xác nhận field này thực sự serialize ra
JSON response cho frontend đọc được — kiểm tra lại `ErrorResponse`/exception
handler nếu `shortfall` có bị handler global nuốt mất không khi map exception
sang HTTP response).

### 3.2 Frontend — `App.tsx` xử lý lỗi `INSUFFICIENT_BALANCE`

Sửa nhánh bắt lỗi hiện tại (chỗ đang show toast "walletShortfall"):
- Giữ nguyên toast báo lỗi.
- Thêm: ghi `PendingCheckoutContext` vào `sessionStorage` (mục 2.2) với
  `shortfall` lấy từ `err.response.data.shortfall`.
- Điều hướng sang `wallet` kèm 1 flag đơn giản (query param `?suggestTopUp=1`
  là đủ, không cần phức tạp hơn) để `WalletPage` biết cần đọc
  `sessionStorage` lúc mount.

### 3.3 Frontend — `WalletPage.tsx` tự điền số tiền nạp

Trong `useEffect` mount của `WalletPage`:
- Nếu route có `?suggestTopUp=1` **và** tồn tại
  `PendingCheckoutContext` hợp lệ (chưa hết hạn) trong `sessionStorage`:
  gọi `topUpAmountInput.setValue(String(context.shortfall))` (hook
  `useFormattedAmountInput` đã có sẵn `setValue`, dùng lại nguyên vẹn, không
  đổi hook).
  - Cân nhắc làm tròn lên bội số 1.000đ hoặc 10.000đ nếu muốn đẹp số, tùy
    business quyết — không bắt buộc theo yêu cầu gốc.
- Nếu **không** có `?suggestTopUp=1` (user tự vào ví từ menu): giữ nguyên hành
  vi hiện tại — field rỗng, không đọc `sessionStorage` gì cả (đúng yêu cầu
  "không đi từ game thì không hiện gợi ý").
- Hiển thị 1 banner nhỏ phía trên field: "Bạn cần nạp thêm {amount}đ để hoàn
  tất đơn hàng đang chờ" — cho user biết vì sao số tiền tự động xuất hiện,
  tránh khó hiểu.

### 3.4 Backend — trả `qrCode`/`bin`/`accountNumber`/`accountName` ra API

`PaymentResponse.java` (DTO trả cho frontend) thêm 4 field mới:
```java
private String qrCode;
private String bin;
private String bankAccountNumber;   // đổi tên khác accountNumber user's bank để tránh nhầm field khác trong DTO
private String bankAccountName;
```
Map từ `PaymentGatewayCreateResponse` (đã có `qrCode` sẵn từ trước — chỉ thiếu
3 field còn lại, cần thêm tương tự vào `PaymentGatewayCreateResponse.java` và
`PayOSPaymentGateway.createPayment()` — lấy thẳng từ
`response.getBin()/getAccountNumber()/getAccountName()` của SDK, đã có sẵn
theo model `CreatePaymentLinkResponse` của `payos-java`).

Áp dụng ở cả 2 nơi tạo payment: `createCheckoutPayment` (mua item qua PayOS
trực tiếp) và `createTopUpPayment` (nạp ví) — dùng chung 1 method map response,
không viết trùng 2 lần.

### 3.5 Frontend — trang thanh toán QR tự dựng

Thay vì `window.location.href = checkoutUrl` (redirect ra ngoài), sau khi tạo
payment thành công:
- Điều hướng sang 1 màn hình mới trong app, ví dụ `payment-qr` screen
  (route `/payment/qr?paymentId=...`), **không rời domain**.
- Trang này render:
  - QR code từ chuỗi `qrCode` trả về (dùng thư viện QR client-side, ví dụ
    `qrcode.react` hoặc tương đương — kiểm tra `package.json` xem đã có sẵn
    lib nào chưa trước khi thêm dependency mới).
  - Thông tin ngân hàng thụ hưởng (`bin` map ra tên ngân hàng hiển thị,
    `bankAccountNumber`, `bankAccountName`), số tiền, nội dung chuyển khoản —
    bố cục tương tự card bạn đã thấy ở trang PayOS gốc, nhưng dùng
    theme/logo/màu của GodotLaunch.
  - Nút "Sao chép" cho từng trường (STK, số tiền, nội dung) — UX quen thuộc.
  - Đồng hồ đếm ngược tới `expiredAt`.
  - Nút "Huỷ" gọi `cancelPayment` như hành vi hiện tại.
- **Fallback bắt buộc giữ:** vẫn hiện nút phụ "Mở trang thanh toán PayOS" trỏ
  ra `checkoutUrl` gốc — phòng trường hợp thư viện QR tự vẽ bị lỗi hoặc user
  muốn thanh toán bằng phương thức khác PayOS hỗ trợ trên trang gốc (thẻ,
  ví điện tử...) mà trang tự dựng của mình chưa làm được. Không cắt bỏ hoàn
  toàn đường cũ, chỉ đổi đường mặc định.

### 3.6 Đồng bộ trạng thái khi đang đứng ở trang QR tự dựng

Vì không còn redirect ra ngoài rồi quay lại (`returnUrl`) như trước, cần 1 cơ
chế để trang `payment-qr` **tự biết** khi nào đã PAID trong lúc user vẫn đang
đứng nhìn màn hình:
- Dùng polling ngắn hạn **chỉ khi đang mở trang này** (không phải scheduler
  nền phía backend) — gọi `paymentApi.confirmPayment(paymentId)` mỗi 3-5 giây,
  dừng ngay khi status khác `PENDING`/`PROCESSING`, hoặc khi user rời trang
  (unmount). Đây là mở rộng tự nhiên của cơ chế "on-demand sync" đã có sẵn
  (mục 0.7), không cần thêm scheduler backend mới.
- Khi phát hiện `PAID`:
  - Nếu đây là top-up ví (`orderId == null`) **và** tồn tại
    `PendingCheckoutContext` còn hạn trong `sessionStorage`: điều hướng thẳng
    về `checkout` screen, khôi phục banner giỏ hàng, rồi bật popup xác nhận
    (mục 3.7). Xoá `sessionStorage` sau khi xử lý xong.
  - Nếu không có context chờ (user chỉ nạp ví thường): về lại `WalletPage`,
    hiện toast thành công như hành vi hiện tại của `PaymentResultPage`.
  - Nếu đây là mua item trực tiếp qua PayOS (`orderId != null`): giữ hành vi
    hiện tại của `PaymentResultPage` (hiện downloadUrl/thông báo sở hữu).

### 3.7 Popup xác nhận thanh toán khi quay lại Checkout

Component mới (nhỏ, tái dùng pattern modal đã có trong dự án, ví dụ style của
`ReportDisputeModal`/các modal khác đã có):
- Tiêu đề: "Ví đã có đủ số dư"
- Nội dung: "Bạn có muốn thanh toán đơn hàng [tóm tắt giỏ hàng / tên game] với
  số tiền {totalAmount}đ ngay bây giờ không?"
- 2 nút: **"Thanh toán ngay"** (gọi lại `orderApi.createOrder()` y hệt luồng
  gốc, xử lý thành công/lỗi như cũ) và **"Để sau"** (đóng popup, xoá
  `sessionStorage`, ở lại trang hiện tại — KHÔNG tự huỷ giỏ hàng, để user có
  thể tự bấm thanh toán thủ công sau).

---

## 4. Việc CẦN làm, chia theo file (tóm tắt để triển khai)

### Backend
| File | Thay đổi |
|---|---|
| `PaymentGatewayCreateResponse.java` | Thêm field `bin`, `bankAccountNumber`, `bankAccountName` |
| `PayOSPaymentGateway.java` — `createPayment()` | Map thêm 3 field trên từ SDK response |
| `PaymentResponse.java` | Thêm field `qrCode`, `bin`, `bankAccountNumber`, `bankAccountName` |
| `PaymentServiceImpl.java` | Chỗ build `PaymentResponse` (cả 2 luồng checkout item + top-up) map thêm 4 field mới, dùng chung 1 hàm mapper |
| Exception handler / `ErrorResponse` liên quan `INSUFFICIENT_BALANCE` | Xác nhận field `shortfall` thực sự serialize ra JSON (kiểm tra, có thể không cần sửa gì nếu đã đúng) |

### Frontend
| File | Thay đổi |
|---|---|
| `App.tsx` | Bắt `INSUFFICIENT_BALANCE`: lưu `PendingCheckoutContext` vào `sessionStorage`, điều hướng `wallet?suggestTopUp=1` |
| `WalletPage.tsx` | Đọc `sessionStorage` khi có `?suggestTopUp=1`, tự `setValue(shortfall)` cho `topUpAmountInput`, hiện banner giải thích |
| Route mới `payment-qr` (thêm vào `ScreenType`, `pathToScreen`/`screenToPath` trong `App.tsx`) | Trang mới hiển thị QR tự dựng |
| Component mới `PaymentQrPage.tsx` (hoặc tên tương đương) | Render QR + thông tin ngân hàng + polling + fallback link `checkoutUrl` gốc |
| `walletApi.ts` / `paymentApi.ts` | Cập nhật type response nhận thêm `qrCode`/`bin`/`bankAccountNumber`/`bankAccountName` |
| Component modal mới `ConfirmResumeCheckoutModal.tsx` (hoặc tên tương đương) | Popup xác nhận thanh toán khi quay lại Checkout |
| `CheckoutPage.tsx` | Nhận tín hiệu "vừa quay lại từ nạp tiền" để mount popup xác nhận (có thể qua route state hoặc đọc lại `sessionStorage` trực tiếp) |
| package.json | Thêm dependency thư viện vẽ QR phía client (xác nhận chưa có sẵn, ví dụ `qrcode.react`) |

---

## 5. Rủi ro & điểm cần quyết định thêm khi triển khai

1. **Đã xác nhận `frontend/package.json` CHƯA có thư viện vẽ QR nào** (không
   `qrcode`/`qrcode.react`/tương đương) — cần thêm mới. Gợi ý `qrcode.react`
   (nhẹ, component React thuần, không phụ thuộc canvas polyfill phức tạp) khi
   triển khai, nhưng đây chỉ là gợi ý, không bắt buộc.
2. **Làm tròn số tiền gợi ý nạp**: PayOS có thể có mức tối thiểu/tối đa giao
   dịch riêng — nên validate `shortfall` qua đúng logic validate hiện có của
   field "Số tiền nạp" (tối thiểu 10.000đ, đã có sẵn) trước khi tự điền, tránh
   tự động điền một số tiền không hợp lệ khiến nút submit bị disable ngay khi
   vừa vào trang.
3. **Đa tab/đa thiết bị**: nếu user mở QR trên điện thoại (quét bằng app ngân
   hàng) trong khi tab gốc trên desktop đang polling — vẫn hoạt động đúng vì
   polling chỉ hỏi trạng thái qua `paymentId`, không phụ thuộc thiết bị nào
   thực hiện thanh toán.
4. **`sessionStorage` bị mất nếu user đổi hẳn sang tab ẩn danh khác hoặc trình
   duyệt khác để quét QR** — chấp nhận được, vì đây vẫn là edge case, có
   fallback: dù mất context, `PaymentQrPage` vẫn báo đúng "nạp tiền thành
   công" và đưa về `WalletPage` bình thường (không lỗi, chỉ mất tiện ích tự
   động quay lại checkout).
5. **Popup xác nhận nên có giới hạn số lần hiện lại** (vd chỉ hỏi 1 lần, nếu
   user bấm "Để sau" thì không tự động hỏi lại nữa dù còn context) — tránh
   làm phiền.

---

## 6. Việc KHÔNG làm trong phạm vi kế hoạch này

- Không đổi luồng "mua item trực tiếp qua PayOS" (`createCheckoutPayment`)
  hiện có — chỉ mở rộng để nó cũng trả đủ field QR mới, hành vi nghiệp vụ giữ
  nguyên.
- Không thêm scheduler backend mới cho payment (khác withdrawal) — polling
  chỉ chạy phía frontend, chỉ khi user đang mở đúng trang QR, tự dừng khi rời
  trang, giữ đúng triết lý "không query DB rỗng lặp lại suốt ngày" đã áp dụng
  cho `WithdrawalPayoutSyncScheduler`.
- Không cố gắng khôi phục lại toàn bộ trạng thái giỏ hàng chi tiết qua vòng
  nạp tiền — chỉ khôi phục đủ để hỏi xác nhận, để backend tự validate lại từ
  đầu khi thanh toán thật sự diễn ra.
- **Không viết/sửa unit test hay integration test cho các thay đổi trong kế
  hoạch này** — theo yêu cầu, bỏ qua hoàn toàn phần test để tiết kiệm quota.
  Nếu có test cũ tham chiếu tới các method/DTO bị đổi signature, chấp nhận để
  chúng fail hoặc xoá bỏ nếu không còn liên quan, không đầu tư công sức sửa
  lại cho pass.
