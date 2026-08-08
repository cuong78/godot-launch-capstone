# Plan: Đa ngôn ngữ (i18n) cho Category / Tag / Banner

> Đọc `CLAUDE.md` trước khi làm. File này mô tả hiện trạng đã xác minh qua
> đọc code thật (không suy đoán), so sánh 2 phương án kiến trúc, và chọn 1
> phương án khuyến nghị — chưa code gì.

## 1. Hiện trạng đã xác minh (quan trọng — đọc kỹ trước khi code)

### 1.1 Đúng như nghi ngờ: category "chạy i18n" nhưng là hardcode, không lấy tên từ DB

- `backend/.../entity/Category.java`, `Tag.java`, `Banner.java` — cả 3
  entity đều **flat, đơn ngôn ngữ**: chỉ có 1 cột `name`
  (`title`/`description` với Banner), không có cột nào phân biệt ngôn ngữ.
  Xác nhận qua đọc trực tiếp cả 3 file — không suy đoán.
- Migration hiện có: `V1__init_schema.sql` (schema gốc) +
  `V5__refactor_categories_and_tags.sql` (data thật đang seed — **45
  category + 218 tag**, đơn ngôn ngữ tiếng Anh) + `V3__banners.sql` (1
  banner mẫu, xem `docs/13-bank-kyc-consistency-plan.md`... — không liên
  quan, banner ở đây là UI banner trang chủ).
- `frontend/src/page/MarketplacePage.tsx` dòng 51-129: có 1 hằng số
  `CATEGORY_LABEL_KEYS` — bản đồ **cứng** từ `slug`/`name` (tiếng Anh)
  sang key i18n (`filters.categories.action`, `.adventure`, ...). Hàm
  `getCategoryLabel()` (dòng 324-391) tra map này trước, rồi thử đoán theo
  từ khóa (`.includes("audio")`, `.includes("3d")`...), **chỉ khi mọi
  cách trên thất bại mới trả về `rawName`** (tên thật từ DB, dòng 388).
- `frontend/src/locales/{vi,en,ja}/marketplace.json` có 49 key
  `filters.categories.*` — đây chính là "bản dịch cứng" đang chạy được
  i18n vì nó là văn bản UI thuần túy (giống mọi text khác trong app), **độc
  lập hoàn toàn với dữ liệu category thật trong DB**. Category mới thêm
  qua Admin Panel sẽ KHÔNG có trong map này → tự động rơi về `rawName`
  (tiếng Anh, không dịch).
- **Hệ quả cụ thể user quan sát được đúng như hình chụp**: đổi ngôn ngữ ở
  trang Marketplace → tên category đổi theo (vì tra map cứng). Nhưng:
  1. Trang `/upload` (`UploadPage.tsx` dòng 888-892) hiển thị thẳng
     `{cat.name}` — **không đi qua** `getCategoryLabel()`/map cứng nào —
     luôn hiện tiếng Anh gốc trong DB bất kể ngôn ngữ đang chọn. Đây là
     điểm KHÔNG NHẤT QUÁN giữa 2 trang mà lẽ ra phải hiển thị cùng 1 tập
     category.
  2. Category do admin tạo mới qua `AdminContentManagementPanel` (CRUD
     `CategoryRequest` — chỉ có `name/slug/description/parentId/type`,
     không có field ngôn ngữ) sẽ không bao giờ vào được map cứng
     `CATEGORY_LABEL_KEYS` — không ai cập nhật map đó khi tạo category
     mới qua UI.
- `Tag` không có cơ chế dịch tương tự map cứng nào cả (kiểm tra xác nhận
  — không tìm thấy `TAG_LABEL_KEYS` hay tương đương) → tag luôn hiện
  nguyên `name` gốc DB ở mọi nơi, mọi ngôn ngữ.
- `Banner` (banner trang chủ) — `title`/`description` hoàn toàn hardcode
  1 ngôn ngữ trong DB, hiển thị y nguyên trên HomePage, không qua bất kỳ
  lớp dịch nào.

### 1.2 Kết luận

Đây không phải lỗi hiển thị đơn lẻ — là **thiếu hẳn 1 tầng kiến trúc**:
category/tag/banner được thiết kế ban đầu là dữ liệu đơn ngôn ngữ, còn
việc "trông có vẻ đa ngôn ngữ" ở Marketplace chỉ là 1 lớp vá tạm bằng bản
đồ tĩnh phía frontend, không mở rộng được và không nhất quán giữa các
trang.

## 2. Hai phương án kiến trúc

### Phương án A — Bảng `translations` dùng chung (generic/polymorphic)

Thêm 1 bảng duy nhất, tham chiếu tới bất kỳ entity nào cần dịch qua cặp
`(entity_type, entity_id, field_name)`:

```sql
CREATE TABLE public.translations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type varchar(30) NOT NULL,   -- 'category' | 'tag' | 'banner'
    entity_id uuid NOT NULL,
    field_name varchar(30) NOT NULL,    -- 'name' | 'description' | 'title'
    locale varchar(5) NOT NULL,         -- 'vi' | 'en' | 'ja'
    value text NOT NULL,
    UNIQUE (entity_type, entity_id, field_name, locale)
);
CREATE INDEX idx_translations_lookup ON public.translations (entity_type, entity_id, locale);
```

**Ưu điểm:**
- 1 bảng duy nhất phục vụ mọi entity cần dịch hiện tại VÀ tương lai
  (category, tag, banner, và bất kỳ entity mới nào sau này — ví dụ
  `AnnouncementBanner`, `ContentCollection` title...) mà không cần thêm
  migration mỗi lần.
- Admin UI có thể xây 1 component "Translation Editor" dùng chung cho mọi
  loại entity, không cần viết riêng cho từng bảng.
- Không phải `ALTER TABLE` các bảng hiện có — an toàn với dữ liệu cũ.

**Nhược điểm:**
- Không có foreign key thật tới `categories`/`tags`/`banners` (vì
  `entity_id` dùng chung cho nhiều bảng khác nhau) → mất khả năng
  `ON DELETE CASCADE` tự nhiên, phải tự dọn translation mồ côi bằng code
  (hoặc trigger) khi xóa category/tag/banner.
  hoặc trigger).
- Query lấy tên đã dịch luôn cần JOIN thêm + filter theo `entity_type`,
  phức tạp hơn so với JOIN thẳng 1 bảng con.
- Validate ở tầng DB yếu hơn (không ràng buộc được locale hợp lệ theo
  schema, dễ có dữ liệu rác nếu code có bug).

### Phương án B — Thêm cột riêng theo locale trên từng bảng (denormalized columns)

Thêm thẳng cột `name_vi`, `name_en`, `name_ja` (và `description_vi/en/ja`
nếu cần) vào `categories`, `tags`, `banners`:

```sql
ALTER TABLE public.categories
  ADD COLUMN name_vi varchar(100),
  ADD COLUMN name_en varchar(100),
  ADD COLUMN name_ja varchar(100);
-- cột `name` gốc giữ lại làm fallback/slug-gốc, không xóa

ALTER TABLE public.tags
  ADD COLUMN name_vi varchar(100),
  ADD COLUMN name_en varchar(100),
  ADD COLUMN name_ja varchar(100);

ALTER TABLE public.banners
  ADD COLUMN title_vi varchar(200), ADD COLUMN title_en varchar(200), ADD COLUMN title_ja varchar(200),
  ADD COLUMN description_vi varchar(1000), ADD COLUMN description_en varchar(1000), ADD COLUMN description_ja varchar(1000);
```

**Ưu điểm:**
- Query đơn giản nhất có thể: `SELECT name_vi FROM categories`, không cần
  JOIN gì thêm — hiệu năng tốt nhất, code service/repository gần như
  không đổi cấu trúc.
- Giữ nguyên toàn vẹn quan hệ (FK, cascade) hiện có trên 3 bảng — an toàn
  tuyệt đối, không có bảng phụ nào có thể "mồ côi".
- Validate NOT NULL/độ dài theo từng ngôn ngữ dễ dàng ở tầng DB nếu muốn.

**Nhược điểm:**
- Thêm ngôn ngữ mới (ví dụ tiếng Hàn) sau này = phải `ALTER TABLE` cả 3
  bảng lần nữa (migration mới) — không mở rộng "không cần đổi schema" như
  phương án A.
- Lặp lại pattern 3 cột (`_vi/_en/_ja`) ở mọi bảng cần dịch trong tương
  lai (nếu sau này `ContentCollection`, `HomepageSection`... cũng cần
  dịch) — không tái dùng code/schema.
- Bảng "phình" cột nếu số ngôn ngữ tăng nhiều.

### 2.3 Khuyến nghị: **Phương án B**

Lý do chọn B thay vì A cho dự án này:
- Dự án hiện tại **cố định 3 ngôn ngữ** (`vi/en/ja` — xác nhận qua
  `LanguagePreferenceResponse` type: `"vi" | "en" | "ja"` là union type
  cứng ở nhiều nơi trong codebase, không phải danh sách động) — nhược
  điểm lớn nhất của B (khó mở rộng ngôn ngữ) không phải rủi ro thực tế
  gần hạn.
- Phạm vi cần dịch chỉ 3 bảng (category, tag, banner), không có dấu hiệu
  sắp mở rộng sang nhiều loại entity khác — lợi thế "dùng chung 1 bảng"
  của A không tận dụng được nhiều.
- B giữ nguyên toàn bộ FK/cascade hiện có, rủi ro kỹ thuật thấp hơn hẳn A
  trong 1 dự án đã có 45 category + 218 tag dữ liệu thật cần migrate.
- Hiệu năng đọc tốt hơn — category/tag được query rất thường xuyên
  (marketplace filter, upload dropdown, mọi trang list game/asset).

## 3. Kế hoạch triển khai (Phương án B)

### 3.1 Migration

**File mới**: `backend/src/main/resources/db/migration/V15__add_i18n_columns.sql`
(số thứ tự tiếp theo sau `V14` đã dùng ở phần withdrawal scheduler —
XÁC NHẬN LẠI số đúng tại thời điểm code, vì có thể có migration mới hơn
đã được thêm).

```sql
ALTER TABLE public.categories
  ADD COLUMN name_vi varchar(100),
  ADD COLUMN name_en varchar(100),
  ADD COLUMN name_ja varchar(100),
  ADD COLUMN description_vi text,
  ADD COLUMN description_en text,
  ADD COLUMN description_ja text;

ALTER TABLE public.tags
  ADD COLUMN name_vi varchar(100),
  ADD COLUMN name_en varchar(100),
  ADD COLUMN name_ja varchar(100);

ALTER TABLE public.banners
  ADD COLUMN title_vi varchar(200),
  ADD COLUMN title_en varchar(200),
  ADD COLUMN title_ja varchar(200),
  ADD COLUMN description_vi varchar(1000),
  ADD COLUMN description_en varchar(1000),
  ADD COLUMN description_ja varchar(1000);
```
Cột nullable (không phá dữ liệu cũ) — cột `name`/`title`/`description`
gốc giữ nguyên làm **fallback bắt buộc khi 1 locale nào đó chưa dịch**
(ví dụ category mới tạo chỉ nhập `name`, chưa kịp dịch `name_ja` → hiển
thị `name` gốc thay vì để trống).

**File seed data dịch** (đổ dữ liệu cho 45 category + 218 tag hiện có +
banner): `backend/src/main/resources/db/migration/V16__seed_i18n_data.sql`
— cần dịch thủ công/AI-assisted toàn bộ 45+218 tên hiện có sang `vi`/`ja`
(hiện đã có sẵn bản dịch tiếng Việt cho phần lớn category/tag ở
`frontend/src/locales/vi/marketplace.json` — TÁI DÙNG lại các bản dịch đó
làm nguồn cho cột `name_vi`, tiết kiệm công dịch lại từ đầu). Tiếng Nhật
(`name_ja`) hiện chưa có bản dịch category ở đâu trong repo — cần dịch
mới hoàn toàn.

### 3.2 Backend: entity + DTO + service

**`Category.java`, `Tag.java`, `Banner.java`**: thêm các field mới tương
ứng (`nameVi/nameEn/nameJa`, v.v.), theo đúng pattern field hiện có.

**DTO response** (`CategoryResponse`, `TagResponse`, `BannerResponse`):
thêm field `name`/`title`/`description` **đã resolve theo locale hiện tại
của request** — không trả về cả 3 cột thô cho client tự chọn (tránh phải
sửa toàn bộ nơi tiêu thụ response ở frontend). Cách resolve locale:
- Tái dùng cơ chế đang có cho `preferredLanguage`/`Accept-Language` nếu
  đã tồn tại (kiểm tra `LocaleConfig.java`, `User.preferredLanguage` —
  cần đọc lại code thật lúc bắt tay code để xác nhận cách lấy locale hiện
  tại của request, tránh làm trùng 1 cơ chế khác đã có).
- Hàm resolve dùng chung, ví dụ trong 1 util:
  ```java
  public static String resolveByLocale(String locale, String vi, String en, String ja, String fallback) {
      String value = switch (locale) {
          case "vi" -> vi;
          case "ja" -> ja;
          default -> en;
      };
      return (value != null && !value.isBlank()) ? value : fallback;
  }
  ```

**DTO request** (`CategoryRequest`, `TagRequest`, `CreateBannerRequest`/
`UpdateBannerRequest`): thêm field nhập theo từng ngôn ngữ
(`nameVi/nameEn/nameJa`), giữ `name` gốc là bắt buộc (`@NotBlank` như
hiện tại), 2 field còn lại optional.

**Admin UI** (`AdminContentManagementPanel.tsx` cho category/tag,
`AdminBannerPanel.tsx` cho banner): thêm 3 ô nhập tên theo từng ngôn ngữ
khi tạo/sửa category, tag, banner — thay vì chỉ 1 ô `name` như hiện tại.

### 3.3 Frontend: xóa map cứng, dùng thẳng response đã dịch

- `frontend/src/page/MarketplacePage.tsx`: **xóa hẳn**
  `CATEGORY_LABEL_KEYS` (dòng 51-129) và toàn bộ logic đoán từ khóa trong
  `getCategoryLabel()` (dòng 324-391) — thay bằng dùng thẳng
  `category.name` trả về từ backend (đã resolve đúng locale theo request
  header/preferredLanguage). Xóa 49 key `filters.categories.*` khỏi
  `frontend/src/locales/{vi,en,ja}/marketplace.json` (không còn dùng —
  bản dịch giờ nằm trong DB, không nằm trong file JSON tĩnh của app nữa).
- `frontend/src/page/UploadPage.tsx` dòng 888-892: giữ nguyên
  `{cat.name}` — nhưng giờ `cat.name` tự động đúng locale vì backend đã
  resolve, không cần sửa gì thêm ở đây. Đây chính là điểm khiến 2 trang
  TỰ NHIÊN nhất quán với nhau sau khi sửa xong (không cần đồng bộ 2 map
  riêng biệt nữa vì chỉ còn 1 nguồn sự thật duy nhất: backend).
- Cần đảm bảo mọi request tới API category/tag/banner gửi kèm thông tin
  locale hiện tại (qua header, hoặc BE tự đọc `Accept-Language`/JWT
  `preferredLanguage` claim nếu đã có sẵn — đọc lại code thật lúc triển
  khai để không làm trùng cơ chế).

## 4. Việc CẦN NGƯỜI KHÁC QUYẾT ĐỊNH trước khi code

- **Locale ưu tiên khi resolve**: dùng `Accept-Language` header của mỗi
  request, hay dùng `User.preferredLanguage` đã lưu trong DB (chỉ áp
  dụng được cho user đã đăng nhập), hay 1 query param riêng client tự gửi
  kèm? Cần chốt 1 cơ chế nhất quán — ảnh hưởng cả API công khai (trang
  Marketplace không cần đăng nhập) lẫn API cần auth.
- **Server có cache category/tag/banner response không** (ví dụ Redis
  cache cho homepage — có nhắc tới `homepage:v2` cache key trong
  `run_all_seeds.ps1`)? Nếu có, response cache cần tách theo locale
  (cache key phải bao gồm locale) — nếu không sẽ trả nhầm ngôn ngữ đã
  cache cho user khác.
- **Bản dịch tiếng Nhật cho 45 category + 218 tag** — ai đảm nhận dịch?
  Đây là khối lượng dịch thuật đáng kể, không phải việc code thuần túy.

## 5. Verification (sau khi code xong)

1. Backend compile: `mvn -q compile`.
2. Gọi API category/tag/banner với locale khác nhau (`vi`/`en`/`ja`) →
   xác nhận trả đúng bản dịch tương ứng, fallback đúng về tên gốc khi 1
   locale chưa có bản dịch.
3. Trang `/marketplace`: đổi ngôn ngữ → tên category đổi theo, khớp với
   dữ liệu backend (không còn dựa vào map cứng).
4. Trang `/upload`: đổi ngôn ngữ → dropdown category cũng đổi theo, và
   PHẢI khớp chính xác với tên hiển thị ở `/marketplace` cùng locale đó
   (test nhất quán 2 trang — đây là mục tiêu chính của lần sửa này).
5. Admin tạo 1 category mới không điền `name_ja` → xác nhận hiển thị
   fallback đúng tên gốc (`name`) khi user chọn tiếng Nhật, không hiện
   rỗng/lỗi.
6. `npx tsc --noEmit` sau khi xóa `CATEGORY_LABEL_KEYS` và sửa
   `MarketplacePage.tsx`.
