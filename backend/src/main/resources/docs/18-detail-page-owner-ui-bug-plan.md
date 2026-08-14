# 18. Fix: Trang chi tiết game không hiện đúng UI "Chủ sở hữu"

> Bug: developer đăng bán game/asset của chính mình, khi vào trang chi tiết
> (DetailPage) sản phẩm đó vẫn thấy giao diện y hệt người chưa từng mua (nút
> "Buy Now"/giá tiền vẫn hiện, chỉ bị làm mờ) — dù ở Marketplace/Trang chủ,
> card của đúng sản phẩm đó đã hiện badge "OWNER" chính xác.

---

## 1. Đã xác nhận qua code (không suy đoán)

### 1.1 Nơi UI hiển thị ĐÚNG (không cần sửa)

- **`MarketplacePage.tsx`** (dòng 950-957, 1015-1026): nhận `creatorOwnedProductIds: Set<string>` từ props (nguồn tính ở `App.tsx`), render 3 nhánh rõ ràng theo đúng thứ tự ưu tiên:
  ```
  creatorOwnedProductIds.has(id) → badge "OWNER" (xanh dương)
  ownedProductIds.has(id)        → badge "OWNED" (xanh lá)
  còn lại                        → nút "Add to Cart"
  ```
- **`HomePage.tsx`** (dòng 169-173): cũng nhận `creatorOwnedProductIds` từ cùng props, hiện badge "OWNER" đúng y hệt.
- **Nguồn tính `creatorOwnedProductIds`** — `App.tsx:461-472`:
  ```ts
  const creatorOwnedProductIds = useMemo(() => {
    const currentEmail = currentUser?.email?.trim().toLowerCase();
    if (!currentEmail) return new Set<string>();
    return new Set(
      assets
        .filter((asset) => asset.sellerEmail?.trim().toLowerCase() === currentEmail)
        .map((asset) => asset.id),
    );
  }, [assets, currentUser?.email]);
  ```
  Tính 1 lần ở tầng cha, truyền xuống mọi trang con qua props — đây là nguồn "chân lý" duy nhất cho khái niệm "là chủ sở hữu sản phẩm này".

### 1.2 Nơi UI SAI — `DetailPage.tsx`

- **Không nhận `creatorOwnedProductIds` từ props.** Interface `DetailPageProps` (dòng 10-33) hoàn toàn không khai báo field này.
- Thay vào đó, tự tính lại cục bộ (dòng 70-77):
  ```ts
  const isOwned = ownedProductIds.has(focusedAsset.id);
  const currentUserEmail = currentUser?.email?.trim().toLowerCase();
  const isCreatorOwnedAsset = (asset: Asset) =>
    Boolean(
      currentUserEmail &&
        asset.sellerEmail?.trim().toLowerCase() === currentUserEmail,
    );
  const isCreatorOwner = isCreatorOwnedAsset(focusedAsset);
  ```
  Về mặt **giá trị boolean, logic này tính ĐÚNG** (giống hệt công thức ở `App.tsx`) — `isCreatorOwner` vẫn trả về `true` khi đúng là chủ sở hữu. Vấn đề không nằm ở chỗ tính sai giá trị.
- **Vấn đề thật nằm ở cách RENDER dùng giá trị đó** — khu vực "Purchase Configuration Card" (dòng 452-489):
  ```tsx
  {isOwned ? (
    // Nhánh 1: đã MUA — hiện "You already own this" + nút Download
    ...
  ) : (
    // Nhánh 2 (else) — DUY NHẤT, dùng cho MỌI trường hợp còn lại
    <>
      <button
        onClick={() => handleBuyNow(focusedAsset)}
        disabled={isPreparingBuyNow || isCreatorOwner}   // ← chỉ disable, không đổi UI
        ...
      >
        {isPreparingBuyNow
          ? t("detail.actions.preparingPayment")
          : focusedAsset.price === 0
            ? t("detail.pricing.freeDownload")
            : t("detail.actions.buyNowBankTransfer")}   // ← vẫn hiện text "Buy Now"/giá
      </button>
      <button
        onClick={() => handleAddToCart(focusedAsset)}
        disabled={isCreatorOwner}
        ...
      >
        {isCreatorOwner
          ? t("detail.actions.owner")   // ← chỉ nút PHỤ (Add to Cart) đổi text đúng
          : t("detail.actions.addToCart")}
      </button>
    </>
  )}
  ```
  Chỉ có **JSX rẽ nhánh 2 tầng** (`isOwned` true/false) — không có tầng thứ 3 cho `isCreatorOwner`. Khi chủ sở hữu vào xem chính sản phẩm của mình: `isOwned = false` (họ chưa từng "mua" — không có `Payment` nào), nên rơi thẳng vào nhánh `else`, hiện **nút "Buy Now" kèm giá tiền thật**, chỉ bị mờ đi (`opacity-40`) qua `disabled` — đúng như bạn mô tả "giao diện như người chưa từng mua game". Nút phụ "Add to Cart" có đổi text thành "Owner" nhưng đây là nút phụ, không phải điểm nhìn chính (nút chính "Buy Now" mới là thứ đập vào mắt trước, hàng trên cùng, màu vàng nổi bật).
- **Giá tiền vẫn hiển thị công khai phía trên** (dòng 444-449) trong mọi trường hợp, kể cả khi là chủ sở hữu — không sai về nghiệp vụ (giá vẫn cần hiện cho người khác xem), nhưng góp phần củng cố cảm giác "trang này đang chào mời tôi mua" khi chính là chủ sở hữu.

### 1.3 Vì sao Marketplace/HomePage đúng còn DetailPage sai

Không phải do khác nghiệp vụ — hoàn toàn do khác **cách triển khai UI cho cùng 1 giá trị boolean**: 2 trang kia coi `creatorOwnedProductIds.has(id)` là **nhánh hiển thị độc lập, ngang hàng** với "đã mua" và "chưa mua"; còn `DetailPage.tsx` coi nó chỉ là **1 flag phụ để `disabled` nút**, không tạo nhánh UI riêng. Đây là lỗi thiết kế JSX cụ thể tại 1 file, có thể sửa gọn mà không đụng logic tính toán nào khác (logic tính `isCreatorOwner` đã đúng, giữ nguyên).

---

## 2. Kế hoạch sửa

### 2.1 Nguyên tắc

Đưa `DetailPage.tsx` về đúng pattern 3-nhánh đã dùng nhất quán ở `MarketplacePage.tsx`/`HomePage.tsx`, theo đúng thứ tự ưu tiên:

```
isCreatorOwner  → UI "Bạn là chủ sở hữu sản phẩm này" (ưu tiên cao nhất)
isOwned         → UI "Đã sở hữu" + nút Download (giữ nguyên, không đổi)
còn lại         → UI "Buy Now" / "Add to Cart" (giữ nguyên, không đổi)
```

`isCreatorOwner` đặt lên **trước** `isOwned` vì về lý thuyết 1 chủ sở hữu không
thể đồng thời có `Payment` PAID cho chính sản phẩm của họ (backend đã chặn tự
mua sản phẩm của mình ở luồng checkout — xem
`docs/11-payout-flow.md`/`OrderServiceImpl` nếu cần đối chiếu thêm), nhưng vẫn
nên ưu tiên rõ ràng ở tầng UI để không phụ thuộc giả định đó mãi mãi đúng.

### 2.2 Thay đổi cụ thể tại `frontend/src/page/DetailPage.tsx`

**Không đổi** cách tính `isOwned`/`isCreatorOwner` (dòng 70-77) — giữ nguyên,
vì giá trị đã đúng.

**Sửa khu vực JSX dòng 452-489** — thêm hẳn 1 nhánh mới lên đầu:

```tsx
<div className="space-y-2.5 pt-2">
  {isCreatorOwner ? (
    <div className="w-full py-2.5 px-4 bg-sky-500/10 border border-sky-500/20 rounded-md text-xs font-bold text-sky-500 font-display text-center">
      {t("detail.pricing.ownerMessage")}
    </div>
  ) : isOwned ? (
    // Giữ nguyên nhánh hiện có (đã sở hữu — mờ, đã mua)
    ...
  ) : (
    // Giữ nguyên nhánh hiện có (Buy Now / Add to Cart)
    // Có thể bỏ luôn disabled={isCreatorOwner} ở 2 nút trong nhánh này
    // vì giờ isCreatorOwner đã có nhánh riêng, không bao giờ lọt xuống đây
    // nữa — dọn dẹp code chết, không bắt buộc.
    ...
  )}
</div>
```

Key i18n mới cần thêm (3 ngôn ngữ `vi`/`en`/`ja`, file
`frontend/src/locales/{locale}/marketplace.json`, namespace đang dùng ở trang
này là `marketplace` theo `useTranslation(["marketplace"])` dòng 69):
- `detail.pricing.ownerMessage` — ví dụ tiếng Việt: "Đây là sản phẩm của bạn"

### 2.3 Có cần đổi sang nhận `creatorOwnedProductIds` từ props thay vì tự tính không?

**Không bắt buộc phải đổi ngay trong phạm vi fix bug này** — công thức tính
cục bộ trong `DetailPage.tsx` (so `sellerEmail` với `currentUser.email`) cho
ra đúng kết quả giống hệt `creatorOwnedProductIds` ở `App.tsx`, chỉ khác là
tính lại cho riêng `focusedAsset` thay vì cho cả danh sách `assets`. Sửa UI
theo mục 2.2 là đủ để hết bug.

Tuy nhiên **nên cân nhắc dọn dẹp sau** (không phải bug, chỉ là kỹ thuật):
truyền `creatorOwnedProductIds` xuống `DetailPageProps` giống 2 trang kia,
dùng `creatorOwnedProductIds.has(focusedAsset.id)` thay cho hàm cục bộ
`isCreatorOwnedAsset` — để có **đúng 1 nguồn tính "chủ sở hữu"** trong toàn
app, tránh 2 công thức riêng biệt cùng tồn tại có thể lệch nhau sau này nếu
ai đó sửa 1 chỗ mà quên chỗ kia (ví dụ nếu sau này đổi từ so email sang so
`sellerId`/`userId` để an toàn hơn — email có thể đổi, id thì không). Việc
này để **tùy chọn**, không phải điều kiện để coi bug đã fix xong.

### 2.4 Khu vực khác trong `DetailPage.tsx` cần rà thêm (đã kiểm tra)

Đã grep toàn file `DetailPage.tsx` xác nhận `isOwned`/`isCreatorOwner` chỉ
xuất hiện đúng 1 cụm ở khu vực "Purchase Configuration Card" (dòng 452-489) —
không có sticky bottom bar hay vị trí nào khác lặp lại nút mua trong file
này, nên **không có vị trí thứ 2 nào cần sửa** trong cùng trang.

---

## 3. Việc KHÔNG làm trong phạm vi kế hoạch này

- Không đổi cách backend trả `sellerEmail`/`ownedProductIds` — dữ liệu nguồn
  đã đúng, bug thuần túy ở tầng render frontend.
- Không đổi hành vi 2 nhánh UI hiện có (`isOwned` true, và nhánh mua/thêm giỏ
  hàng mặc định) — chỉ thêm 1 nhánh mới lên trước, không sửa nội dung 2 nhánh
  cũ.
- Không bắt buộc refactor `DetailPage.tsx` sang nhận `creatorOwnedProductIds`
  từ props ngay trong lần sửa này (xem mục 2.3) — để dành làm sau nếu cần,
  không phải điều kiện đóng bug.
- **Không viết/sửa test.** Đây là bug UI thuần túy phía frontend
  (React/TSX), không có test tự động nào bao phủ khu vực này theo khảo sát —
  giữ nguyên, không thêm test mới, để tiết kiệm quota theo đúng yêu cầu đã
  áp dụng cho các kế hoạch trước.
