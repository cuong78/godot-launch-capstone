# Plan: Chỉ cho rút tiền từ doanh thu bán hàng, chặn rút tiền nạp trực tiếp (chống rửa tiền)

> Đọc `CLAUDE.md` trước khi làm. File này mô tả hiện trạng đã xác minh qua
> đọc code thật (không suy đoán), công thức tính đã chốt với user qua
> AskUserQuestion, và kế hoạch triển khai — chưa code gì.

## 1. Vấn đề nghiệp vụ

**Hiện tại**: user nạp tiền vào ví qua PayOS (`wallet_topup`), không mua
gì, rồi rút thẳng ra tài khoản ngân hàng — **hoàn toàn được phép**. Đây là
lỗ hổng để hệ thống bị lợi dụng làm kênh chuyển tiền/rửa tiền (nạp tiền
nguồn gốc không rõ ràng → rút ra ngân hàng sạch, hệ thống đóng vai trò
trung gian rửa tiền không chủ đích).

**Yêu cầu**: chỉ cho rút tiền có nguồn gốc từ **doanh thu bán hàng thật**
(game qua Store, asset/source code qua Marketplace). Tiền nạp trực tiếp mà
chưa dùng để mua gì (không sinh doanh thu) thì **không rút được**.

## 2. Hiện trạng đã xác minh (đọc code thật)

### 2.1 `Wallet.balance` là 1 số dư gộp duy nhất, không phân biệt nguồn gốc

`backend/.../entity/Wallet.java` — chỉ có 1 cột `balance` (`BigDecimal`).
Không có cột `topupBalance`/`revenueBalance` tách riêng. Toàn bộ lịch sử
biến động nằm ở bảng `transactions` (double-entry), không phải ở `Wallet`.

### 2.2 Đã có sẵn hạ tầng double-entry đúng chuẩn — chỉ chưa dùng để giới hạn rút tiền

`backend/.../service/impl/OrderServiceImpl.java` dòng 182-219 — mỗi giao
dịch mua hàng ghi **3 Transaction** (double-entry):
1. Buyer bị trừ: `TxnType.source_code_purchase` hoặc `.asset_purchase`,
   `amount` âm.
2. Seller được cộng: `TxnType.revenue_share`, `amount` dương — **đây
   chính là "doanh thu bán hàng thật" cần dùng làm giới hạn rút tiền**.
3. Platform nhận hoa hồng: `TxnType.commission`.

`backend/.../service/impl/PaymentServiceImpl.java` dòng ~603 — nạp tiền
qua PayOS ghi `TxnType.wallet_topup`, `amount` dương, **không** phải
doanh thu.

`backend/.../service/impl/DisputeServiceImpl.java` dòng 197-206 — khi
seller thua dispute (TH3, `resolved_seller_fault`) và admin xác nhận đã
hoàn tiền (`confirmRefund()`), ghi `TxnType.refund` **âm** vào ví seller
(trừ) và **dương** vào ví reporter (cộng) — đây là khoản đã "mất" khỏi
doanh thu, PHẢI trừ vào giới hạn rút tiền (đã chốt với user).

`backend/.../repository/TransactionRepository.java` đã có sẵn:
```java
@Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
        "WHERE t.wallet.id = :walletId AND t.type IN :types")
BigDecimal sumAmountByWalletIdAndTypeIn(@Param("walletId") UUID walletId,
                                        @Param("types") Set<TxnType> types);
```
Method này **đã tồn tại và đã được gọi** trong
`WithdrawalRequestServiceImpl.buildWalletMetrics()` để tính
`totalRevenue` — nhưng field đó **chỉ dùng để hiển thị thống kê**
(`DeveloperWalletSummaryResponse.totalRevenue`), **KHÔNG được dùng để giới
hạn `availableBalance`**. Đây chính là gap cần vá.

### 2.3 Công thức `availableBalance` hiện tại — không lọc nguồn gốc

`WithdrawalRequestServiceImpl.buildWalletMetrics()` (dòng 423-440):
```java
BigDecimal pendingBalance = sumAmountByUserIdAndStatusIn(developer.getId(), RESERVED_STATUSES);
// RESERVED_STATUSES = {pending, processing, approved}
BigDecimal availableBalance = wallet.getBalance().subtract(pendingBalance);
```
Chỉ trừ đi withdrawal đang chờ xử lý — **không quan tâm tiền đến từ đâu**.
Đây là dòng cốt lõi cần sửa.

## 3. Công thức mới (đã chốt với user)

```
netRevenueEarned = SUM(revenue_share) + SUM(refund)   -- refund luôn âm khi seller bị trừ, dương khi seller được cộng lại (hiếm)
eligibleForWithdrawal = MIN(netRevenueEarned, wallet.balance) - pendingWithdrawalBalance
availableBalance = MAX(0, eligibleForWithdrawal)
```

Giải thích từng phần:
- `MIN(netRevenueEarned, wallet.balance)`: seller không thể rút nhiều hơn
  balance thực tế trong ví (trường hợp đã tiêu bớt doanh thu để mua hàng
  khác trong hệ thống — đã chốt với user: không cần thuật toán FIFO phức
  tạp, chỉ cần chặn trần bằng balance thực tế).
- `- pendingWithdrawalBalance`: giữ nguyên cơ chế hiện có (không rút trùng
  khoản đang chờ xử lý).
- Tiền nạp (`wallet_topup`) hoàn toàn **không xuất hiện** trong công thức
  → tự động bị loại khỏi số tiền rút được, đúng yêu cầu.

**Ví dụ minh họa** (đã duyệt với user): seller nạp 1 triệu + bán hàng thu
2 triệu + dùng 500k mua asset khác trong hệ thống → balance thực tế còn
2.5 triệu, `netRevenueEarned` = 2 triệu (không đổi, vì mua hàng không phải
`revenue_share`/`refund`) → `eligibleForWithdrawal` = MIN(2tr, 2.5tr) = 2
triệu. Seller rút tối đa 2 triệu, 500k topup còn lại trong ví **không rút
được** (chỉ dùng để mua hàng tiếp).

## 4. Kế hoạch triển khai

### 4.1 Backend — sửa công thức giới hạn rút tiền

**File**: `backend/src/main/java/com/godotlaunch/backend/service/impl/WithdrawalRequestServiceImpl.java`

- `REVENUE_TXN_TYPES` (dòng 75-79) hiện gồm `source_code_purchase`,
  `asset_purchase`, `revenue_share` — **sai** cho mục đích mới:
  `source_code_purchase`/`asset_purchase` là khoản **trừ ví buyer**, ghi
  âm vào ví **buyer** chứ không phải seller, nên khi tính trên ví seller
  nó luôn góp 0 (không sai nhưng thừa/gây nhầm ý nghĩa tên biến). Đổi
  thành set mới rõ nghĩa:
  ```java
  private static final Set<TxnType> NET_REVENUE_TXN_TYPES = EnumSet.of(
          TxnType.revenue_share,
          TxnType.refund
  );
  ```
  Giữ `REVENUE_TXN_TYPES` cũ cho mục đích thống kê hiển thị nếu chỗ khác
  còn dùng (kiểm tra lại tại thời điểm code, khả năng cao là đổi luôn
  cùng 1 chỗ vì hiện chỉ 1 nơi dùng).

- `buildWalletMetrics()` (dòng 423-440): thêm bước tính
  `netRevenueEarned` bằng `sumAmountByWalletIdAndTypeIn(wallet.getId(),
  NET_REVENUE_TXN_TYPES)` (tái dùng đúng method có sẵn, không cần query
  mới), rồi áp công thức mục 3:
  ```java
  BigDecimal netRevenueEarned = safeAmount(
          transactionRepository.sumAmountByWalletIdAndTypeIn(wallet.getId(), NET_REVENUE_TXN_TYPES)
  );
  BigDecimal eligibleForWithdrawal = netRevenueEarned.min(wallet.getBalance());
  BigDecimal availableBalance = eligibleForWithdrawal.subtract(pendingBalance);
  if (availableBalance.compareTo(BigDecimal.ZERO) < 0) {
      availableBalance = BigDecimal.ZERO;
  }
  ```
  Đây là điểm chặn DUY NHẤT cần sửa — vì `createDeveloperWithdrawal()`
  (dòng 148-154) đã validate dựa trên `beforeMetrics.availableBalance()`,
  nên sửa đúng `buildWalletMetrics()` là đủ, không cần sửa thêm nơi khác.

- **DTO**: cân nhắc thêm field `netRevenueEarned` vào
  `DeveloperWalletSummaryResponse`/`WithdrawalDetailResponse` để frontend
  hiển thị minh bạch cho seller biết rõ "trong X đồng số dư, chỉ Y đồng
  rút được vì Z đồng là tiền nạp chưa dùng" — tránh seller thắc mắc/report
  bug khi thấy `availableBalance < balance` mà không hiểu vì sao.

### 4.2 Backend — thông báo lỗi rõ ràng khi vượt giới hạn mới

`ErrorCode.INSUFFICIENT_BALANCE` (dòng 115) hiện dùng chung cho mọi
trường hợp thiếu số dư — message "Insufficient wallet balance." không
giải thích LÝ DO (có thể do balance thật sự thấp, HOẶC do phần lớn là
tiền nạp chưa dùng). Cân nhắc thêm `ErrorCode` mới:
```java
WITHDRAWAL_EXCEEDS_REVENUE(HttpStatus.PAYMENT_REQUIRED,
    "Chỉ có thể rút tiền từ doanh thu bán hàng. Số dư nạp trực tiếp chưa qua giao dịch mua bán không được phép rút.");
```
Trong `createDeveloperWithdrawal()`, phân biệt 2 nhánh lỗi: nếu
`request.getAmount() > wallet.getBalance()` → `INSUFFICIENT_BALANCE`
(thật sự không đủ tiền); nếu `wallet.getBalance()` đủ nhưng
`availableBalance` (đã giới hạn theo doanh thu) không đủ →
`WITHDRAWAL_EXCEEDS_REVENUE` (đủ tiền trong ví nhưng phần lớn là tiền nạp
không rút được) — giúp seller hiểu đúng nguyên nhân bị từ chối thay vì
tưởng lỗi hệ thống.

### 4.3 Frontend — hiển thị minh bạch giới hạn rút tiền

**File**: `frontend/src/page/WalletPage.tsx`

- Card "Số dư khả dụng" hiện tại (`availableBalance`) sẽ tự động phản ánh
  đúng giới hạn mới sau khi backend sửa — không cần đổi logic hiển thị.
- Cân nhắc thêm 1 dòng chú thích/tooltip khi `wallet.balance >
  availableBalance` đáng kể (chênh lệch do có tiền nạp chưa dùng): ví dụ
  "Có {{amount}} tiền nạp chưa sử dụng — chỉ doanh thu bán hàng mới rút
  được." — dùng `netRevenueEarned` mới thêm ở mục 4.1 để tính phần chênh
  lệch hiển thị chính xác (không đoán mò `balance - availableBalance` vì
  còn bị trừ thêm `pendingBalance`).
- `frontend/src/locales/{vi,en,ja}/wallet.json`: thêm key i18n cho thông
  báo lỗi mới (`WITHDRAWAL_EXCEEDS_REVENUE`) và dòng chú thích nói trên.

### 4.4 Admin — hiển thị đủ thông tin khi review withdrawal (nếu còn giữ luồng xem chi tiết)

`AdminWithdrawalPanel.tsx`/`AdminWithdrawalDetailModal.tsx` (đã sửa ở các
lần trước — hiện KHÔNG còn bước admin duyệt thủ công, chỉ còn xem +
reject) — cân nhắc hiển thị thêm `netRevenueEarned` trong modal chi tiết
để admin có căn cứ khi cần `reject` 1 withdrawal khả nghi (dù về nguyên
tắc backend đã chặn cứng ở tầng validate, đây chỉ là minh bạch hóa thêm
cho admin theo dõi, không phải chốt chặn chính).

## 5. Việc CẦN NGƯỜI KHÁC QUYẾT ĐỊNH trước khi code

- **Seller đã rút tiền TRƯỚC KHI có giới hạn mới này** (dữ liệu lịch sử) —
  công thức mới áp dụng ngay cho mọi tính toán `availableBalance` kể từ
  lúc deploy, không cần data-migration gì (vì công thức tính động từ
  `transactions`, không lưu trạng thái riêng) — nhưng cần xác nhận: có
  seller nào hiện đang có `wallet.balance` phần lớn là tiền nạp cũ (từ
  trước khi có giới hạn) mà họ NGHĨ là rút được, giờ đột ngột bị chặn —
  có cần thông báo trước cho họ không, hay áp dụng ngay không cảnh báo?
- **`commission`/`wallet_topup` admin** — `PlatformWallet` (ví admin nhận
  hoa hồng) có bị áp dụng giới hạn này không, hay chỉ áp cho seller
  (`developer`/`customer` role)? Đọc lại `assertWalletSelfServiceUser()`
  hiện tại chỉ cho phép `developer`/`customer` tự tạo withdrawal — admin
  có luồng rút riêng (`PayoutGateway`/`AdminWithdrawalController`) không
  đi qua `createDeveloperWithdrawal()`, nên về mặt kỹ thuật không bị ảnh
  hưởng — chỉ cần xác nhận đúng đây có phải ý định hay cần áp dụng luôn
  cho admin.

## 6. Verification (sau khi code xong)

1. Backend compile: `mvn -q compile`.
2. Seed test: user nạp 1 triệu qua topup, không mua gì → gọi
   `createDeveloperWithdrawal` rút 500k → phải bị từ chối
   (`WITHDRAWAL_EXCEEDS_REVENUE`), dù `wallet.balance` đủ.
3. User đó bán 1 asset thu 2 triệu (`revenue_share`) → gọi rút 2 triệu →
   phải PASS (đúng bằng doanh thu, không tính phần topup 1 triệu).
4. User đó rút thêm 500k (từ phần topup còn lại) → phải bị từ chối, dù
   `wallet.balance` vẫn còn.
5. Test refund: seller thua dispute, bị trừ 1 triệu qua `confirmRefund()`
   → gọi lại `getDeveloperWalletSummary` → `netRevenueEarned` phải giảm
   đúng 1 triệu, `availableBalance` giảm tương ứng.
6. Test biên: seller dùng doanh thu để mua hàng khác trong hệ thống (trừ
   thẳng ví, không qua `wallet_topup`) → `netRevenueEarned` không đổi
   (đúng vì mua hàng không phải `revenue_share`/`refund`), nhưng
   `availableBalance` bị giới hạn bởi `wallet.balance` thực tế đã giảm
   (đúng công thức `MIN`).
7. `npx tsc --noEmit` sau khi sửa `WalletPage.tsx` + locale files.
