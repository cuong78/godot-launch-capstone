# Kiến Trúc Hệ Thống GodotLaunch (System Architecture)

Dự án **GodotLaunch** được xây dựng theo kiến trúc phân tầng (Layered Architecture) kết hợp mô hình Microservices/SOA gọn nhẹ cho phần xử lý AI/KYC/Scanning. Hệ thống tách biệt hoàn toàn giữa các tầng Client-side (Web, Mobile), API Backend (Spring Boot), và AI Service (Python FastAPI).

---

## 1. Biểu Đồ Kiến Trúc Hệ Thống (System Architecture Diagram)

Dưới đây là sơ đồ chi tiết mối quan hệ giữa các thành phần trong hệ thống vẽ bằng **Mermaid**:

```mermaid
graph TB
    %% Định nghĩa màu sắc / Style
    classDef client fill:#d4edda,stroke:#28a745,stroke-width:2px;
    classDef gateway fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef app fill:#cce5ff,stroke:#004085,stroke-width:2px;
    classDef ai fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef db fill:#e2e3e5,stroke:#383d41,stroke-width:2px;
    classDef external fill:#ffffff,stroke:#6c757d,stroke-width:1.5px,stroke-dasharray: 5 5;

    %% Client Layer
    subgraph ClientLayer ["1. Tầng Client (Presentation)"]
        React["React Web App (React 19, TS, Tailwind v4)"]:::client
        Flutter["Flutter Mobile App (Android/iOS)"]:::client
    end

    %% API Backend Layer
    subgraph BackendLayer ["2. Tầng Backend API (Spring Boot 4.x)"]
        Controller["Controllers (REST / WebSocket API)"]:::gateway
        Security["Spring Security (JWT, OAuth2 Clients)"]:::app
        Service["Services (Business Logic)"]:::app
        StorageService["Storage Service (S3 API Client)"]:::app
        Repository["Repositories (Spring Data JPA)"]:::app
    end

    %% Python AI/Identity Layer
    subgraph AILayer ["3. Tầng AI & Identity Service (FastAPI)"]
        FastAPI["FastAPI App (Python 3)"]:::ai
        FaceMatcher["Face Matcher (dlib, Cosine Similarity)"]:::ai
        OCRService["OCR Service (CCCD / Passport Parsing)"]:::ai
        SourceService["Source Processor (ClamAV, Git, Secret Scan)"]:::ai
        AIReview["AI Reviewer (CLIP, NSFW, LLM/DeepSeek)"]:::ai
    end

    %% Data & Storage Layer
    subgraph StorageLayer ["4. Tầng Dữ Liệu & Lưu Trữ (Data & Storage)"]
        Postgres["PostgreSQL 16 (Meta DB & pgvector)"]:::db
        ObjStorage["Object Storage (AWS S3 hoặc SeaweedFS)"]:::db
    end

    %% External Services
    subgraph ExternalServices ["5. Dịch Vụ Bên Ngoài (External Integrations)"]
        Google["Google Auth & reCAPTCHA"]:::external
        GitHub["GitHub API (OAuth2, Repos)"]:::external
        PayOS["PayOS Gateway (Payment, Payout)"]:::external
        SMTP["SMTP Mail Server"]:::external
    end

    %% Tương tác giữa Client và Backend
    React <-->|HTTPS / WebSockets| Controller
    Flutter <-->|HTTPS| Controller

    %% Luồng xử lý nội bộ Backend
    Controller --> Security
    Security --> Service
    Service --> Repository
    Service --> StorageService
    Repository <-->|JDBC / Hibernate| Postgres

    %% Backend giao tiếp với Python Service
    Service -->|HTTP REST| FastAPI
    FastAPI --> FaceMatcher
    FastAPI --> OCRService
    FastAPI --> SourceService
    FastAPI --> AIReview

    %% Tương tác với Storage & DB
    StorageService <-->|S3 API (Upload/Download)| ObjStorage
    FaceMatcher <-->|psycopg2 - Cosine Similarity| Postgres

    %% Tương tác với bên ngoài
    Security <-->|OAuth2 Token Validation| Google
    Security <-->|OAuth2 Token Validation| GitHub
    Service -->|Verify / Clone Repository| GitHub
    Service -->|Create Link / Webhook| PayOS
    Service -->|Send OTP / Status Notification| SMTP
```

---

## 2. Chi Tiết Các Tầng Trong Kiến Trúc

### 2.1 Tầng Client (Presentation Tier)
*   **React Web App (React 19, TypeScript, Tailwind CSS v4):** Web Portal chính dành cho người dùng cuối (Customer), nhà phát triển (Developer), và quản trị viên (Admin). Giao tiếp với backend qua REST API (JWT Header) và thời gian thực qua WebSockets (chat, thông báo).
*   **Flutter Mobile App:** Ứng dụng di động giúp người dùng duyệt game, quản lý ví và thanh toán/mua bán tiện lợi.

### 2.2 Tầng API Backend (Application Tier)
Được xây dựng bằng **Spring Boot**, chịu trách nhiệm quản lý luồng nghiệp vụ cốt lõi, bảo mật, và điều phối các tác vụ.
*   **Spring Security & JWT:** Xử lý xác thực không lưu trạng thái (stateless Session) qua JWT và kết nối tài khoản mạng xã hội (Google & GitHub OAuth2).
*   **Business Services:** Xử lý logic nghiệp vụ cho việc gửi game, mua bán trên chợ (Marketplace), quản lý ví tiền (Wallet) và giao dịch, tạo đề nghị/ký hợp đồng số (Contract).
*   **Storage Service:** Quản lý tải lên tài nguyên (hình ảnh, file mã nguồn game, hợp đồng PDF...) trực tiếp lên Object Storage. Giao tiếp qua chuẩn S3 API giúp hệ thống dễ dàng thay đổi giữa AWS S3 và SeaweedFS thông qua cấu hình mà không cần viết lại mã nguồn.
*   **Flyway Database Migration:** Quản lý thay đổi cấu trúc DB thông qua các script phiên bản hóa (V1 -> V14).

### 2.3 Tầng AI & Identity Service (FastAPI Microservice)
Để tránh quá tải cho ứng dụng Spring Boot khi xử lý các thuật toán nặng hoặc các thư viện C++/Python, các tác vụ này được tách riêng ra một microservice viết bằng **FastAPI**:
*   **Face Matcher:** Sử dụng thuật toán dlib hoặc mô hình trích xuất đặc trưng khuôn mặt (128 chiều) phục vụ cho KYC (chống spam tài khoản).
*   **OCR Service:** Phân tích ảnh chụp CCCD/Passport bằng Google Vision API / FPT OCR để trích xuất thông tin tự động điền vào hợp đồng.
*   **Source Service (ClamAV & Git Scan):** Tự động clone Git repository của nhà phát triển, quét virus bằng ClamAV, phát hiện mã độc/lộ khóa bí mật (Secrets scan) của các file nguồn Godot (`.gd`, `.tscn`).
*   **AI Review:** Phân tích hình ảnh game (NSFW check), video trailer (cắt frame bằng OpenCV và chấm điểm nội dung bằng mô hình CLIP), đồng thời đề xuất mức giá bán hợp lý thông qua LLM (DeepSeek/ChatGPT).

### 2.4 Tầng Dữ Liệu & Lưu Trữ (Data & Database Tier)
*   **PostgreSQL 16 (pgvector):** Cơ sở dữ liệu quan hệ lưu trữ toàn bộ metadata của hệ thống. Tích hợp extension **pgvector** để lưu trữ vector khuôn mặt và thực hiện tìm kiếm trùng lặp (Cosine Similarity) trực tiếp bằng SQL.
*   **Object Storage (AWS S3 hoặc SeaweedFS):** Hệ thống lưu trữ đối tượng tương thích với chuẩn S3 API. Dự án có thể triển khai lưu trữ trên **AWS S3** (khi chạy production trên cloud) hoặc sử dụng **SeaweedFS** (self-hosted/local để tiết kiệm chi phí trong quá trình phát triển) mà không làm thay đổi logic tích hợp của Backend.

---

## 3. Các Luồng Dữ Liệu Chính (Data Flows)

### 3.1 Luồng Xác Minh Danh Tính & Ký Hợp Đồng (KYC & Contract Signing)
1.  **Client (React)** gửi hình ảnh chụp khuôn mặt webcam lên **Spring Boot Backend**.
2.  Backend đẩy ảnh sang **FastAPI (Python)** qua HTTP POST `/face/check`.
3.  Python Service trích xuất Vector khuôn mặt, query trực tiếp xuống **PostgreSQL (pgvector)** bằng công thức Cosine Distance (`embedding <=> %s::vector <= threshold`).
4.  Nếu không bị trùng khuôn mặt, dữ liệu OCR của CCCD sẽ được trích xuất qua `/ocr/document` và trả về điền thông tin tự động vào đề nghị hợp đồng.
5.  Hợp đồng sau khi ký số sẽ được lưu trữ an toàn thông qua **Storage Service** vào **Object Storage**.

### 3.2 Luồng Gửi Game & Quét Mã Nguồn (Game Submission & Code Scan)
1.  **Developer** gửi URL Repository GitHub của game lên **Spring Boot Backend**.
2.  Backend ủy quyền cho **FastAPI** thực hiện clone repo (kèm token OAuth nếu là private repo).
3.  **FastAPI** tiến hành:
    *   Quét Virus bằng ClamAV.
    *   Quét lộ khóa bí mật (secrets scan).
    *   Tạo bản lưu trữ ZIP và tính toán mã Hash bảo mật.
    *   Kiểm tra tính hợp lệ của dự án Godot (phải có file `project.godot`).
4.  Kết quả quét được trả về cho **Spring Boot** để hiển thị lên bảng duyệt của **Admin**, đồng thời file ZIP mã nguồn sẽ được lưu trữ thông qua Storage Service lên **Object Storage**.

### 3.3 Luồng Mua Hàng & Thanh Toán (Marketplace Payment)
1.  **Customer** tiến hành Checkout giỏ hàng trên **React Frontend**.
2.  **Spring Boot** nhận yêu cầu và gọi tích hợp **PayOS API** để tạo liên kết thanh toán (Checkout URL).
3.  **PayOS** trả về liên kết thanh toán, Client chuyển hướng người dùng sang trang thanh toán.
4.  Sau khi giao dịch thành công, **PayOS** gửi webhook thông báo về cho **Spring Boot**.
5.  Backend cập nhật số dư cho ví của **Developer** (đã khấu trừ hoa hồng của nền tảng) và mở quyền tải xuống mã nguồn game cho **Customer**.

---

## 4. Hướng Dẫn Vẽ Kiến Trúc Hệ Thống (Dành Cho Dự Án SEP)

Để hiển thị sơ đồ này trong tài liệu báo cáo đồ án của bạn, bạn có thể áp dụng các cách sau:

### Cách 1: Sử dụng Mermaid.js (Nhanh & Tự Động)
*   Sao chép toàn bộ đoạn mã trong block ` ```mermaid ` ở mục **1** của tài liệu này.
*   Truy cập [Mermaid Live Editor](https://mermaid.live).
*   Dán mã vào khung bên trái, hệ thống sẽ tự động vẽ ra sơ đồ kiến trúc cực kỳ trực quan. Bạn có thể xuất ra file ảnh **PNG**, **SVG** hoặc file **PDF** để đưa vào báo cáo.

### Cách 2: Sử dụng công cụ vẽ trực quan (Draw.io / Eraser.io / Lucidchart)
Nếu bạn cần vẽ một sơ đồ nghệ thuật có chèn thêm các icon trực quan (Spring Boot, Python, PostgreSQL, AWS S3) để nộp cho giảng viên, hãy thực hiện các bước sau:
1.  **Bố cục 4 tầng dọc:** Chia trang vẽ thành 4 phân vùng chính từ trên xuống dưới tương ứng với:
    *   Tầng Client (React, Flutter).
    *   Tầng Application (Spring Boot API).
    *   Tầng AI & KYC Services (FastAPI).
    *   Tầng Database & Storage (Postgres, Object Storage).
2.  **Bổ sung phân vùng bên cạnh (External Systems):** Đặt các khối cho các dịch vụ tích hợp bên ngoài (Google, GitHub, PayOS, SMTP) ở lề phải hoặc lề trái để thể hiện kết nối.
3.  **Vẽ liên kết kèm nhãn mũi tên:** Sử dụng mũi tên kèm mô tả giao thức (ví dụ: `HTTPS`, `WebSockets`, `JDBC`, `S3 API`) và nhãn dữ liệu truyền đi/nhận lại tương tự như mô tả trong sơ đồ Mermaid ở trên.
