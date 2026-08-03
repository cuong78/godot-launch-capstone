# Kế hoạch redesign UI/UX Developer Dashboard

> Trạng thái: Sẵn sàng để triển khai  
> Ngày audit: 02/08/2026  
> Phạm vi: Chỉ layout, visual UI, responsive, accessibility và microcopy  
> Nguyên tắc bắt buộc: Không thay đổi business logic, API, backend, quyền truy cập, dữ liệu, cách tính, điều kiện lọc hoặc luồng nghiệp vụ hiện tại

## 1. Kết luận nhanh

Developer Dashboard nên được thiết kế lại theo hướng **Creator Command Center**: một workspace tối, gọn, có thứ bậc rõ và ưu tiên công việc cần làm. Giao diện mới vẫn giữ phong cách game/developer của Godot Launch, nhưng giảm nền ảnh, hiệu ứng kính và các đường viền cạnh tranh sự chú ý.

Thứ tự đọc mục tiêu:

1. Nhận diện đúng đây là khu vực làm việc của developer và thấy ngay hành động `Đăng tải sản phẩm`.
2. Đọc nhanh bốn chỉ số chính.
3. Chuyển đúng workspace từ sidebar trái: game, tài nguyên, hiệu suất bán hoặc đơn mua.
4. Lọc và xử lý danh sách mà không phải quét qua quá nhiều thành phần cùng trọng lượng.
5. Hiểu rõ loading, lỗi, danh sách rỗng và việc cần làm tiếp theo.

Không xây lại flow. Toàn bộ fetch, filter, sort, ký hợp đồng, xem media, xóa sản phẩm, thanh toán và điều hướng hiện có phải được giữ nguyên.

## 2. Phạm vi audit

### Nguồn đã rà soát

- Ảnh giao diện dashboard hiện tại do người dùng cung cấp.
- `frontend/src/page/DashboardPage.tsx`: cấu trúc KPI, tab, filter, bảng, expanded detail, contract và lightbox.
- `frontend/src/page/PaymentDetailPage.tsx`: giao diện đơn mua được nhúng trong dashboard qua `variant="dashboard"`.
- `frontend/src/App.tsx`: app shell, giới hạn chiều rộng, nền voxel và cách render dashboard.
- `frontend/src/index.css`: font, màu, material, elevation và dark theme hiện có.
- `frontend/src/locales/{vi,en,ja}/dashboard.json`: tên KPI, tab, filter, trạng thái và empty-state copy.

### Luồng giao diện hiện có phải được bảo toàn

| Khu vực | Dữ liệu/hành vi hiện tại | Cam kết khi redesign |
|---|---|---|
| Tổng quan | Doanh thu, sản phẩm đã bán, game, tài nguyên | Giữ nguyên nguồn dữ liệu và thời điểm tải |
| Game của tôi | Lọc theo 6 trạng thái, sắp xếp hiện tại, mở/đóng chi tiết | Giữ nguyên filter value, điều kiện lọc và sort |
| Hợp đồng | Xem, ký, từ chối, tải hợp đồng theo điều kiện hiện tại | Giữ nguyên handler, modal và quyền hành động |
| Media game | Xem thumbnail, screenshot, video, tải ZIP | Giữ nguyên URL, lightbox và download behavior |
| Tài nguyên | Lọc trạng thái, hiển thị danh sách, xóa | Giữ nguyên API và xác nhận xóa hiện tại |
| Hiệu suất bán | Số lượng bán và doanh thu theo sản phẩm | Giữ nguyên phép tính và dữ liệu từ `salesStats` |
| Đơn mua | Refresh, tiếp tục/hủy thanh toán, tải sản phẩm | Giữ nguyên toàn bộ `PaymentDetailPage` behavior |
| Điều hướng | `setCurrentScreen` và `ProtectedRoute` | Không đổi router, auth hoặc permission |

## 3. Audit trải nghiệm hiện tại

### P0 — Cần giải quyết trước

| Vấn đề | Bằng chứng hiện tại | Ảnh hưởng |
|---|---|---|
| Không có page header | Trang bắt đầu trực tiếp bằng bốn card số liệu; các chuỗi `overview.title`, `overview.subtitle`, `overview.deployAsset` đã có nhưng không được render | Người dùng không có ngữ cảnh và không thấy hành động chính |
| Nền quá nhiều chi tiết | Dashboard dùng nền voxel toàn màn hình, thêm tint/grid và nhiều surface bán trong suốt | Giảm tương phản, gây cảm giác rối và làm dữ liệu khó đọc |
| Thứ bậc phẳng | Bốn KPI, thanh tab ngang, filter bar và table đều trải gần kín chiều ngang, có trọng lượng thị giác tương tự | Không rõ nên nhìn hoặc thao tác ở đâu trước |
| Empty state không dẫn đường | Câu rỗng nằm trong một hàng table và yêu cầu nhấn nút “ở trên”, trong khi dashboard không render CTA đó | Người dùng mới bị chặn ở dead end |
| Typography quá nhỏ | Nhiều label/table dùng cỡ `9px`, `10px`, `12px`, uppercase và font mono | Khó đọc trên laptop, màn hình độ phân giải cao và mobile |

### P1 — Ảnh hưởng mạnh tới khả năng thao tác

| Vấn đề | Bằng chứng hiện tại | Ảnh hưởng |
|---|---|---|
| Điều hướng ngang không phù hợp | Mỗi tab có `flex-1`; bốn module quản lý độc lập bị trình bày như các view ngang cùng cấp | Tên dài, khoảng cách rời rạc và khó mở rộng khi có thêm module |
| Filter bar quá nặng | Sáu chip trạng thái nằm trong một card riêng, tất cả đều có border | Chiếm nhiều chiều cao và tạo thêm một lớp container không cần thiết |
| Bảng khó scan | Tên, version, ID, icon, badge, giá và action cạnh tranh nhau; header nhỏ, uppercase | Người dùng phải đọc từng ô thay vì nhận diện theo hàng |
| Expanded detail quá dày | Một hàng mở rộng chứa thumbnail, mô tả, ZIP, contract, screenshot và video | Chiều cao thay đổi mạnh, khó giữ ngữ cảnh của hàng đang xem |
| Trạng thái chưa đủ nhất quán | Badge dùng nhiều màu/animation; trạng thái pending pulse liên tục | Tạo nhiễu và không thân thiện với reduced motion |
| Mobile phụ thuộc horizontal scroll | Thanh điều hướng và table vẫn giữ cấu trúc desktop | Khó phát hiện nội dung ngoài màn hình, thao tác icon nhỏ |

### P2 — Nợ nội dung và tính nhất quán

- `+12%` đang hard-code, kể cả khi doanh thu chưa có; giao diện mới không hiển thị trend nếu không có dữ liệu trend thật.
- Tổng doanh thu bằng `0` đang hiển thị `Miễn phí`; ở KPI tổng hợp nên trình bày thành `0 VND`. Đây chỉ là format hiển thị, không đổi phép tính.
- Card `Game đã phát hành` đang nhận `myGames.length`, có thể bao gồm nhiều trạng thái. Vì không được đổi logic đếm, đổi microcopy thành `Tổng game` hoặc `Game đã gửi`.
- Card `Tài nguyên đang bán` dùng tổng `myMarketplaceItems.length`; nên đổi thành `Tổng tài nguyên` nếu dataset có cả pending/rejected/removed.
- Tên tab đang trộn ngôn ngữ và chưa phản ánh rõ đối tượng: `Publish Game To Store`, `Marketplace`, `Đơn Hàng Đã Bán`, `Management Order`.
- Empty state của game nói “game hoặc tài nguyên”, dù đang ở workspace game.
- Icon-only actions đang dựa nhiều vào `title`, chưa có nhãn truy cập rõ ràng và vùng chạm còn nhỏ.

Các vấn đề dữ liệu nằm sau nhãn KPI chỉ được sửa bằng microcopy trung tính trong phase này. Không sửa query hoặc cách đếm để “khớp” với nhãn cũ.

## 4. Định hướng thiết kế

### 4.1 Quality bar bắt buộc

Giao diện phải đạt cảm giác của một sản phẩm đã qua design review, không phải một bản “AI makeover”. Chất lượng đến từ hierarchy, alignment, density, copy và state design; không đến từ việc thêm nhiều decoration.

Các dấu hiệu phải loại bỏ:

- Hero gradient lớn, blob phát sáng hoặc gradient text không phục vụ nội dung.
- Mọi section đều bị bọc trong card bo tròn lớn; card lồng card nhiều cấp.
- Bốn KPI giống hệt nhau với bốn icon-box mang màu ngẫu nhiên.
- Dùng glassmorphism/blur ở mọi surface khiến text thiếu tương phản.
- Eyebrow uppercase, badge trang trí hoặc microcopy mang tính “marketing” trong một màn hình vận hành.
- Quá nhiều cyan/amber cùng lúc; accent phải có vai trò, không dùng để lấp khoảng trống.
- Pill cho mọi label, border quanh mọi control và shadow quanh mọi panel.
- Fake metric, fake trend, fake live status hoặc chart không có dữ liệu thật.
- Animation liên tục, hover phóng to card hoặc transition `all` quá chậm.
- Icon thiếu nhất quán về stroke, kích thước, optical alignment hoặc chỉ dùng để trang trí.
- Empty state minh họa quá lớn, câu chữ dài hoặc có nhiều CTA cạnh tranh nhau.

Nguyên tắc polish:

- Mỗi viewport chỉ có một CTA primary rõ ràng.
- Khoảng trắng được đo theo grid; không “ước lượng bằng mắt” riêng ở từng component.
- Cột, baseline text, icon và số liệu phải thẳng hàng quang học.
- Trạng thái hover, focus, active, loading, empty, error và disabled được thiết kế cùng lúc với default state.
- Dùng dữ liệu thật/dữ liệu biên khi review: tên game dài, ID dài, số tiền lớn, tiếng Nhật và danh sách đông.
- Mỗi phase phải có screenshot review và một vòng chỉnh optical spacing, không dừng ở mức JSX đã render đúng.

### 4.2 Benchmark từ sản phẩm thật

Nghiên cứu ngày 02/08/2026. Chỉ học pattern và cách tổ chức thông tin; không sao chép nhận diện thương hiệu hoặc layout theo pixel.

| Nguồn tham khảo | Pattern đáng học | Cách áp dụng cho Godot Launch | Không sao chép |
|---|---|---|---|
| [Unity Dashboard](https://docs.unity.com/en-us/services/unity-dashboard-introduction) | Primary navigation bên trái tồn tại xuyên suốt workflow; feature navigation thay đổi theo ngữ cảnh | Sidebar quản lý cố định cho Game, Tài nguyên, Hiệu suất bán và Đơn mua; main content có title/toolbar theo mục đang chọn | Không dùng hai sidebar lồng nhau vì dashboard hiện chỉ có bốn module |
| [Stripe Dashboard](https://docs.stripe.com/dashboard/basics) | Sidebar nhóm tài nguyên vận hành; Home ưu tiên business overview và việc cần chú ý | Tách navigation khỏi dữ liệu; KPI đọc nhanh; trạng thái cần hành động nằm gần record liên quan | Không thêm widget tùy biến, shortcut hay analytics chưa có dữ liệu |
| [Vercel Projects](https://vercel.com/docs/projects) và [Vercel Flags Dashboard](https://vercel.com/docs/flags/vercel-flags/dashboard) | Overview tập trung trạng thái quan trọng; module có search/filter/status rõ, ít decoration | Ưu tiên tên sản phẩm, trạng thái, hành động và progressive disclosure; dùng bề mặt trung tính, density vừa phải | Không biến giao diện thành bản sao đen-trắng của Vercel |
| [Carbon side navigation](https://carbondesignsystem.com/components/UI-shell-left-panel/style/) | Sentence case, active/hover/focus tách bạch, cấu trúc sidebar có kích thước đo được | Dùng label 14px, icon nhất quán, indicator selected, semantic nav và breakpoint behavior rõ | Không lấy nguyên token hoặc component IBM |
| [Carbon data table](https://carbondesignsystem.com/components/data-table/usage/) | Table có toolbar, row height nhất quán, hover giúp scan, expanded row dùng cho thông tin bổ sung | Chuẩn hóa density, alignment, toolbar/filter và expanded game details | Không thêm sort/search/pagination khi logic hiện tại chưa có |
| [Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/) | Empty state thay thế vùng dữ liệu rỗng và đưa ra một bước tiếp theo cụ thể | Bỏ hàng table rỗng; dùng state panel theo đúng workspace với một CTA hợp lý | Không dùng illustration chung chung hoặc nhiều CTA |

### 4.3 Concept: Creator Command Center

Một workspace có cảm giác chuyên nghiệp, tập trung và đáng tin cậy hơn storefront:

- Dark-first, bề mặt lì, ít trong suốt.
- Nền gần như phẳng; nếu có cyan/amber ambient thì phải gần như không nhận thấy và không tạo blob trang trí.
- Cyan chỉ dành cho selection, focus và link/action trung tính.
- Amber dành cho CTA chính hoặc giá trị thương mại.
- Emerald/amber/rose/slate chỉ dành cho trạng thái success/pending/error/neutral.
- Không dùng glow lớn, nhiều viền sáng hoặc animation liên tục.
- Sora cho heading và KPI; Inter cho body, table và controls. Mono chỉ dùng cho ID, version, số liệu cần canh cột.
- Giữ cá tính game creator qua nội dung, icon và sắc cyan/amber có kiểm soát; không dùng phong cách “cyberpunk template”.

### 4.4 Hệ thống visual đề xuất

| Thành phần | Quy chuẩn |
|---|---|
| Canvas | `--launch-canvas` hoặc nền workspace tương đương; ảnh nền bị ẩn/che ở dashboard |
| Surface chính | `--launch-surface`, opacity đủ đặc để đảm bảo tương phản |
| Surface nổi | `--launch-raised`, shadow nhẹ và một border trung tính |
| Border | Một cấp border mặc định; border accent chỉ xuất hiện ở selected/focus |
| Radius | 16px cho card/panel; 10–12px cho control; pill chỉ dùng cho badge/chip |
| Spacing | Lưới 4px; khoảng section 24–32px; card padding 20–24px |
| Heading trang | 28–32px desktop, 24px mobile |
| KPI | 28–32px; label tối thiểu 12px |
| Body/table | 14px; secondary text tối thiểu 12px |
| Control | Cao tối thiểu 40px desktop, target tối thiểu 44×44px trên touch |
| Motion | 160–220ms cho hover/focus/expand; tắt decorative motion khi reduced motion |

Ưu tiên tái sử dụng các token `--launch-*`, `dark-depth-card`, font và màu semantic hiện có. Nếu cần token mới, tạo token page-scoped cho developer dashboard thay vì thêm màu hard-code rải rác trong JSX.

## 5. Information architecture mục tiêu

```text
Developer Dashboard
├─ Page header
│  ├─ H1: Bảng điều khiển nhà phát triển
│  ├─ Mô tả ngắn
│  └─ CTA: Đăng tải sản phẩm
├─ Overview metrics
│  ├─ Doanh thu thực nhận (primary)
│  ├─ Sản phẩm đã bán
│  ├─ Tổng game
│  └─ Tổng tài nguyên
└─ Management workspace
   ├─ Left sidebar navigation
   │  ├─ Game của tôi + count
   │  ├─ Tài nguyên + count
   │  ├─ Hiệu suất bán + count
   │  └─ Đơn mua của tôi + count
   └─ Main content
      ├─ Context toolbar
      │  ├─ Tên/mô tả workspace
      │  └─ Bộ lọc trạng thái
      └─ Content state
         ├─ Loading
         ├─ Error
         ├─ Empty
         └─ Data table/list + expanded details
```

Tên mục điều hướng đề xuất:

| Tab hiện tại | Nhãn sidebar tiếng Việt | Tiếng Anh tương ứng |
|---|---|---|
| Publish Game To Store | Game của tôi | My games |
| Marketplace | Tài nguyên | Assets |
| Đơn Hàng Đã Bán | Hiệu suất bán | Sales performance |
| Management Order | Đơn mua của tôi | My purchases |

Tên mới chỉ thay copy. Giá trị state `my-games`, `marketplace-items`, `sales`, `payment-center` được giữ nguyên.

## 6. Bố cục mục tiêu

### Desktop từ 1280px

```text
┌────────────────────────────────────────────────────────────────────┐
│ Bảng điều khiển nhà phát triển                  [Đăng tải sản phẩm]│
│ Theo dõi sản phẩm, hợp đồng và hiệu suất bán hàng.                  │
├───────────────────┬───────────────┬──────────────┬─────────────────┤
│ Doanh thu         │ Đã bán        │ Tổng game    │ Tổng tài nguyên │
│ 0 VND             │ 0             │ 0            │ 0               │
├──────────────────┬─────────────────────────────────────────────────┤
│ QUẢN LÝ          │ Game của tôi             Trạng thái: [Tất cả] │
│                  │ Quản lý game, hợp đồng và nội dung đã gửi.     │
│ ▣ Game của tôi 0 ├─────────────────────────────────────────────────┤
│ ◇ Tài nguyên   0 │ TÊN GAME  DANH MỤC  LOẠI PHÁT HÀNH  GIÁ  TT  │
│ ↗ Hiệu suất    0 │ ...                                             │
│ ▤ Đơn mua      0 │                                                 │
└──────────────────┴─────────────────────────────────────────────────┘
```

- Header và metrics không nằm trong một “hero” quá cao; nội dung chính phải xuất hiện trong first viewport ở laptop.
- Metric doanh thu rộng hơn nhẹ (`1.25–1.4fr`), ba metric còn lại cùng kích thước.
- Management workspace dùng grid `224–240px / minmax(0, 1fr)`.
- Sidebar nằm bên trái, cùng một surface với content nhưng được phân tách bằng border phải; không tạo cảm giác một card nổi độc lập.
- Sidebar có thể `position: sticky` bên trong workspace khi nội dung dài, với offset không che header toàn cục.
- Mỗi item có icon, label và count badge canh phải; toàn bộ hàng là vùng click 44–48px.
- Count nằm trong badge nhỏ, không ghép trực tiếp vào chuỗi label.
- Active item dùng nền cyan nhẹ, text sáng và một indicator 2–3px ở cạnh trái; inactive item không có border riêng.
- Context toolbar và table nằm trong main content, dùng chung một surface để giảm số lượng card lồng nhau.

### Tablet 768–1279px

- Header vẫn hai cột nếu đủ chỗ; CTA xuống hàng ở chiều rộng hẹp.
- Metrics thành lưới 2×2.
- Từ 1024px trở lên, giữ sidebar đầy đủ rộng khoảng 208–224px.
- Từ 768–1023px, sidebar thu thành icon rail 72px bằng responsive CSS; label hiện qua tooltip/focus hint và accessible name vẫn đầy đủ.
- Không cần tạo state collapse mới; trạng thái compact được quyết định bởi breakpoint.
- Toolbar chuyển thành hai hàng: mô tả trước, filter sau.
- Table giữ các cột thiết yếu; metadata phụ chuyển vào dòng secondary hoặc expanded detail.

### Mobile dưới 768px

- Header xếp dọc, CTA rộng 100%.
- Metrics thành 2 cột; dưới 420px có thể thành một cột hoặc các card compact 2 cột nếu số không bị vỡ dòng.
- Sidebar không cố giữ ở cạnh trái vì sẽ làm main content quá hẹp. Thay bằng một nút chọn workspace full-width ở đầu content, mở popover/bottom sheet gồm đúng bốn item sidebar.
- Bộ chọn mobile dùng lại `activeTab` và các callback hiện có; không tạo route hoặc data flow mới.
- Filter chip scroll ngang một hàng; không wrap thành nhiều dòng cao bất định.
- Không buộc người dùng đọc bảng desktop bằng horizontal scroll. Mỗi record chuyển thành row-card:
  - hàng 1: tên + status;
  - hàng 2: category/type;
  - hàng 3: giá + action;
  - expanded detail nằm ngay dưới card tương ứng.
- Không có page-level horizontal overflow ở 320px.

## 7. Thiết kế chi tiết theo khu vực

### 7.1 Page header

- Header compact, dùng title và một dòng mô tả; không dùng eyebrow/badge uppercase trang trí.
- Dùng lại các key `overview` phù hợp và chỉnh copy cho đúng nội dung thực tế; không buộc phải render key `overview.badge` hiện có.
- CTA `Đăng tải sản phẩm` gọi điều hướng upload hiện có qua `setCurrentScreen("upload")`; không tạo route hoặc flow mới.
- Không render `Đồng bộ kho` vì hiện chưa có hành vi thật trong dashboard.
- Không cần icon lớn cạnh title. Nếu dùng icon, chỉ dùng cỡ nhỏ cho navigation hoặc action có ý nghĩa rõ.

### 7.2 KPI cards

- Mỗi card gồm label, giá trị và tối đa một dòng giải thích ngắn; ưu tiên typography hơn decoration.
- Icon là tùy chọn, cùng một màu neutral và không đặt trong bốn icon-box nhiều màu.
- Revenue là card primary nhưng chỉ nổi hơn bằng độ rộng/typography, không dùng glow.
- Bỏ `+12%` cho đến khi backend/API thực sự cung cấp trend.
- Doanh thu 0 hiển thị `0 VND`; không dùng `Miễn phí` cho aggregate metric.
- Skeleton phải giữ đúng kích thước card để tránh layout shift.
- Nếu `salesStats` lỗi, chỉ phần metric liên quan chuyển sang trạng thái unavailable; không làm biến mất toàn bộ overview.

### 7.3 Sidebar navigation

- Desktop dùng sidebar rộng 224–240px; tablet dùng icon rail 72px; mobile dùng workspace selector.
- Mỗi button có icon 18px, label 14px semibold và count badge riêng.
- Nhóm các item dưới label nhỏ `Quản lý`; không thêm section giả hoặc mục chưa có chức năng.
- Active state: nền cyan rất nhẹ, text sáng, indicator cạnh trái và focus ring rõ; bỏ underline ngang.
- Sidebar dùng `<nav aria-label="Khu vực quản lý developer">`; item hiện tại có `aria-current="page"` và liên kết semantic tới content panel.
- Tooltip ở icon rail phải hoạt động cho hover lẫn keyboard focus; accessible name không phụ thuộc tooltip.
- Mobile selector phải hiển thị icon, tên module hiện tại và chevron; menu có touch target tối thiểu 44px.
- Giữ nguyên `activeTab` và bốn giá trị state hiện tại; chỉ thay control kích hoạt state.

### 7.4 Toolbar và filter

- Bỏ card filter độc lập. Đưa filter vào toolbar của workspace.
- Label filter ngắn gọn (`Trạng thái`) và chip cao 36–40px.
- Active chip dùng fill nhẹ; inactive dùng text/border trung tính.
- Trạng thái có thể có chấm màu nhỏ, nhưng text vẫn là tín hiệu chính.
- Với filtered empty state, thêm action `Xóa bộ lọc` bằng setter hiện có; không thay đổi filter rules.
- Không thêm search, sort mới hoặc pagination trong phase này vì chưa có logic tương ứng.

### 7.5 Data table/list

- Cột đầu là anchor thị giác: title 14px semibold; version và ID ở secondary line 12px.
- Giảm số badge. `publishingType` và `status` dùng badge; category là text thường.
- Giá canh phải và dùng tabular numerals.
- Status canh trái hoặc phải nhất quán, không canh giữa riêng lẻ.
- Nút expand có vùng chạm 40–44px, `aria-expanded` và label rõ.
- Row hover rất nhẹ; keyboard focus phải rõ hơn hover.
- Header có thể sticky trong scroll container khi danh sách dài.
- Marketplace và Sales dùng chung density, header height và empty/error treatment với Game table.

### 7.6 Expanded game details

Giữ nguyên expand/collapse và `expandedGameId`, nhưng tổ chức nội dung thành ba nhóm:

1. **Thông tin**: thumbnail, mô tả, category/version.
2. **Phát hành & hợp đồng**: publishing type, trạng thái, action ký/xem/tải.
3. **Media & file**: ZIP, screenshot, video.

Desktop dùng grid 3 vùng hoặc 2 vùng cân bằng; tablet/mobile xếp dọc. Contract action cần đứng gần contract status, không lẫn với media. Screenshot dùng thumbnail ratio thống nhất; video không tự chiếm chiều cao quá lớn.

Không đổi điều kiện hiển thị action, contract lookup, download URL hoặc lightbox.

### 7.7 Loading, error và empty states

Tạo một pattern `DashboardStatePanel` dùng chung về mặt trình bày:

- **Loading**: skeleton cho toolbar/header row và 3 record; không chỉ đặt spinner giữa hộp trống.
- **Error**: icon, tiêu đề dễ hiểu, message hiện có và nút thử lại gọi đúng fetch function đang có.
- **Empty lần đầu**: icon lớn vừa phải, title cụ thể theo workspace, một câu hướng dẫn, CTA upload cho game/tài nguyên.
- **Filtered empty**: giữ ngữ cảnh workspace, hiển thị filter hiện tại và `Xóa bộ lọc`.
- **Empty sales**: giải thích dữ liệu sẽ xuất hiện sau đơn hàng đầu tiên; không dẫn sang một flow mới.
- **Empty purchases**: giữ hành động quay lại marketplace hiện có của `PaymentDetailPage` nếu phù hợp với variant.

### 7.8 Payment Center embedded

- Giữ component và mọi phép tính/action hiện có.
- Với `variant="dashboard"`, giảm hero lớn và các decoration gradient vì dashboard đã có header/KPI.
- Giữ order summary, session list, refresh, continue/cancel payment và download.
- Dùng cùng radius, border, typography và spacing với ba workspace còn lại để tránh cảm giác “một trang khác được nhét vào content panel”.

### 7.9 Modal và destructive action

- Lightbox và `ContractViewerModal` chỉ đồng bộ màu/focus/spacing nếu cần; không thay đổi behavior.
- Native `window.confirm`/`alert` của xóa marketplace là nợ UX nhưng nằm ngoài phase UI-only nếu việc thay thế đòi hỏi state/flow mới.
- Không đổi wording pháp lý, điều kiện ký/từ chối hoặc kết quả contract.

## 8. Accessibility và nội dung

- Contrast tối thiểu WCAG AA cho body text, badge và control.
- Không dùng màu là dấu hiệu duy nhất của status; luôn có text.
- Mọi icon-only button có accessible name, `aria-label` và focus ring.
- Sidebar, mobile workspace selector và expand/collapse thao tác được bằng keyboard.
- Không dùng cỡ chữ dưới 12px cho nội dung cần đọc.
- Tắt pulse/decorative motion với `prefers-reduced-motion`; tốt nhất bỏ pulse liên tục khỏi pending status.
- Empty/loading/error được thông báo phù hợp bằng semantic/ARIA nhưng không tạo live-region gây đọc lặp.
- Kiểm tra copy dài ở tiếng Việt, tiếng Anh và tiếng Nhật; không hard-code label trong component.
- Cập nhật đồng bộ cả ba file locale. Không sửa key backend hoặc enum status.

## 9. Kiến trúc component đề xuất

`DashboardPage.tsx` hiện chứa data fetching và gần như toàn bộ JSX trong cùng một file lớn. Có thể tách **presentational components** mà không di chuyển business logic:

```text
frontend/src/components/developer-dashboard/
├─ DeveloperDashboardHeader.tsx
├─ DashboardMetricGrid.tsx
├─ DashboardSidebar.tsx
├─ DashboardMobileWorkspaceSelector.tsx
├─ DashboardToolbar.tsx
├─ DashboardStatePanel.tsx
├─ GameManagementTable.tsx
├─ GameExpandedDetails.tsx
├─ MarketplaceManagementTable.tsx
└─ SalesPerformanceTable.tsx
```

Nguyên tắc tách:

- `DashboardPage` tiếp tục sở hữu state, effect, fetch, filter/sort và handler.
- Component con chỉ nhận data/boolean/callback qua props và render UI.
- Không đổi response type, API module hoặc tên enum.
- Không tranh thủ cleanup các state/import/prop cũ nếu cleanup đó không cần cho layout mới.

## 10. File impact dự kiến

| File | Thay đổi được phép | Không được làm |
|---|---|---|
| `frontend/src/page/DashboardPage.tsx` | Bố cục, class, semantic markup, chia presentational component, micro-interaction UI | Sửa fetch/filter/sort/contract/delete/payment logic |
| `frontend/src/page/PaymentDetailPage.tsx` | Chỉ style/layout của branch `variant="dashboard"` | Sửa tính tiền, status condition hoặc payment action |
| `frontend/src/components/developer-dashboard/*` | Component trình bày mới | Gọi API trực tiếp hoặc tạo business state mới |
| `frontend/src/index.css` | Token/page-scoped style, responsive, focus, reduced motion | Thay global style gây regression ngoài dashboard |
| `frontend/src/locales/{vi,en,ja}/dashboard.json` | Copy, label, empty-state text và key trình bày mới | Đổi enum hoặc nội dung pháp lý |
| `frontend/src/App.tsx` | Nếu cần, chỉ đổi presentation condition để dashboard dùng nền workspace đặc | Sửa routing, auth, redirect hoặc screen state |

Không cần sửa `frontend/src/api/*`, backend, database, contract service, wallet service hoặc types nghiệp vụ.

## 11. Kế hoạch triển khai

### Phase 0 — Khóa behavior và baseline

1. Chụp baseline dark/light ở 1440, 1024, 768 và 390px.
2. Lập behavior checklist cho bốn workspace và các action hiện có.
3. Chuẩn bị fixture/test state: loading, error, empty, filtered empty, một record, nhiều record, title dài, giá trị lớn.
4. Ghi nhận các bất nhất dữ liệu/copy nhưng không sửa logic trong phase này.
5. Tạo reference board ngắn từ Unity, Stripe, Vercel và Carbon, ghi rõ pattern nào được dùng và pattern nào bị loại bỏ.

### Phase 1 — Nền, header và visual foundation

1. Tạo canvas dashboard đặc, giảm ảnh voxel và blur xuyên thấu.
2. Thêm page header và CTA upload dùng navigation hiện có.
3. Chuẩn hóa typography, surface, border, radius, shadow và spacing.
4. Thêm page-scoped token/class để không ảnh hưởng storefront/admin.
5. Review một “vertical slice” gồm sidebar item, KPI, toolbar, row và empty state trước khi nhân rộng toàn trang.

### Phase 2 — KPI và workspace navigation

1. Redesign metric hierarchy và skeleton.
2. Bỏ trend hard-code khỏi UI.
3. Đổi microcopy KPI cho đúng dataset hiện tại mà không đổi cách đếm.
4. Thay thanh tab ngang bằng sidebar trái có icon, count badge, active indicator và keyboard focus.
5. Tạo responsive icon rail cho tablet và workspace selector cho mobile.

### Phase 3 — Toolbar, table và content states

1. Gộp filter vào context toolbar.
2. Chuẩn hóa table density, alignment, badge và action targets.
3. Tạo visual pattern chung cho loading/error/empty/filtered-empty.
4. Redesign riêng Game, Marketplace và Sales bằng cùng một hệ quy chuẩn.

### Phase 4 — Expanded detail và payment embedded

1. Nhóm lại expanded game details theo thông tin, contract và media.
2. Giữ nguyên điều kiện/action trong từng nhóm.
3. Làm gọn `PaymentDetailPage` ở embedded variant.
4. Đồng bộ modal/lightbox ở mức visual nếu cần.

### Phase 5 — Responsive, accessibility và i18n

1. Hoàn thiện desktop/tablet/mobile compositions.
2. Kiểm tra 320px không có page-level overflow.
3. Thêm focus, accessible name, navigation semantics và reduced motion.
4. Đồng bộ vi/en/ja và test chuỗi dài.

### Phase 6 — Visual QA và regression

1. So sánh screenshot trước/sau theo breakpoint và theme.
2. Chạy TypeScript lint/build.
3. Chạy behavior checklist để xác nhận không đổi logic.
4. Kiểm tra không có style leak sang storefront, upload, wallet và admin.
5. Chạy checklist “AI-generated look”: card lồng nhau, glow/gradient thừa, icon-box nhiều màu, fake data, radius quá lớn và copy trang trí đều phải bằng 0.
6. Thực hiện ít nhất một vòng optical polish sau khi đã có dữ liệu thật: alignment, baseline, truncation, spacing và color contrast.

## 12. Behavior parity checklist

Trước khi merge, tất cả mục sau phải cho kết quả giống bản cũ:

- [ ] Dashboard vẫn tải game, marketplace item, contract và sales stats đúng thời điểm.
- [ ] Workspace mặc định vẫn là `my-games`.
- [ ] Bốn item sidebar/mobile selector vẫn dùng đúng state value hiện tại.
- [ ] Sáu game filters và bốn asset filters trả cùng tập kết quả.
- [ ] Thứ tự game/item không đổi.
- [ ] Mở/đóng game detail vẫn đúng một record theo `expandedGameId`.
- [ ] Xem screenshot/video, tải ZIP và lightbox hoạt động như cũ.
- [ ] Nút ký/xem/tải/từ chối hợp đồng vẫn xuất hiện theo đúng điều kiện cũ.
- [ ] Xóa marketplace item vẫn dùng cùng API và refresh cùng danh sách.
- [ ] Sales totals và product rows không đổi.
- [ ] Refresh, tiếp tục/hủy payment và download trong workspace đơn mua không đổi.
- [ ] Route, auth, role và redirect không đổi.
- [ ] Không có request API mới chỉ để phục vụ layout.

## 13. Definition of done

Redesign hoàn tất khi:

- Người dùng nhìn thấy page identity, KPI và CTA chính theo đúng thứ tự trong first viewport desktop.
- Giao diện có một hierarchy rõ; không còn cảm giác mỗi khối đều là một card cạnh tranh nhau.
- Giao diện không chứa hero/eyebrow/gradient/glow/icon-box trang trí theo công thức; mỗi visual element đều có vai trò sử dụng rõ ràng.
- Nền không làm giảm khả năng đọc dữ liệu ở cả dark và light theme.
- Cỡ chữ nội dung không dưới 12px; table/body chính đạt 14px.
- Empty state của game và asset có CTA đúng ngữ cảnh; không còn tham chiếu tới nút không tồn tại.
- Sidebar/filter/table dùng nhất quán ở cả bốn workspace.
- Sidebar trái giữ ổn định ở desktop, chuyển thành icon rail ở tablet và workspace selector ở mobile mà không làm mất ngữ cảnh active item.
- Mobile 320–430px không cần scroll ngang toàn trang và action có touch target đạt yêu cầu.
- Keyboard focus, accessible label, contrast và reduced motion đạt checklist.
- Cả vi/en/ja không vỡ layout với chuỗi dài.
- Screenshot cuối ở 1440, 1024, 768 và 390px đã qua một vòng review optical spacing với dữ liệu thật hoặc fixture sát dữ liệu thật.
- `npm run lint` và `npm run build` trong `frontend` chạy thành công.
- Behavior parity checklist đạt 100%.
- Không có thay đổi trong backend/API/business logic.

## 14. Ngoài phạm vi

- Thêm analytics chart, trend API hoặc cách tính KPI mới.
- Thêm search, sort option, pagination hoặc bulk action.
- Thay đổi trạng thái game/asset/contract/payment.
- Sửa quyền developer/customer/admin hoặc router.
- Thay đổi quy trình upload, ký hợp đồng, xóa, thanh toán hoặc payout.
- Thay native confirm/alert bằng flow mới nếu cần state/logic bổ sung.
- Refactor backend, API response, database hoặc WebSocket.
- Sửa các sai lệch dữ liệu bằng cách thay query/cách đếm; phase này chỉ được dùng microcopy trung tính.

## 15. Thứ tự ưu tiên nếu cần chia nhỏ PR

1. **PR 1 — Foundation:** nền dashboard, page header, typography và KPI.
2. **PR 2 — Workspace:** sidebar responsive, mobile selector, toolbar, filter, table và content states.
3. **PR 3 — Details:** expanded game details và payment embedded.
4. **PR 4 — Quality:** responsive, accessibility, i18n, visual regression và cleanup CSS trong phạm vi dashboard.

Mỗi PR phải tự vượt qua behavior parity checklist liên quan; không dồn việc xác nhận “không đổi logic” tới PR cuối.
