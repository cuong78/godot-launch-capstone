# Hướng dẫn cài đặt và chạy GodotLaunch từ file ZIP

Tài liệu này dành cho giảng viên và hội đồng chạy dự án trên **Windows 10/11**. Source code được nhận dưới dạng file ZIP, không cần clone GitHub. Các file môi trường chứa khóa bí mật sẽ được nhóm cung cấp riêng.

## 1. Phần mềm cần cài trước

Máy chạy dự án cần có:

| Phần mềm | Phiên bản | Ghi chú |
|---|---:|---|
| Docker Desktop | Bản mới có Docker Compose v2 | Mở Docker Desktop và chờ engine chạy trước khi setup |
| Java JDK | 21 | Lệnh `java -version` phải hiển thị Java 21 |
| Node.js | 22 LTS | Dự án hỗ trợ Node.js 18 trở lên; Node.js 22 được khuyến nghị |
| Python x64 | 3.14 | Chọn **Add Python to PATH** khi cài |
| GNU Make | Bản mới | Không bắt buộc; xem lệnh PowerShell thay thế ở phần 5 |

Nếu muốn dùng `make`, có thể mở PowerShell bằng quyền Administrator và cài qua Chocolatey:

```powershell
choco install make
```

Sau khi cài phần mềm, đóng terminal cũ và mở terminal mới để Windows cập nhật `PATH`.

## 2. Giải nén source và đặt file môi trường

1. Giải nén ZIP vào một thư mục trên ổ đĩa còn đủ dung lượng, ví dụ:

   ```text
   D:\GodotLaunch
   ```

2. Không chạy trực tiếp bên trong file ZIP. Thư mục gốc sau khi giải nén phải chứa:

   ```text
   GodotLaunch\
   ├── ai-service\
   ├── backend\
   ├── frontend\
   ├── scripts\
   ├── docker-compose.yml
   └── Makefile
   ```

3. Chép ba file `.env` do nhóm cung cấp vào đúng vị trí:

   ```text
   backend\.env
   frontend\.env
   ai-service\.env
   ```

   Không gộp ba file này thành một file `.env` ở thư mục gốc.

4. Nếu nhóm cung cấp file Google Cloud `gcp-vision.json`, đặt file tại:

   ```text
   ai-service\gcp-vision.json
   ```

> Các file `.env` và `gcp-vision.json` chứa thông tin bí mật. Chỉ nhận qua kênh riêng, không đăng lên GitHub hoặc nơi công khai.

## 3. Bắt buộc sửa `INSIGHTFACE_HOME`

File `ai-service\.env` trên máy của nhóm hiện có:

```env
INSIGHTFACE_HOME=C:/Users/Admin/.cache/insightface
```

`Admin` là tên user trên máy của nhóm và **không dùng nguyên đường dẫn này trên máy khác**. Mở PowerShell và chạy:

```powershell
$env:USERPROFILE
```

Nếu kết quả là `C:\Users\NguyenVanA`, sửa dòng trong `ai-service\.env` thành:

```env
INSIGHTFACE_HOME=C:/Users/NguyenVanA/.cache/insightface
```

Giữ dấu `/` trong giá trị và không thêm dấu ngoặc kép. Script `doctor` sẽ báo chính xác giá trị cần dùng nếu đường dẫn chưa đúng.

## 4. Chạy lần đầu bằng một lệnh

1. Mở Docker Desktop và chờ đến khi hiển thị Docker Engine đang chạy.
2. Mở PowerShell tại thư mục gốc của dự án, nơi có `Makefile`.
3. Kiểm tra máy và các file cấu hình:

   ```powershell
   make doctor
   ```

4. Nếu tất cả mục bắt buộc đều `[OK]`, chạy:

   ```powershell
   make first-run
   ```

Lệnh `make first-run` sẽ tự động:

1. Chạy các container PostgreSQL/pgvector, Redis, MongoDB, SeaweedFS và ClamAV bằng Docker Compose.
2. Chờ PostgreSQL chuyển sang trạng thái healthy.
3. Chạy `npm.cmd ci` để tải đúng phiên bản thư viện frontend từ `package-lock.json`.
4. Tải trước thư viện Maven cho backend.
5. Tạo `ai-service\.venv`, cài PyTorch CPU và các thư viện trong `requirements.txt`.
6. Tải và kiểm tra model ArcFace vào thư mục `INSIGHTFACE_HOME`.
7. Mở ba cửa sổ PowerShell riêng để chạy backend, AI service và frontend.
8. Chờ backend healthy (để Flyway tạo đầy đủ bảng), sau đó chạy lần lượt:
   `backend\seed\run_all_seeds.ps1 -Force`, `upload_banner_images.ps1` và `upload_game_images.ps1`.

> `run_all_seeds.ps1` tạo lại dữ liệu development và được gọi với `-Force` để không dừng hỏi trong
> luồng tự động. Chỉ chạy `make first-run` một lần trên database demo; những lần chạy tiếp theo dùng
> `make run` để không seed/upload lặp.

Lần đầu cần tải Docker images, Maven packages, npm packages và AI models nên có thể mất nhiều thời gian tùy mạng. Không đóng terminal trong lúc setup.

## 5. Trường hợp máy không có GNU Make

Mọi lệnh Make đều có lệnh PowerShell tương đương. Tại thư mục gốc dự án, chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\project.ps1 doctor
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\project.ps1 first-run
```

Như vậy không cần thay đổi Execution Policy của toàn hệ thống.

## 6. Những lần chạy tiếp theo

Mở Docker Desktop, mở PowerShell tại thư mục gốc rồi chạy:

```powershell
make run
```

Hoặc không dùng Make:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\project.ps1 run
```

Sau khi các cửa sổ service khởi động xong, truy cập:

| Thành phần | Địa chỉ |
|---|---|
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:8080> |
| Backend health | <http://localhost:8080/actuator/health> |
| AI Swagger | <http://localhost:8001/docs> |
| AI health | <http://localhost:8001/health> |
| SeaweedFS Filer | <http://localhost:8888> |

Backend và AI service có thể cần thêm một lúc để nạp thư viện sau khi cửa sổ được mở. Giữ cả ba cửa sổ PowerShell trong suốt lúc demo.

## 7. Dừng dự án

1. Đóng ba cửa sổ PowerShell có tiêu đề/log backend, frontend và AI service.
2. Dừng các container tại terminal ở thư mục gốc:

   ```powershell
   make infra-down
   ```

   Hoặc:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\project.ps1 infra-down
   ```

Lệnh trên giữ nguyên dữ liệu trong Docker volumes. Không dùng `docker compose down -v` trừ khi thực sự muốn xóa toàn bộ dữ liệu PostgreSQL, MongoDB, Redis và SeaweedFS.

## 8. Các lệnh hỗ trợ

| Lệnh | Công dụng |
|---|---|
| `make help` | Hiển thị các lệnh có sẵn |
| `make doctor` | Kiểm tra phần mềm, Docker engine, `.env` và đường dẫn riêng của máy |
| `make setup` | Chạy container và cài/cập nhật toàn bộ thư viện |
| `make run` | Chạy container cùng ba service ứng dụng |
| `make first-run` | Setup và chạy toàn bộ dự án trong một lệnh |
| `make infra-up` | Chỉ chạy các container Docker |
| `make infra-down` | Dừng container nhưng giữ dữ liệu |
| `make test-launcher` | Kiểm tra launcher và cấu hình Compose |

Có thể xem trước những lệnh sẽ chạy mà không thay đổi máy:

```powershell
make first-run DRY_RUN=1
```

## 9. Cách chạy thủ công để xử lý sự cố

Nếu cần xác định service nào gặp lỗi, chạy từng bước trong các terminal riêng.

### Terminal 1 — Docker containers

```powershell
docker compose up -d
docker compose ps
```

### Cài thư viện frontend

```powershell
cd frontend
npm.cmd ci
cd ..
```

Dùng `npm.cmd`, không dùng `npm`, nếu PowerShell báo chặn `npm.ps1` bởi Execution Policy.

### Cài thư viện AI service

```powershell
cd ai-service
.\setup-venv.bat
cd ..
```

### Terminal 2 — Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### Terminal 3 — AI service

```powershell
cd ai-service
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

Nếu chạy thủ công lần đầu, hãy khởi động backend và chờ `http://localhost:8080/actuator/health` trả về
HTTP 200 trước khi chạy các script dữ liệu:

```powershell
cd ..
powershell -NoProfile -ExecutionPolicy Bypass -File .\backend\seed\run_all_seeds.ps1 -Force
powershell -NoProfile -ExecutionPolicy Bypass -File .\upload_banner_images.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\upload_game_images.ps1
```

### Terminal 4 — Frontend

```powershell
cd frontend
npm.cmd run dev
```

## 10. Xử lý lỗi thường gặp

### `Docker Desktop engine is not running`

Mở Docker Desktop, chờ engine chạy hoàn tất rồi chạy lại `make doctor`. Nếu Docker yêu cầu WSL 2, hoàn tất cài đặt và khởi động lại Windows.

### `Update INSIGHTFACE_HOME ... Expected: ...`

Sao chép đúng giá trị mà `make doctor` in ra và thay dòng `INSIGHTFACE_HOME` trong `ai-service\.env`.

### `Python 3.14 is required`

Cài Python 3.14 x64 từ nguồn chính thức, chọn Add Python to PATH, sau đó mở terminal mới. Kiểm tra bằng:

```powershell
python --version
```

### `npm.ps1 cannot be loaded because running scripts is disabled`

Dùng `npm.cmd` thay cho `npm`. Launcher của dự án đã tự động dùng `npm.cmd`.

### PostgreSQL không healthy hoặc backend không kết nối database

Kiểm tra trạng thái và log:

```powershell
docker compose ps
docker compose logs --tail 100 postgres
```

Các giá trị database mặc định của Compose là database `godot_launch`, user `user_godot_launch`, port `5432`.

### Cổng đã được chương trình khác sử dụng

Dự án cần các cổng `3000`, `8080`, `8001`, `5432`, `6379`, `27017`, `3310`, `8081`, `8888`, `9333` và `18888`. Đóng service/container cũ đang dùng cổng rồi chạy lại.

### AI service khởi động chậm lần đầu

`make setup` tải trước ArcFace và các model AI. Không xóa thư mục được cấu hình bởi `INSIGHTFACE_HOME`; những lần chạy sau sẽ dùng lại cache này.

### Seed hoặc upload ảnh lỗi

Kiểm tra backend đã trả HTTP 200 tại `/actuator/health`, SeaweedFS Filer đã mở tại `http://localhost:8888`
và các container PostgreSQL/Redis đang chạy. Có thể chạy lại từng script thủ công ở phần 9; seed có thể
ghi đè dữ liệu development hiện có, vì vậy không chạy trên dữ liệu production.

## 11. Checklist trước khi gửi file ZIP

Phần này dành cho nhóm bàn giao:

- Đưa đủ source, `docker-compose.yml`, `Makefile`, thư mục `scripts` và tài liệu này vào ZIP.
- Không cần đưa `frontend\node_modules`, `ai-service\.venv`, `backend\target`, `frontend\dist`, `.git` hoặc model cache vào ZIP.
- Gửi riêng `backend\.env`, `frontend\.env`, `ai-service\.env` và `ai-service\gcp-vision.json` qua kênh an toàn.
- Nhắc người nhận sửa `INSIGHTFACE_HOME` theo user Windows trên máy của họ.
- Nên thử giải nén ZIP vào một thư mục mới và chạy `make doctor`, sau đó `make first-run` trước ngày bảo vệ.
