# 26. Dispute: bồi thường D theo công thức, khóa đăng lại + cảnh báo khi kết luận

> Bối cảnh: A đăng bán game, B và C mua, D (chủ sở hữu bản quyền gốc) report
> dispute tố A đạo nhái. Admin kết luận A vi phạm (TH3 —
> `resolved_seller_fault`). Đây là bản thiết kế lại HOÀN TOÀN của
> [docs/26 bản trước] sau khi thống nhất lại toàn bộ business rule với chủ
> dự án — khác đáng kể so với bản đầu (xem mục 0 — những gì đã đổi).
>
> **Lưu ý phạm vi:** Tài liệu này CHỈ đặc tả thay đổi ở code nghiệp vụ
> (`main`), không đặt ra yêu cầu viết/sửa test (`test`). Bỏ qua hoàn toàn
> việc cập nhật unit test/integration test khi triển khai, để tiết kiệm
> quota — theo đúng quy ước đã áp dụng cho các kế hoạch trước.

---

## 0. Những quyết định đã chốt (nguồn: trao đổi trực tiếp, không suy đoán)

1. **B, C, D đều nhận tiền dạng `creditRestricted`** (giống cơ chế B,C hiện
   có) — **không ai rút được ra ngân hàng**, chỉ tiêu trong platform. Nhất
   quán với chính sách chống rửa tiền đã có (`V20__add_withdrawable_balance.sql`).
   → Vì không phải tiền mặt thật rời platform, khoản "ứng trước" khi ví A
   không đủ chỉ là bút toán nội bộ — platform không chịu rủi ro tài chính
   thật.
2. **B, C, D được hoàn/bồi thường NGAY LẬP TỨC lúc admin resolve** (giống
   hệt cách B,C đang hoạt động hiện tại) — không ai phải đợi A nạp tiền
   trước. A "trả sau" cho platform (phần platform đã ứng trước), có hạn,
   không trả thì bị ban.
3. **Khoản bồi thường D dùng công thức tự động, admin chỉnh tay được**:
   ```
   suggestedAmount = min(giaBan × multiplier(soLuongDaBan), tongDoanhThuThucANhan)
   ```
   - `multiplier` tăng theo số lượng đơn đã bán của game đó (quy mô vi phạm
     càng lớn, hệ số càng cao).
   - Luôn có **trần** = tổng doanh thu thực A đã nhận từ game đó (sau hoa
     hồng) — tránh admin nhập số phi thực tế, vượt quá những gì A thực sự
     kiếm được.
   - Admin xem con số gợi ý, có thể sửa tay trước khi xác nhận resolve.
4. **A phải "trả" cho cả B, C, D** — không chỉ B,C như thiết kế cũ. Khoản nợ
   A phải trả platform = tổng(hoàn B) + tổng(hoàn C) + bồi thường D.
5. **Cơ chế xử lý khi ví A không đủ tiền lúc resolve:**
   - Platform tự ứng trước phần thiếu cho B, C, D ngay lúc đó (bút toán nội
     bộ, không phải tiền mặt thật — xem mục 1).
   - Ghi nhận khoản A còn nợ platform + đặt hạn hoàn trả
     (`refundDeadline = resolvedAt + platformSettingsService.getRefundDeadlineDays()`).
   - A tự nạp tiền vào ví trong hạn → admin xác nhận (`confirmRefund`) →
     **trừ ví A số tiền A còn nợ platform** (không phải cộng lại cho B,C,D vì
     họ đã được cộng ngay từ bước resolve).
   - Quá hạn mà A chưa trả đủ → scheduler tự động **ban A vĩnh viễn** (giữ
     nguyên cơ chế `DisputeRefundEnforcementScheduler` đã có, chỉ đổi ý
     nghĩa khoản nợ — xem mục 2).
6. **Khoảng trống #2 — chọn hướng C**: khi B/C submit game mới có source
   trùng khớp cao với game từng bị kết luận `resolved_seller_fault`, hệ
   thống **chỉ gắn cờ ưu tiên cao cho admin review, KHÔNG tự động reject**
   (an toàn hơn nếu AI review nhầm do trùng hợp ngẫu nhiên).
7. **Khoảng trống #3 — chỉ cảnh báo buyer SAU KHI dispute có kết luận
   chính thức** (không cảnh báo lúc mới `open` như bản thiết kế trước) —
   tránh cảnh báo oan nếu sau đó dispute rơi vào TH1/TH2.

---

## 1. Thiết kế lại luồng tiền TH3 (`resolved_seller_fault`)

### 1.1 Công thức gợi ý bồi thường D

Thêm hằng số cấu hình (Platform Settings hoặc hardcode, xem mục 3.1):

```java
// Ví dụ hệ số theo số đơn đã bán — admin có thể tinh chỉnh giá trị này
// trong PlatformSettings sau nếu muốn, nhưng bảng hệ số nên bắt đầu hardcode
// đơn giản trong service, không cần thêm bảng cấu hình phức tạp ngay từ đầu.
private BigDecimal resolveMultiplier(long unitsSold) {
    if (unitsSold <= 2) return new BigDecimal("2");
    if (unitsSold <= 10) return new BigDecimal("3");
    return new BigDecimal("5");
}
```

Tính gợi ý khi admin mở màn hình resolve (endpoint mới hoặc field bổ sung
trong response chi tiết dispute — xem mục 3.2):

```java
BigDecimal listedPrice = dispute.getGame().getPrice(); // giá bán marketplace hiện tại
long unitsSold = orderRepository.countByGameId(dispute.getGame().getId()); // cần thêm method đếm nếu chưa có
BigDecimal totalSellerRevenue = /* tổng doanh thu thực A nhận từ game này, sau hoa hồng —
                                    có thể tính qua transactionRepository theo TxnType.revenue_share
                                    filter theo game, xem cách tính tương tự sumAssetSalesByWalletIdAndType
                                    đã có ở TransactionRepository cho pattern tham khảo */

BigDecimal suggested = listedPrice
        .multiply(resolveMultiplier(unitsSold))
        .min(totalSellerRevenue);
```

### 1.2 Sửa `resolveDispute()` nhánh `resolved_seller_fault`

Thay hoàn toàn logic hiện tại
([DisputeServiceImpl.java:182-218](../backend/src/main/java/com/godotlaunch/backend/service/impl/DisputeServiceImpl.java#L182-L218)):

```java
case "resolved_seller_fault" -> {
    if (request.isBanUser()) {
        banSeller(dispute.getReportedSeller(), "copyright_theft");
    } else {
        lockSellerForRefund(dispute.getReportedSeller(), dispute);
    }

    // Bước 1: hoàn B,C (auto-refund buyer trong N ngày gần nhất — GIỮ NGUYÊN
    // logic autoRefundRecentBuyers() hiện có, không đổi).
    BigDecimal totalRefundedToBuyers = autoRefundRecentBuyers(dispute, admin);

    // Bước 2: bồi thường D — dùng số admin đã xác nhận/sửa từ gợi ý (KHÔNG
    // còn tự tính lại ở đây, request.getRefundAmount() PHẢI được đọc, đây
    // chính là bug đã xác nhận ở bản thiết kế trước).
    BigDecimal reporterCompensation = request.getRefundAmount();
    if (reporterCompensation == null || reporterCompensation.compareTo(BigDecimal.ZERO) < 0) {
        reporterCompensation = BigDecimal.ZERO;
    }

    // Bước 3: cộng NGAY cho D (creditRestricted), giống cách buyer B,C được
    // cộng ngay trong autoRefundRecentBuyers() — không đợi A nạp tiền trước.
    // Tính toán số A thực trả được ngay (sellerDebit) vs phần platform phải
    // ứng trước (platformAdvance), CHO CẢ 3 nhóm B+C+D gộp lại làm một sổ nợ.
    BigDecimal totalOwedByA = totalRefundedToBuyers.add(reporterCompensation);
    // (autoRefundRecentBuyers() đã tự xử lý phần seller/platform debit cho
    // B,C riêng theo từng order — chỉ còn phần D cần xử lý ở đây)
    creditReporterAndTrackSellerDebt(dispute, reporterCompensation, admin);

    dispute.setRefundAmount(reporterCompensation); // đúng ý nghĩa: khoản D được bồi thường
    // Nếu A còn nợ platform bất kỳ phần nào (từ B,C hoặc D) → đặt hạn trả.
    // sellerOutstandingDebt cần track riêng (xem 1.3 — cột mới), KHÔNG dùng
    // lại refundAmount cho việc này vì refundAmount giờ có ý nghĩa khác (số
    // D được bồi thường), tránh lặp lại đúng lỗi ghi đè của bản cũ.
    if (sellerOutstandingDebt.compareTo(BigDecimal.ZERO) > 0) {
        dispute.setRefundDeadline(Instant.now().plus(
                platformSettingsService.getRefundDeadlineDays(), ChronoUnit.DAYS));
    } else {
        dispute.setRefundConfirmedAt(Instant.now()); // A đã đủ tiền trả ngay, không có nợ treo
    }

    // ... giữ nguyên phần notify hiện có, bổ sung nội dung nhắc rõ 2 khoản
    // (hoàn buyer + bồi thường D) tách bạch trong thông báo gửi A.
}
```

**Lưu ý quan trọng khi triển khai thật:** đoạn giả code trên minh họa Ý ĐỒ,
không phải patch sẵn sàng dán — người triển khai cần tự thiết kế lại cách
`autoRefundRecentBuyers()` trả về đủ thông tin `sellerDebit` đã dùng cho
B,C (để cộng dồn đúng vào `sellerOutstandingDebt` chung), và viết hàm mới
`creditReporterAndTrackSellerDebt()` áp dụng đúng logic debit ví A giới hạn
không âm + platform ứng phần thiếu, tương tự pattern đã có trong
`autoRefundRecentBuyers()` (dòng 312-341) nhưng áp dụng cho D thay vì cho
1 buyer.

### 1.3 Cần thêm cột mới trên `Dispute` — track nợ A phải trả platform

Field `refundAmount` hiện tại không đủ diễn tả 2 khái niệm khác nhau (số D
được bồi thường vs số A còn nợ platform sau khi platform đã ứng trước cho
B,C,D). Thêm migration mới:

```sql
-- V__add_seller_outstanding_debt_to_disputes.sql
ALTER TABLE public.disputes ADD COLUMN seller_outstanding_debt numeric(15,2);
COMMENT ON COLUMN public.disputes.seller_outstanding_debt IS
    'Tổng tiền A còn nợ platform sau khi platform đã ứng trước hoàn B,C + bồi thường D. NULL/0 = A đã trả đủ ngay lúc resolve, không có nợ treo.';
```

`refundAmount` giữ nguyên ý nghĩa: số tiền D được bồi thường (khớp đúng
comment gốc trong `ResolveDisputeRequest.java:19`, chỉ khác là giờ P
platform ứng trước NGAY thay vì đợi A nạp trước như comment cũ mô tả).

### 1.4 Sửa `confirmRefund()` — đổi ý nghĩa: A trả NỢ platform, không phải trả D trực tiếp

Vì D đã nhận tiền ngay từ bước resolve (mục 1.2), `confirmRefund()`
([DisputeServiceImpl.java:394-468](../backend/src/main/java/com/godotlaunch/backend/service/impl/DisputeServiceImpl.java#L394-L468))
cần đổi từ "trừ ví A, cộng ví D" thành **"trừ ví A, cộng ví PLATFORM"**
(hoàn trả khoản platform đã ứng trước):

```java
BigDecimal debt = dispute.getSellerOutstandingDebt();
validateRefundAmount(debt);
// ...debit ví A, credit ví PLATFORM (không phải ví reporter D nữa)...
dispute.setSellerOutstandingDebt(BigDecimal.ZERO);
dispute.setRefundConfirmedAt(Instant.now());
```

`unlockSellerRole()` giữ nguyên logic không đổi.

### 1.5 `DisputeRefundEnforcementScheduler` — giữ nguyên cơ chế, đổi ý nghĩa dữ liệu nguồn

Không cần sửa code scheduler
([DisputeRefundEnforcementScheduler.java](../backend/src/main/java/com/godotlaunch/backend/scheduler/DisputeRefundEnforcementScheduler.java)) —
nó vẫn lọc đúng theo `refundConfirmedAt IS NULL AND refundDeadline < now()`.
Khác biệt duy nhất: giờ điều kiện này sẽ **thực sự khớp được** vì
`refundDeadline` đã được set đúng ở bước 1.2 khi A còn nợ platform — sửa
xong mục 1.2-1.4 là scheduler tự động hoạt động đúng như thiết kế ban đầu,
không cần đụng vào file này.

---

## 2. Khoảng trống #2 — Hướng C: gắn cờ ưu tiên khi B/C đăng lại source đã bị kết luận đạo nhái

### 2.1 Vấn đề cụ thể cần giải quyết

`PlagiarismFlag`
([PlagiarismFlag.java](../backend/src/main/java/com/godotlaunch/backend/entity/PlagiarismFlag.java))
đã có sẵn cơ chế so khớp game mới submit với MỌI game khác trong hệ thống
qua `matchedGame` + `similarityScore`, nhưng **không phân biệt** được
`matchedGame` có từng là nạn nhân của 1 dispute đã kết luận
`resolved_seller_fault` hay không — mọi match đều xử lý ngang hàng theo
`severity` (REVIEW/REJECT) tính từ threshold thông thường.

### 2.2 Việc cần làm

**Bước 1 — Liên kết `PlagiarismFlag` → `Dispute`:**
Khi tạo `PlagiarismFlag` (trong `PlagiarismServiceImpl`, luồng chạy lúc
submit game mới), sau khi có `matchedGame`, kiểm tra thêm:
```java
boolean matchedGameHasConfirmedDispute = disputeRepository
        .existsByGameIdAndStatus(matchedGame.getId(), DisputeStatus.resolved_seller_fault);
```
(Cần thêm method `existsByGameIdAndStatus` vào `DisputeRepository` nếu chưa
có — kiểm tra trước khi thêm mới, tránh trùng lặp.)

**Bước 2 — Nâng độ ưu tiên, KHÔNG tự reject:**
Nếu `matchedGameHasConfirmedDispute == true`:
- Ép `severity` lên mức cao nhất hiện có trong `PlagiarismSeverity` (kiểm
  tra enum này có bao nhiêu mức trước khi map — không suy đoán) bất kể
  `similarityScore` đang nằm ở khoảng review hay chưa tới ngưỡng.
- Thêm 1 cờ hiển thị riêng cho admin (field boolean mới trên
  `PlagiarismFlag`, ví dụ `matchedConfirmedDisputeCase`) để UI admin hiển
  thị nổi bật "⚠️ Game này từng bị kết luận đạo nhái trong 1 dispute khác"
  — khác với cảnh báo trùng lặp thông thường, giúp admin ưu tiên xử lý
  nhanh case này trước các plagiarism flag khác.
- **Không tự động set game mới về `rejected`** — vẫn để nguyên luồng AI
  review/admin duyệt hiện có, chỉ đảm bảo case này không bị admin bỏ sót
  giữa nhiều flag khác.

**Bước 3 — Frontend:**
`AdminDisputePanel.tsx`/khu vực hiển thị plagiarism flags trong admin review
(đã biết từ khảo sát trước: gắn trong `AiReviewReportCard.tsx`) — thêm badge
riêng khi `matchedConfirmedDisputeCase == true`.

---

## 3. Khoảng trống #3 — Chỉ cảnh báo buyer SAU KHI dispute có kết luận

### 3.1 Thay đổi so với thiết kế trước

Bản thiết kế trước đề xuất cảnh báo ngay lúc `createDispute()` (dispute còn
`open`, chưa kết luận) — đã bị bác bỏ. Quyết định mới: **chỉ cảnh báo khi
`resolveDispute()` kết luận `resolved_seller_fault`**, tại đúng thời điểm
`autoRefundRecentBuyers()` đã chạy — thực chất **đã có sẵn** thông báo
`PLAGIARISM_ALERT` cho từng buyer trong vòng lặp
([DisputeServiceImpl.java:378-384](../backend/src/main/java/com/godotlaunch/backend/service/impl/DisputeServiceImpl.java#L378-L384)):

```java
notificationService.createAndSendNotification(
        order.getBuyer(), admin, NotificationType.PLAGIARISM_ALERT,
        "Sản phẩm '" + dispute.getGame().getTitle() + "' đã bị gỡ bỏ do vi phạm bản quyền. Số tiền " + price + " VND đã được hoàn lại vào ví của bạn.",
        dispute.getId().toString()
);
```

**Vậy khoảng trống #3 thực chất đã được thu hẹp đáng kể** — chỉ còn thiếu
đúng 1 điều: nội dung thông báo hiện tại nói "đã hoàn tiền", nhưng KHÔNG
kèm khuyến cáo về việc tiếp tục sử dụng/kinh doanh sản phẩm đã tải. Cần bổ
sung câu cảnh báo rõ ràng vào message trên:

```java
"Sản phẩm '" + dispute.getGame().getTitle() + "' đã bị gỡ bỏ do vi phạm bản quyền. " +
"Số tiền " + price + " VND đã được hoàn lại vào ví của bạn. " +
"Lưu ý: bạn không được phép tiếp tục sử dụng sản phẩm này cho mục đích thương mại " +
"(đăng bán lại, tích hợp vào sản phẩm khác để kinh doanh) kể từ thời điểm này."
```

Chỉ áp dụng cho buyer nằm trong `orders` được `autoRefundRecentBuyers()` xử
lý (đã hoàn tiền) — KHÔNG mở rộng ra buyer mua ngoài cửa sổ N ngày (nếu có,
xem giới hạn đã biết ở bản thiết kế trước, chưa đổi ở bản này).

### 3.2 Không cần việc mới nào khác

Không cần thêm `findReleaseRecipients()`/thay đổi `createDispute()` như bản
thiết kế trước đề xuất — quyết định mới đã tự nhiên khớp với code hiện có,
chỉ cần sửa 1 dòng message.

---

## 4. API/DTO cần rà soát khi triển khai

- `ResolveDisputeRequest`
  ([ResolveDisputeRequest.java](../backend/src/main/java/com/godotlaunch/backend/dto/request/ResolveDisputeRequest.java)):
  field `refundAmount` giữ nguyên tên, nhưng cần cập nhật comment cho đúng ý
  nghĩa mới (số bồi thường D, không phải "số tiền A phải hoàn" chung chung
  như comment cũ).
- Cân nhắc thêm 1 endpoint/field response mới để frontend lấy được
  `suggestedAmount` (mục 1.1) TRƯỚC khi admin mở form resolve — ví dụ mở
  rộng `GET /api/v1/disputes/{id}` trả kèm `suggestedRefundAmount`, để
  `AdminDisputePanel.tsx` tự động điền sẵn vào ô nhập, admin sửa tay nếu
  cần rồi mới gửi `resolveDispute`.
- `DisputeResponse` cần thêm field `sellerOutstandingDebt` để frontend hiển
  thị đúng "A còn nợ platform bao nhiêu" (khác với `refundAmount` giờ chỉ
  là số D được bồi thường).

---

## 5. Việc KHÔNG làm trong phạm vi kế hoạch này

- Không đổi cửa sổ N ngày (`withdrawalHoldDays`) giới hạn buyer nào được
  tính vào `autoRefundRecentBuyers()` — giữ nguyên như hiện tại.
- Không cho D rút tiền bồi thường ra ngân hàng (đã chốt ở mục 0.1) — nếu
  sau này đổi ý, đây là thay đổi lớn cần bàn riêng (ảnh hưởng rủi ro tài
  chính thật của platform, không chỉ là sửa code).
- Không tự động reject game B/C khi phát hiện trùng khớp với case dispute
  cũ (đã chốt hướng C — chỉ gắn cờ ưu tiên cho admin, mục 2.2 bước 2).
- Không cảnh báo buyer lúc dispute còn `open` chưa kết luận (đã chốt ở mục
  0.7, đảo ngược thiết kế bản trước).
- Không thiết kế bảng cấu hình multiplier phức tạp trong Platform Settings
  — hằng số hệ số (mục 1.1) hardcode trong service, admin không tự đổi bậc
  thang qua UI ở giai đoạn này, chỉ chỉnh được số cuối cùng khi resolve.
- **Không viết/sửa test.** Bỏ qua hoàn toàn việc cập nhật unit test/
  integration test cho các thay đổi trong kế hoạch này, kể cả khi sửa
  signature của method/DTO khiến test cũ (nếu có, vd `DisputeServiceImplTest`)
  không còn compile — chấp nhận để chúng fail hoặc xoá bỏ nếu không còn
  liên quan, không đầu tư công sức sửa lại cho pass.
