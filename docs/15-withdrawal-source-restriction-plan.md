# Plan: Tách tiền nạp và doanh thu để tiền nạp không bao giờ được rút

> Trạng thái: kế hoạch đã chốt nghiệp vụ, chưa triển khai code.
> Mục tiêu của tài liệu là mô tả đúng thứ tự triển khai và các invariant
> cần giữ xuyên suốt toàn bộ luồng tiền.

## 1. Quy tắc nghiệp vụ đã chốt

1. Tiền user nạp trực tiếp qua PayOS (`wallet_topup`) chỉ được dùng để mua
   sản phẩm trong hệ thống.
2. Tiền nạp trực tiếp không được rút trong bất kỳ trường hợp nào.
3. Chỉ doanh thu thật mà seller nhận được từ việc bán game/asset mới làm
   tăng hạn mức được rút.
4. Giao dịch mua hàng ưu tiên tiêu tiền nạp trước; chỉ khi tiền nạp không
   đủ mới tiêu sang doanh thu.
5. Tiền đã rút thành công và tiền seller bị trừ do thua dispute phải làm
   giảm hạn mức doanh thu còn được rút.
6. Yêu cầu rút đang `pending`, `processing` hoặc `approved` được hiển thị
   thành một chỉ số riêng là tiền đang chờ rút. Khoản này bị tạm giữ cho
   đến thời điểm payout tự động theo cấu hình. Nếu thất bại/bị hủy/bị từ
   chối thì hạn mức được giải phóng; nếu thành công thì tiền được chuyển
   đến tài khoản ngân hàng đã xác minh và trở thành tiền đã rút.
7. Tiền user nhận lại từ một dispute không phải doanh thu bán hàng mới,
   vì vậy mặc định chỉ được dùng để chi tiêu, không được rút.

## 2. Vì sao không dùng công thức SUM cũ

`Wallet` hiện chỉ có một cột `balance`. Plan cũ định suy ra tiền được rút:

```text
MIN(SUM(revenue_share) + SUM(refund), wallet.balance) - pending
```

Công thức này không đảm bảo quy tắc đã chốt:

- Không trừ withdrawal đã hoàn tất nên sau khi rút hết doanh thu, phần
  top-up còn lại có thể trở thành số dư rút được.
- Không thể xác định đúng nguồn tiền đã dùng cho giao dịch mua khi top-up,
  doanh thu và mua hàng xuất hiện xen kẽ theo thời gian.
- `refund` dương ở ví reporter không phải doanh thu bán hàng nhưng phép
  SUM cũ sẽ vô tình cho phép rút.
- Seller credit không phải lúc nào cũng mang type `revenue_share`:
  `PaymentServiceImpl.completePaidPayment()` hiện ghi seller credit dương
  với type `asset_purchase`.

Ví dụ chứng minh phép SUM tổng không đủ:

```text
1. top-up 100      -> mua 100
2. bán hàng +100   -> mua 100
3. top-up thêm 100
```

Balance cuối là 100 và toàn bộ 100 đó là top-up mới, nên không được rút.
Nếu chỉ lấy tổng lịch sử mà không xét thứ tự/phân bổ nguồn, hệ thống có
thể nhầm 100 này là doanh thu chưa rút.

## 3. Mô hình số dư đích

API và giao diện phải thể hiện bốn giá trị nghiệp vụ:

```text
balance                    = tổng tiền thực tế user đang có trong ví
withdrawable_balance       = doanh thu bán hàng còn lại, trước khi trừ pending
restricted_balance         = tiền chỉ dùng để mua hàng
pending_withdrawal_balance = tiền đang chờ đến thời điểm payout tự động
```

Ở database chỉ cần thêm `wallets.withdrawable_balance`:

- `restricted_balance` được tính bằng `balance - withdrawable_balance`.
- `pending_withdrawal_balance` được tính từ tổng các row trong
  `withdrawal_requests` có status `pending`, `processing` hoặc `approved`.

Không lưu thêm `pending_withdrawal_balance` trong `wallets`, vì đây là
trạng thái của withdrawal request. Lưu cùng một con số ở hai bảng sẽ có
nguy cơ lệch dữ liệu khi scheduler, callback PayOS hoặc thao tác reject
đổi trạng thái request. DTO/UI vẫn phải trả và hiển thị nó như một cột
số dư riêng.

Các invariant bắt buộc:

```text
balance >= 0
withdrawable_balance >= 0
withdrawable_balance <= balance
restricted_balance >= 0
```

Công thức hiển thị và validate rút tiền:

```text
pending_withdrawal_balance = SUM(amount của pending/processing/approved)

available_for_withdrawal = MAX(
    0,
    MIN(withdrawable_balance, balance) - pending_withdrawal_balance
)

restricted_balance = MAX(0, balance - withdrawable_balance)
```

`MIN(withdrawable_balance, balance)` là lớp phòng vệ dữ liệu. Khi mọi
invariant được giữ đúng thì `withdrawable_balance` luôn nhỏ hơn hoặc bằng
`balance`.

## 4. Quy tắc cập nhật các thành phần số dư

### 4.1 Nạp tiền trực tiếp

```text
balance += topup_amount
withdrawable_balance không đổi
```

Kết quả: tiền nạp làm tăng số tiền mua hàng nhưng không tăng tiền được rút.

### 4.2 Seller nhận doanh thu bán hàng

```text
balance += seller_net_revenue
withdrawable_balance += seller_net_revenue
```

Chỉ phần seller thực nhận sau commission mới là doanh thu được rút.

### 4.3 User mua sản phẩm bằng ví

Ưu tiên tiêu `restricted_balance` trước:

```text
restricted_before = balance - withdrawable_balance
paid_from_restricted = MIN(price, restricted_before)
paid_from_withdrawable = price - paid_from_restricted

balance -= price
withdrawable_balance -= paid_from_withdrawable
```

Nếu có withdrawal đang chờ, phần `withdrawable_balance` đã bị reserve
không được dùng để mua hàng. Số tiền mua tối đa:

```text
spendable_now = restricted_balance
              + MAX(0, withdrawable_balance - pending_withdrawal_balance)
```

Điều này tránh trường hợp user tạo lệnh rút rồi dùng cùng số tiền để mua
hàng trước khi payout hoàn tất.

### 4.4 Withdrawal đang chờ

Khi tạo request, hệ thống đặt status `pending` và bắt đầu thời gian giữ
theo cấu hình `withdrawalHoldDays`:

```text
balance không đổi
withdrawable_balance không đổi
pending_withdrawal_balance += requested_amount
available_for_withdrawal -= requested_amount
```

Tiền vẫn nằm trong ví ứng dụng trong thời gian chờ nhưng đã bị reserve:
không được tạo withdrawal khác hoặc mua hàng bằng chính khoản đang giữ.
Đây là số tiền hiển thị ở cột/card “Đang chờ rút”.

Không tạo cấu hình thời gian mới. Tái sử dụng chính xác hạ tầng Admin đã có:

- `PlatformSettings.withdrawalHoldDays`: số ngày giữ tiền, mặc định 5,
  Admin được cấu hình từ 0 đến 30 ngày.
- `PlatformSettings.dailyMaintenanceTime`: giờ chạy job hằng ngày theo
  `Asia/Ho_Chi_Minh`, mặc định `02:00:00`.
- `DynamicDailyCronTrigger`: đọc lại giờ từ DB mỗi lần tính lịch chạy kế
  tiếp, nên Admin đổi giờ không cần restart backend.
- `WithdrawalAutoPayoutScheduler`: tại mỗi lần chạy, lấy các withdrawal
  `pending` có `createdAt` trước cutoff `now - withdrawalHoldDays`.
- Nếu seller có dispute `open` hoặc đang `lockedForDispute`, withdrawal
  tiếp tục pending và chưa được payout.

`autoPayoutEligibleAt` tiếp tục được tính bằng:

```text
withdrawal.createdAt + withdrawalHoldDays
```

Đây là thời điểm withdrawal bắt đầu đủ điều kiện, không cam kết payout
đúng ngay giây đó. Payout được tạo ở lần chạy `dailyMaintenanceTime` đầu
tiên sau khi đủ điều kiện.

Request mới chỉ được tạo nếu:

```text
requested_amount <= available_for_withdrawal
```

### 4.5 Withdrawal hoàn tất

Ở lần chạy hằng ngày đầu tiên sau khi hết thời gian giữ, scheduler gọi
luồng `approveWithdrawal(..., adminEmail=null)` để tự tạo payout đến tài
khoản ngân hàng đã xác minh và chuyển request sang `processing`. Chỉ khi
job đồng bộ trạng thái nhận xác nhận thành công từ PayOS:

```text
balance -= withdrawal_amount
withdrawable_balance -= withdrawal_amount
pending_withdrawal_balance -= withdrawal_amount
```

Đồng thời ghi `Transaction(type=withdrawal, amount âm)` như hiện tại.
Tiền lúc này rời ví ứng dụng và được chuyển đến tài khoản ngân hàng của
user; không phải được cộng trở lại `wallet.balance`.

### 4.6 Withdrawal thất bại, bị hủy hoặc bị từ chối

Không thay đổi `balance` hoặc `withdrawable_balance`. Khi status rời nhóm
reserved, `pending_withdrawal_balance` tự giảm và hạn mức được giải phóng
trở lại `available_for_withdrawal`.

### 4.7 Seller thua dispute và phải hoàn tiền

Khoản hoàn làm giảm doanh thu được rút trước; nếu phần doanh thu còn lại
không đủ thì phần còn thiếu mới trừ vào tiền restricted:

```text
deduct_from_withdrawable = MIN(refund_amount, withdrawable_balance)

balance -= refund_amount
withdrawable_balance -= deduct_from_withdrawable
```

### 4.8 Reporter nhận tiền hoàn từ dispute

Đây không phải một sale mới:

```text
balance += refund_amount
withdrawable_balance không đổi
```

Tiền nhận lại có thể dùng để mua sản phẩm nhưng không được rút.

## 5. Thứ tự triển khai

### Bước 1 — Migration và backfill dữ liệu cũ

Tạo migration tiếp theo, dự kiến:

```text
backend/src/main/resources/db/migration/V17__add_withdrawable_balance.sql
```

Thứ tự trong migration:

1. Thêm `wallets.withdrawable_balance numeric(15,2)` tạm thời cho phép
   null hoặc có default `0`.
2. Backfill từng wallet bằng cách replay `transactions` theo
   `created_at, id`, không dùng SUM tổng đơn giản.
3. Quy tắc replay lịch sử:
   - `wallet_topup` dương: cộng restricted.
   - Seller credit dương từ sale: cộng withdrawable. Dữ liệu cũ phải nhận
     cả `revenue_share` dương và `asset_purchase`/`source_code_purchase`
     dương có `order_id`.
   - Purchase âm: trừ restricted trước rồi mới trừ withdrawable.
   - `withdrawal` âm: trừ withdrawable.
   - `refund` âm: trừ withdrawable trước; `refund` dương: cộng restricted.
   - `commission`: không cấp quyền rút qua luồng self-service user.
4. Nếu lịch sử thiếu transaction hoặc không khớp `wallet.balance`, phần
   balance dương không giải thích được phải mặc định là restricted. Không
   tự suy đoán đó là doanh thu.
5. Clamp kết quả cuối:

   ```text
   withdrawable_balance = MIN(
       wallet.balance,
       MAX(0, replayed_withdrawable_balance)
   )
   ```

6. Chạy query audit trước khi thêm constraint.
7. Chuyển cột thành `NOT NULL DEFAULT 0` và thêm check:

   ```text
   withdrawable_balance >= 0
   withdrawable_balance <= balance
   ```

Không deploy code mới trước khi migration/backfill hoàn tất.

### Bước 2 — Cập nhật entity và gom logic thay đổi balance

File chính:

- `backend/.../entity/Wallet.java`
- Tạo domain/helper service dùng chung cho việc credit/debit hai bucket.

Thêm field:

```java
private BigDecimal withdrawableBalance = BigDecimal.ZERO;
```

Không để mỗi service tự viết công thức rời rạc. Helper phải cung cấp các
operation có tên rõ nghĩa, ví dụ:

- `creditRestricted(...)`
- `creditSalesRevenue(...)`
- `debitPurchaseRestrictedFirst(...)`
- `debitCompletedWithdrawal(...)`
- `debitSellerRefund(...)`

Mỗi operation phải kiểm tra invariant trước khi save.

### Bước 3 — Sửa luồng top-up

File:

- `PaymentServiceImpl.completePaidPayment()`

Với payment top-up thông thường:

- Chỉ tăng `balance`.
- Không tăng `withdrawableBalance`.
- Tiếp tục ghi `wallet_topup` dương.
- Giữ idempotency hiện tại để webhook/confirm lặp không cộng tiền hai lần.

### Bước 4 — Chuẩn hóa mọi luồng seller nhận doanh thu

Các file phải rà và sửa đồng bộ:

- `OrderServiceImpl`
- `PaymentServiceImpl`
- `WalletServiceImpl`

Yêu cầu:

1. Mọi seller credit từ sale tăng cả `balance` và
   `withdrawableBalance` đúng bằng net revenue.
2. Chuẩn hóa transaction seller thành `TxnType.revenue_share`.
3. Buyer debit vẫn giữ `asset_purchase` hoặc `source_code_purchase`.
4. Platform commission không đi vào hạn mức self-service của user.
5. Bổ sung test riêng cho cả mua bằng wallet và mua trực tiếp qua PayOS,
   vì hai nhánh hiện ghi type seller khác nhau.

### Bước 5 — Sửa luồng mua hàng bằng số dư ví

File chính:

- `OrderServiceImpl`

Thay việc chỉ kiểm tra `wallet.balance >= price` bằng:

1. Lock wallet buyer.
2. Tính pending withdrawal của buyer.
3. Tính `restrictedBalance` và phần withdrawable chưa reserve.
4. Chỉ cho mua nếu `spendableNow >= price`.
5. Trừ restricted trước, sau đó mới trừ withdrawable.
6. Lưu `balance` và `withdrawableBalance` trong cùng transaction DB.

Luồng PayOS mua trực tiếp cộng rồi trừ ngay cùng một payment không được
biến khoản tiền đó thành top-up có thể rút; seller vẫn nhận revenue bình
thường.

### Bước 6 — Sửa luồng dispute refund

File:

- `DisputeServiceImpl.confirmRefund()`

Yêu cầu:

- Lock wallet seller và reporter theo thứ tự UUID ổn định để tránh deadlock.
- Lock dispute trước khi chuyển tiền để hai lần confirm đồng thời không hoàn
  tiền trùng; scheduler quá hạn phải kiểm tra lại trạng thái sau khi lock.
- Seller outgoing refund giảm withdrawable trước như mục 4.7.
- Reporter incoming refund chỉ tăng balance, không tăng withdrawable.
- Sửa `transactions_amount_check` để `refund` chấp nhận cả seller debit âm
  và reporter credit dương; các loại transaction khác vẫn giữ đúng dấu.
- Hai wallet, hai transaction refund và trạng thái dispute phải commit
  trong cùng transaction.

### Bước 7 — Sửa validate và hoàn tất withdrawal

Files:

- `WithdrawalRequestServiceImpl`
- `WithdrawalStatusSynchronizerImpl`

Trong `buildWalletMetrics()`:

```text
availableBalance = MAX(
    0,
    MIN(wallet.withdrawableBalance, wallet.balance) - pendingBalance
)
```

Trong `createDeveloperWithdrawal()`:

1. Lock wallet.
2. Tính metrics sau khi lock.
3. Nếu amount lớn hơn `wallet.balance`: trả `INSUFFICIENT_BALANCE`.
4. Nếu balance đủ nhưng amount lớn hơn `availableBalance`: trả
   `WITHDRAWAL_EXCEEDS_REVENUE`.
5. Chỉ sau đó mới tạo withdrawal `pending`.

Ngay trước khi tạo payout thật, lock lại wallet và kiểm tra tổng tất cả
request đang reserve vẫn không vượt `balance` hoặc `withdrawableBalance`.
Điều này chặn payout nếu một dispute refund phát sinh sau lúc request được
tạo và đã làm giảm bucket doanh thu.

Giữ nguyên cơ chế thời gian đã có, không viết scheduler/timer mới:

- `WithdrawalAutoPayoutScheduler` dùng `withdrawalHoldDays` của Admin.
- Job chạy theo `dailyMaintenanceTime` giờ Việt Nam.
- `autoPayoutEligibleAt = createdAt + withdrawalHoldDays` được trả về DTO
  để frontend/admin hiển thị thời gian còn lại.
- Dispute `open` hoặc `lockedForDispute` tiếp tục chặn auto payout như code
  hiện tại.

Trong `WithdrawalStatusSynchronizerImpl` khi PayOS báo thành công:

- Trừ cả `balance` và `withdrawableBalance`.
- Không tạo transaction/lặp trừ lần hai nếu withdrawal đã có transaction.
- Kiểm tra cả hai số dư trước khi trừ.

### Bước 8 — DTO và thông báo lỗi

Thêm `ErrorCode`:

```java
WITHDRAWAL_EXCEEDS_REVENUE(
    HttpStatus.PAYMENT_REQUIRED,
    "Chỉ có thể rút doanh thu bán hàng. Tiền nạp và các khoản không phải doanh thu chỉ được dùng để mua sản phẩm."
)
```

Mở rộng các response cần thiết:

- `DeveloperWalletSummaryResponse`
- `WithdrawalDetailResponse` nếu màn admin cần xem

Các field đề xuất:

```text
walletBalance
withdrawableBalance       -- doanh thu còn lại trước pending
restrictedBalance         -- tiền chỉ dùng để mua hàng
pendingBalance            -- tiền đang chờ đến thời điểm payout tự động
availableBalance          -- số có thể tạo yêu cầu rút ngay
totalRevenue              -- thống kê doanh thu lifetime, không dùng validate
```

Phải giữ rõ `totalRevenue` là chỉ số thống kê, không phải hạn mức rút.

### Bước 9 — Frontend Wallet và i18n

Files:

- `frontend/src/page/WalletPage.tsx`
- `frontend/src/types.ts`
- `frontend/src/locales/{vi,en,ja}/wallet.json`

Hiển thị tối thiểu:

- Tổng số dư ví.
- Có thể rút ngay.
- Đang chờ rút: tổng tiền pending/processing/approved và mô tả rằng tiền
  sẽ tự động chuyển về tài khoản ngân hàng sau thời gian giữ.
- Số dư chỉ dùng mua hàng.
- Chú thích: tiền nạp trực tiếp và refund nhận lại không được rút.

Khi backend trả `WITHDRAWAL_EXCEEDS_REVENUE`, frontend phải hiển thị lý do
nghiệp vụ, không dùng chung câu “không đủ số dư”.

Admin detail có thể hiển thị thêm các bucket để tra soát, nhưng không phải
chốt chặn bảo mật.

### Bước 10 — Khóa đồng thời và kiểm tra invariant

Mọi đường thay đổi `balance` hoặc `withdrawableBalance` phải:

1. Chạy trong `@Transactional`.
2. Lấy pessimistic lock cho wallet liên quan.
3. Nếu tác động nhiều wallet, lock theo UUID tăng dần.
4. Cập nhật hai field trong cùng transaction.
5. Không được để webhook, scheduler hoặc retry áp dụng giao dịch hai lần.
6. Sau update phải thỏa:

   ```text
   0 <= withdrawableBalance <= balance
   ```

Rà toàn bộ call site `wallet.setBalance(...)`; không chỉ sửa withdrawal.

### Bước 11 — Test theo đúng thứ tự nghiệp vụ

Backend unit/integration test bắt buộc:

1. Top-up 100, không sale → balance 100, withdrawable 0, rút 1 cũng fail.
2. Top-up 100, mua 40 → balance 60, withdrawable 0.
3. Sale +200 → balance và withdrawable cùng tăng 200.
4. Top-up 100 + sale 200 + mua 50 → mua trừ top-up trước; còn restricted
   50 và withdrawable 200.
5. Sau ca 4 rút thành công 200 → còn balance 50, withdrawable 0; không
   được rút thêm 1 đồng.
6. Rút hết revenue rồi top-up thêm → top-up mới vẫn không được rút.
7. Top-up 100 → mua 100 → sale 100 → mua 100 → top-up thêm 100:
   balance cuối 100 nhưng withdrawable phải bằng 0.
8. Tạo withdrawal pending → `pendingBalance` tăng và `availableBalance`
   giảm cùng số tiền, nhưng hai cột ví chưa thay đổi.
9. Chưa đến `autoPayoutEligibleAt` → scheduler không được tạo payout.
10. Đã đến `autoPayoutEligibleAt` nhưng chưa tới lần chạy
    `dailyMaintenanceTime` tiếp theo → request vẫn pending.
11. Tới lần chạy hằng ngày sau khi đủ điều kiện → scheduler tự tạo payout
    vào tài khoản ngân hàng đã xác minh và chuyển request sang processing.
12. Seller có dispute open/đang bị khóa → scheduler giữ pending dù đã đủ
    ngày; chỉ xử lý sau khi điều kiện chặn được giải quyết.
13. Pending bị reject/cancel/fail → `pendingBalance` giảm và hạn mức được
    mở lại.
14. Completed withdrawal → `pendingBalance` giảm, đồng thời giảm cả
    balance và withdrawable đúng một lần, kể cả scheduler/webhook chạy lặp.
15. Seller refund âm → giảm withdrawable; nếu refund lớn hơn withdrawable,
    phần thiếu trừ restricted.
16. Reporter nhận refund dương → balance tăng nhưng withdrawable không tăng.
17. Seller sale qua `OrderServiceImpl` và qua `PaymentServiceImpl` đều tạo
    cùng kết quả bucket.
18. Hai request rút đồng thời không được reserve vượt available.
19. Purchase và payout đồng thời không phá invariant hoặc tiêu vào tiền
    đã reserve.

Frontend verification:

1. TypeScript compile.
2. Card số dư hiển thị đúng các bucket.
3. Form rút giới hạn theo `availableBalance`.
4. Lỗi vượt doanh thu có nội dung riêng ở vi/en/ja.

### Bước 12 — Audit và rollout

Trước deploy:

1. Backup bảng `wallets`, `transactions`, `withdrawal_requests`.
2. Chạy report so sánh `wallet.balance` với tổng transaction ledger.
3. Liệt kê wallet có dữ liệu thiếu, balance âm logic hoặc transaction type
   không xác định được nguồn.
4. Với dữ liệu không chắc chắn, mặc định phần đó là restricted.
5. Chạy migration/backfill trên bản sao dữ liệu trước.
6. Kiểm tra không có row vi phạm constraint.
7. Deploy backend trước frontend.
8. Theo dõi log lỗi invariant, payout fail và chênh lệch bucket sau deploy.

Rollback phải khôi phục cả schema lẫn dữ liệu backfill từ backup; không tự
ý đặt `withdrawable_balance = balance` vì thao tác đó sẽ cho phép rút tiền
nạp cũ.

## 6. Phạm vi không thay đổi

- Admin/platform commission hiện không đi qua self-service withdrawal của
  developer/customer, nên không áp dụng hạn mức này cho payout nội bộ
  của platform trong lần triển khai này.
- Không thay đổi quy tắc ngân hàng/KYC.
- Không cho phép user chuyển tiền trực tiếp giữa hai ví.
- Không xác định nguồn tiền bằng dữ liệu frontend; backend và database là
  nguồn sự thật duy nhất.

## 7. Điều kiện hoàn thành

Nghiệp vụ chỉ được xem là hoàn thành khi chứng minh được invariant sau với
test tự động và dữ liệu backfill:

> Một đồng đi vào ví bằng `wallet_topup` hoặc refund nhận lại không thể làm
> tăng `withdrawable_balance`, kể cả sau nhiều lần mua hàng, bán hàng, nạp
> thêm, tạo/hủy withdrawal hoặc chạy payout retry theo bất kỳ thứ tự nào.
