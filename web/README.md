# Indie Core Platform

Welcome to the **Indie Core** project! This document outlines the standards, structure, and guidelines for contributing to this project. We aim to build a sleek, high-performance, and immersive platform for gamers and independent developers with a distinct "Cyberpunk / Tech" aesthetic.

---

## 1. Design System (Hệ thống thiết kế)

Our platform relies on a carefully crafted Cyberpunk/Sci-fi design system. It uses dark backgrounds, neon accents, and sharp typography. All design tokens are pre-configured in `tailwind.config.js` and `index.css`.

### 1.1. Color Palette (Bảng màu)
*   **Backgrounds / Surfaces**: Dark and layered.
    *   `bg-surface-container-lowest` (`#0c0e12`): Màu nền tối nhất, dùng cho lớp dưới cùng hoặc footer.
    *   `bg-surface-dim` (`#111317`): Nền chính của toàn trang.
    *   `bg-surface-container` / `bg-surface-container-high`: Màu cho các thẻ (cards), panel nổi.
*   **Primary (Cyan / Blue)**:
    *   `text-primary-fixed-dim` / `bg-primary-fixed-dim` (`#00dbe7`): Màu neon chủ đạo, dùng cho các text highlight, nút bấm chính, viền phát sáng.
*   **Secondary (Purple / Violet)**:
    *   `text-secondary` (`#d1bcff`): Dùng cho các chi tiết phụ, cảnh báo nhẹ hoặc thông tin cần phân biệt với Primary.
*   **Error / Danger**:
    *   `text-error` (`#ffb4ab`): Màu đỏ dùng cho trạng thái lỗi, từ chối, cảnh báo nguy hiểm.

### 1.2. Typography (Kiểu chữ)
Dự án sử dụng 3 bộ font chính từ Google Fonts:
*   **Headlines (`font-headline-*`)**: `Anybody` - Dùng cho các tiêu đề (H1, H2, H3) với kiểu dáng góc cạnh, mạnh mẽ.
    *   Class: `font-headline-lg`, `font-headline-md`...
*   **Body (`font-body-*`)**: `Geist` - Dùng cho văn bản thông thường, dễ đọc.
    *   Class: `font-body-md`, `font-body-lg`.
*   **Labels / Monospace (`font-label-*`)**: `JetBrains Mono` - Dùng cho các nhãn (labels), thông số kỹ thuật, thẻ tags, và các chi tiết dạng terminal.
    *   Class: `font-label-sm` (Luôn đi kèm với uppercase và tracking-widest để tạo cảm giác tech).

### 1.3. Effects & Glassmorphism (Hiệu ứng)
*   **Glass Panel**: Dùng class `.glass-panel` hoặc `.glass-card` cho các box nội dung. Lớp kính mờ (backdrop-blur) giúp thấy nền grid mờ ảo phía sau.
*   **Neon Borders**: Sử dụng `.neon-border-cyan` hoặc tạo shadow `shadow-[0_0_15px_rgba(0,219,231,0.3)]` để làm các ô hoặc nút phát sáng.

---

## 2. Layout Standards (Quy chuẩn bố cục)

*   **Grid System**: Sử dụng hệ thống lưới của Tailwind (`grid-cols-1 md:grid-cols-12`).
*   **Container Width**: Luôn giới hạn nội dung bằng `max-w-container-max mx-auto` (tối đa 1440px) để không bị loãng trên màn hình to.
*   **Paddings**:
    *   Khoảng cách hai bên: Dùng `px-margin-mobile` (20px) làm mặc định cho các màn hình nhỏ, và dùng `md:px-margin-desktop` (64px) để mở rộng lề trên các màn hình máy tính (`md:` trở lên). Các biến này đã được cài sẵn trong `index.css`.
    *   Khoảng cách trên cùng: Vì `Header` là thẻ `fixed`, các trang (`<main>`) LUÔN phải có `pt-24` hoặc `pt-28 md:pt-32` để tránh bị Header che mất nội dung.
*   **Responsive Web Design**: Giao diện trang web được thiết kế để tự động co giãn tốt trên mọi thiết bị. Theo chuẩn Tailwind, hãy viết class cho màn hình nhỏ trước, sau đó dùng các tiền tố như `md:`, `lg:` để điều chỉnh lại trên màn hình máy tính lớn.

---

## 3. Tech Stack & Tools

*   **Core Framework**: React 19 + Vite.
*   **Routing**: `react-router-dom` v6.
*   **Styling**: Tailwind CSS v4 (Sử dụng CSS Variables trong `index.css`).
*   **Icons**:
    *   `lucide-react`: Bộ icon chính, vector sắc nét (VD: `TerminalSquare`, `Bell`, `Settings`).
    *   *Google Material Symbols* (Fallback cho một số icon đặc thù).
*   **Linter/Formatter**: Khuyến khích cài đặt tiện ích ESlint & Prettier trên VSCode.

---

## 4. Project Structure (Cấu trúc thư mục)

```text
my-indie-core/
├── index.html            # Điểm vào (Entry point) của ứng dụng
├── src/
│   ├── App.jsx           # Component gốc, chứa cấu hình Router chính
│   ├── index.css         # Chứa CSS Variables, cài đặt font và các utility classes (.glass-card, v.v.)
│   ├── main.jsx          # File mount React vào DOM
│   │
│   ├── components/       # Các component dùng chung (Reusables)
│   │   ├── Header.jsx    # Thanh điều hướng trên cùng (Dynamic cho Store & Admin)
│   │   ├── Footer.jsx    # Chân trang (Dynamic cho Store & Admin)
│   │   ├── DevPortal/    # Các component con của trang Dev Portal (Dashboard, Metrics...)
│   │   └── ...
│   │
│   └── pages/            # Các trang chính của dự án (Tương ứng với mỗi Route)
│       ├── Home.jsx            # Trang chủ Store
│       ├── Library.jsx         # Thư viện game của user
│       ├── Login.jsx / Register.jsx # Authentication
│       ├── DevPortal.jsx       # Layout tổng của Dev Portal
│       ├── Admin.jsx           # Trang quản trị Users
│       ├── AdminFinance.jsx    # Trang báo cáo doanh thu
│       ├── AdminModeration.jsx # Trang xét duyệt game
│       └── AdminLogs.jsx       # Trang Audit Logs hệ thống
```

---

## 5. Coding Conventions (Quy tắc viết code)

1. **Component Naming**:
   * Sử dụng `PascalCase` cho tên file và tên function component (`Header.jsx`, `AdminLogs.jsx`).
   * Viết Component theo dạng function: `export default function ComponentName() { ... }`.
2. **Class Naming (Tailwind)**:
   * Giữ các class logic lại với nhau (VD: kích thước đứng cạnh kích thước, màu sắc đứng cạnh màu sắc).
   * Ví dụ: `className="w-full h-12 bg-surface-container border border-outline-variant rounded flex items-center justify-center"`
3. **Typography Classes**:
   * Khi gọi font, hãy gọi kèm line-height để đảm bảo thiết kế. Ví dụ: `font-body-md text-body-md`.
   * Đối với các nhãn, trạng thái, nút bấm, log terminal: Luôn dùng chữ in hoa kèm `tracking-widest` (Ví dụ: `font-label-sm text-label-sm uppercase tracking-widest`).
4. **Clean Code & Comments**:
   * Gắn comment (bằng tiếng Anh hoặc tiếng Việt rõ ràng) phân chia các Section lớn trong file JSX (`{/* Header Section */}`).
   * Không viết Inline CSS trừ khi bắt buộc (như render màu động). Ưu tiên dùng Tailwind classes.
5. **Dynamic Routing & State**:
   * Với các thành phần thay đổi theo route (như Header / Footer đổi giao diện ở `/admin`), sử dụng hook `useLocation` từ `react-router-dom` để kiểm tra `location.pathname.startsWith('/admin')`.

---