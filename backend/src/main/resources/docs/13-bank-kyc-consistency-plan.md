# Plan: Ẩn nút sửa ngân hàng tự do + validate nhất quán KYC ↔ Ngân hàng

> Đọc `CLAUDE.md` trước khi làm. File này mô tả hiện trạng đã xác minh qua
> đọc code thật (không suy đoán) và các việc cần làm — chưa code gì.

## 1. Hiện trạng đã xác minh (quan trọng — đọc kỹ trước khi code)

### 1.1 Bug: KYC confirm KHÔNG lưu bank info dù form có thu thập

- `frontend/src/components/KycOcrModal.tsx` — form KYC **có** input
  `bankName`/`bankAccount`/`bankAccountHolder` (dòng 16-18, 49-51,
  158-160) và gửi lên trong request `confirm`.
- `backend/.../dto/request/KycConfirmRequest.java` — DTO **có** nhận đủ 3
  field bank.
- `backend/.../controller/KycController.java`, method `confirmKyc()`
  (dòng 116-211): dùng `request.getBankAccount()` **chỉ để check ban**
  (dòng 137-138: `bannedIdentityRepository.existsByBankAccount(...)`) —
  **KHÔNG BAO GIỜ gọi `user.setBankName(...)`/`setBankAccount(...)`/
  `setBankAccountHolder(...)`**. Chỉ set các field `kyc*` (fullName,
  idNumber, address, dob, images).
- **Hệ quả**: bank nhập lúc KYC bị "nuốt mất", không lưu vào DB. Field
  `User.bankName/bankAccount/bankAccountHolder` thực tế được set lần đầu ở
  đâu đó khác (rất có thể chỉ qua con đường ở mục 1.2 dưới đây).

### 1.2 Lỗ hổng: bank info thực sự được ghi qua "cửa sau" không validate gì

- UI: `frontend/src/page/WalletPage.tsx` dòng 1180-1198 — nút **"Chỉnh
  sửa"** (icon bút chì) cạnh khối hiển thị ngân hàng trong form "Yêu cầu
  rút tiền". User bấm vào → mở form sửa tay `bankName`/`bankAccount`/
  `accountHolder` → nút "Lưu thông tin ngân hàng" gọi `handleSaveBankInfo()`
  (dòng 208-241).
- `handleSaveBankInfo()` gọi `userApi.updateProfile()` →
  `PUT /api/v1/users/me` → `UserController.updateCurrentUser()` →
  `UserServiceImpl.updateMyProfile()` (dòng 205-244).
- **`updateMyProfile()` set thẳng 3 field bank vào `User` mà KHÔNG CÓ BẤT
  KỲ VALIDATE NÀO**:
  ```java
  user.setBankName(request.getBankName());
  user.setBankAccount(request.getBankAccount());
  user.setBankAccountHolder(request.getBankAccountHolder());
  ```
  (`backend/.../service/impl/UserServiceImpl.java` dòng 216-218)
  - Không check `bankAccountHolder` khớp `kycFullName` (có dấu vs không
    dấu — cách viết ngân hàng thường là không dấu, viết hoa: "NGUYEN VAN
    A", còn KYC OCR đọc CCCD ra có dấu: "Nguyễn Văn A"; đây chính là điều
    user hỏi kiểm tra).
  - Không check `bankAccount` đã được user khác dùng trong hệ thống chưa
    (`UserRepository` hiện **không có** method `existsByBankAccount...`
    nào cả — xác nhận qua đọc toàn bộ file).
  - Không check trùng `BannedIdentity.bankAccount` (danh tính đã bị cấm) —
    trong khi `KycController.confirmKyc()` CÓ check này (dòng 137-138)
    nhưng `updateMyProfile()` thì không, nên user có thể vòng qua chặn ban
    bằng cách đổi bank trong trang Wallet thay vì qua KYC.

### 1.3 Kết luận phạm vi vấn đề

Đây không chỉ là chuyện "ẩn 1 nút UI" — có 2 lỗi liên quan cần xử lý đồng
bộ:
1. KYC confirm không lưu bank info nó thu thập (bug cần fix để bank thực
   sự đến từ KYC — nguồn đáng tin cậy nhất, có ảnh CCCD kèm theo).
2. `updateMyProfile()`/nút "Chỉnh sửa" ở Wallet là đường vòng không kiểm
   soát, cho phép đổi bank tùy ý sau khi KYC xong, phá vỡ mọi giả định
   "bank đã được xác thực cùng KYC".

## 2. Việc cần làm

### 2.1 Ẩn nút "Chỉnh sửa" ngân hàng trong form rút tiền (yêu cầu gốc)

**File**: `frontend/src/page/WalletPage.tsx`

- Ẩn/xóa nút "Chỉnh sửa" (dòng 1186-1198, icon `Pencil` + text
  `wallet:form.editBankInfo`) và toàn bộ nhánh JSX cho phép sửa tay
  (`isEditingBankInfo` block, dòng ~1216 trở đi, bao gồm nút "Lưu thông
  tin ngân hàng"/"Hủy").
- Lý do: một khi mục 2.2 dưới đây fix xong, bank info phải đến từ đúng 1
  nguồn duy nhất là KYC (đã xác thực bằng ảnh CCCD + OCR), không nên có
  đường sửa tay tự do nữa ở trang Wallet.
- **Cân nhắc**: nếu vẫn cần cho phép user sửa bank sau này (ví dụ đổi số
  tài khoản ngân hàng hợp lệ), nên làm qua 1 luồng riêng có validate đầy
  đủ (giống mục 2.2), không phải field tự do trong `updateMyProfile()`.
  Phạm vi lần này chỉ ẩn, không thiết kế luồng thay thế.
- Dọn theo sau: `handleSaveBankInfo()`, state `isEditingBankInfo`,
  `isSavingBankInfo`, và các key i18n không còn dùng
  (`form.editBankInfo`, `form.editBankInfoTitle`, `form.cancelEditBankInfo`,
  `form.saveBankInfo`, `form.savingBankInfo`, `messages.bankInfoUpdated`,
  `messages.updateBankInfoFailed`) trong `frontend/src/locales/{vi,en,ja}/wallet.json`
  — xóa nếu xác nhận không còn nơi nào khác dùng.

### 2.2 Fix bug: `confirmKyc()` phải thực sự lưu bank info + validate

**File**: `backend/src/main/java/com/godotlaunch/backend/controller/KycController.java`,
method `confirmKyc()` (dòng 116-211)

Thêm ngay sau đoạn set `user.setKycAddress(...)` (dòng 187), TRƯỚC
`user.setKycVerified(true)` (dòng 193):

1. **Validate bank info bắt buộc** (KYC là lúc duy nhất được phép set
   bank — nên bắt buộc nhập đủ, không để trống):
   ```java
   if (!StringUtils.hasText(request.getBankName())
           || !StringUtils.hasText(request.getBankAccount())
           || !StringUtils.hasText(request.getBankAccountHolder())) {
       throw new AppException(ErrorCode.BANK_INFO_REQUIRED); // thêm ErrorCode mới
   }
   ```

2. **Validate tên chủ tài khoản khớp tên KYC** (xử lý đúng bài toán "bank
   không dấu, KYC có dấu" user nêu — so sánh sau khi CHUẨN HÓA cả 2 chuỗi
   về dạng không dấu, viết hoa, bỏ khoảng trắng thừa):
   ```java
   String normalizedKycName = normalizeNameForCompare(request.getFullName());
   String normalizedBankHolder = normalizeNameForCompare(request.getBankAccountHolder());
   if (!normalizedKycName.equals(normalizedBankHolder)) {
       throw new AppException(ErrorCode.BANK_NAME_MISMATCH); // thêm ErrorCode mới
   }
   ```
   Hàm `normalizeNameForCompare(String)` — tái dùng đúng pattern
   `normalizeBankName()` đã có sẵn trong
   `WithdrawalRequestServiceImpl.java` dòng 635-639 (copy logic, đặt ở
   `KycController` hoặc tách ra 1 util class dùng chung nếu 2 nơi cùng
   cần):
   ```java
   private String normalizeNameForCompare(String name) {
       String normalized = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD)
               .replaceAll("\\p{M}", "");
       return normalized.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
   }
   ```
   Ví dụ: KYC OCR ra "Nguyễn Văn Cường" → normalize thành "NGUYENVANCUONG";
   bank nhập "NGUYEN VAN CUONG" → cũng ra "NGUYENVANCUONG" → khớp. Nếu
   user nhập sai tên (ví dụ nhập tên người khác) → chặn.

3. **Validate số tài khoản ngân hàng chưa trùng ai khác trong hệ thống**
   (thêm method mới vào `UserRepository` — hiện repository này KHÔNG có
   method nào tương tự, xác nhận qua đọc toàn file):
   ```java
   // UserRepository.java — thêm mới
   boolean existsByBankAccountAndIdNot(String bankAccount, UUID id);
   ```
   Gọi trong `confirmKyc()`, đặt cạnh check `existsByKycIdNumberAndIdNot`
   đã có (dòng 146):
   ```java
   if (userRepository.existsByBankAccountAndIdNot(request.getBankAccount().trim(), user.getId())) {
       throw new AppException(ErrorCode.BANK_ACCOUNT_DUPLICATE); // thêm ErrorCode mới
   }
   ```
   Cân nhắc: có nên chuẩn hóa `bankAccount` trước khi so sánh (trim,
   loại khoảng trắng giữa các số) hay so sánh nguyên văn — khuyến nghị
   `trim()` tối thiểu, để nguyên số vì đây là số tài khoản (không nên
   "làm sạch" quá tay gây sai lệch số thật).

4. **Check trùng với `BannedIdentity.bankAccount` đã có sẵn** (dòng
   137-138) — giữ nguyên, không đổi, chỉ đảm bảo thứ tự chạy TRƯỚC 2 check
   mới ở trên (ban check nên chặn sớm nhất, đúng như code hiện tại đã làm
   đúng).

5. **Cuối cùng, thực sự lưu bank info** (hiện đang thiếu — đây là fix cốt
   lõi của bug mục 1.1):
   ```java
   user.setBankName(request.getBankName().trim());
   user.setBankAccount(request.getBankAccount().trim());
   user.setBankAccountHolder(request.getBankAccountHolder().trim());
   ```

**Thêm `ErrorCode` mới** (`backend/.../constant/ErrorCode.java`, đặt cạnh
nhóm lỗi KYC hiện có — `KYC_ID_NUMBER_DUPLICATE`, `KYC_IMAGE_DUPLICATE`):
```java
BANK_INFO_REQUIRED(HttpStatus.BAD_REQUEST, "Vui lòng nhập đầy đủ thông tin ngân hàng."),
BANK_NAME_MISMATCH(HttpStatus.BAD_REQUEST, "Tên chủ tài khoản ngân hàng phải khớp với tên trên giấy tờ tùy thân."),
BANK_ACCOUNT_DUPLICATE(HttpStatus.CONFLICT, "Số tài khoản ngân hàng này đã được sử dụng bởi một tài khoản khác trong hệ thống."),
```

### 2.3 Khóa `updateMyProfile()` không cho sửa bank tự do nữa

**File**: `backend/src/main/java/com/godotlaunch/backend/service/impl/UserServiceImpl.java`,
method `updateMyProfile()` (dòng 205-244)

Sau khi mục 2.1 đã ẩn UI và mục 2.2 đã là nguồn set bank duy nhất, nên
**xóa hẳn 3 dòng set bank khỏi `updateMyProfile()`**:
```java
user.setBankName(request.getBankName());       // XÓA
user.setBankAccount(request.getBankAccount()); // XÓA
user.setBankAccountHolder(request.getBankAccountHolder()); // XÓA
```
Lý do: nếu chỉ ẩn UI mà không khóa backend, endpoint `PUT /api/v1/users/me`
vẫn nhận và ghi đè bank info không validate qua Postman/DevTools trực
tiếp — ẩn UI không phải là bảo mật thật.

Cân nhắc thêm: `UpdateProfileRequest.java` có nên xóa hẳn 3 field
`bankName/bankAccount/bankAccountHolder` khỏi DTO luôn không (tránh gây
hiểu nhầm về sau) — nếu xóa, cần đồng bộ xóa các nơi frontend còn build
request kèm field này (`WalletPage.tsx` sau khi ẩn nút chỉnh sửa sẽ không
còn gọi `updateProfile` kèm bank nữa, cần rà lại toàn bộ call site của
`userApi.updateProfile` xem còn chỗ nào khác gửi kèm bank không).

## 3. Việc CẦN NGƯỜI KHÁC QUYẾT ĐỊNH trước khi code (chưa tự ý làm)

- **Nếu user KYC xong rồi mới phát hiện nhập sai/đổi ngân hàng thật (ví
  dụ đổi ngân hàng, mất thẻ cũ) thì họ sửa bank bằng cách nào?** Hiện tại
  sau khi bỏ nút "Chỉnh sửa" + khóa `updateMyProfile()`, sẽ KHÔNG CÒN
  cách nào để user tự sửa bank nữa (vì `KycConfirmRequest`/`confirmKyc()`
  đã có "Chỉ thực hiện được 1 lần" theo mô tả Swagger dòng 120: `"Chỉ
  thực hiện được 1 lần"`, và code dòng 129-131 xác nhận: nếu
  `user.isKycVerified()` đã true thì trả về ngay, không cho verify lại).
  → Cần quyết định: có API admin riêng để đổi bank cho user (có audit
  log), hay chấp nhận user phải liên hệ hỗ trợ thủ công.
- **Đã có user thật trong DB set bank qua nút "Chỉnh sửa" cũ (trước khi
  patch) mà bank đó KHÔNG khớp KYC hoặc bị trùng người khác chưa?** Nên
  chạy 1 query kiểm tra dữ liệu hiện có trước khi deploy fix, để biết có
  cần data-migration/thông báo user nào phải KYC lại không.

## 4. Verification (sau khi code xong)

1. Backend compile: `mvn -q compile`.
2. Test confirm KYC với `bankAccountHolder` không khớp `fullName` (kể cả
   khi 1 bên có dấu, 1 bên không dấu, khác hoa/thường) → phải nhận lỗi
   `BANK_NAME_MISMATCH`.
3. Test confirm KYC với `bankAccount` đã tồn tại ở user khác → phải nhận
   lỗi `BANK_ACCOUNT_DUPLICATE`.
4. Test confirm KYC hợp lệ → xác nhận `users.bank_name/bank_account/
   bank_account_holder` thực sự được lưu trong DB (trước đây bị bỏ qua).
5. Gọi thẳng `PUT /api/v1/users/me` kèm `bankAccount` khác (qua Postman) →
   xác nhận field bank trong DB KHÔNG đổi (do đã xóa khỏi
   `updateMyProfile()`).
6. UI: xác nhận nút "Chỉnh sửa" không còn hiện trong trang Wallet.
7. `npx tsc --noEmit` sau khi sửa `WalletPage.tsx`.
