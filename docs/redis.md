# Redis trong GodotLaunch

## 1. Mục đích hiện tại

Redis hiện chỉ được backend sử dụng để cache response của homepage. Dự án chưa dùng Redis cho session, OTP, hàng đợi hoặc AI review.

Backend thao tác trực tiếp qua `StringRedisTemplate`, không sử dụng annotation `@Cacheable` hay Spring Cache abstraction.

Luồng cache-aside:

```text
GET homepage
    -> đọc key homepage:v2 từ Redis
    -> cache hit: trả response đã deserialize
    -> cache miss/lỗi Redis: query PostgreSQL, dựng homepage, ghi lại Redis
```

Thông số cache:

| Thuộc tính | Giá trị |
|---|---|
| Key | `homepage:v2` |
| Kiểu dữ liệu | String chứa JSON của `HomepageResponse` |
| TTL | 5 phút |
| Chính sách khi Redis lỗi | Fail-open: bỏ qua cache và tiếp tục đọc PostgreSQL |

Code liên quan:

- `backend/src/main/java/com/godotlaunch/backend/service/impl/HomepageCacheService.java`
- `backend/src/main/java/com/godotlaunch/backend/service/impl/HomepageServiceImpl.java`
- `backend/src/main/java/com/godotlaunch/backend/service/impl/BannerServiceImpl.java`
- `backend/src/main/java/com/godotlaunch/backend/service/impl/ContentCollectionServiceImpl.java`
- `backend/src/main/java/com/godotlaunch/backend/service/impl/HomepageSectionServiceImpl.java`

Cache được xóa khi Admin tạo, cập nhật hoặc xóa:

- Banner
- Content collection
- Homepage section

Hiện chưa có invalidation trực tiếp khi Game/Asset đổi trạng thái publish, giá, category hoặc tag. Trong trường hợp đó homepage có thể cũ tối đa 5 phút, cho đến khi TTL hết.

## 2. Cấu hình backend

`backend/src/main/resources/application.yaml`:

```yaml
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      connect-timeout: 2s
      timeout: 2s
```

Backend có dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

Không có password, username, TLS hoặc database index tùy chỉnh. Redis đang dùng database mặc định `0`.

### Backend chạy trực tiếp trên Windows

Container publish cổng `6379` ra host, vì vậy giữ cấu hình:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Backend chạy trong Docker

Container backend không được dùng `localhost`, vì `localhost` lúc đó là chính container backend. Nếu backend cùng network Compose, cấu hình:

```env
REDIS_HOST=redis
REDIS_PORT=6379
```

`redis` là service name trong `docker-compose.yml`.

## 3. Redis Docker hiện tại

`docker-compose.yml` đã định nghĩa:

```yaml
redis:
  image: redis:7-alpine
  container_name: godotlaunch-redis
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  networks:
    - seaweedfs-net
  restart: unless-stopped
```

Named volume `redis-data` giữ dữ liệu trong `/data` qua các lần recreate container. Lệnh `docker compose down` không xóa volume; chỉ `docker compose down -v` mới xóa các named volume của stack và không nên dùng nếu muốn giữ dữ liệu PostgreSQL/MongoDB/Redis.

Redis này chưa bật authentication và đang publish cổng ra host. Cấu hình phù hợp cho local development, không nên expose trực tiếp ra Internet.

## 4. Gỡ Memurai đang chạy trên Windows

Máy hiện cài `Memurai Developer 4.1.5`, service name là `Memurai`, tự khởi động cùng Windows và chiếm `127.0.0.1:6379`.

Mở PowerShell bằng **Run as Administrator**.

### Dừng service đúng cách

```powershell
Stop-Service -Name Memurai -Force
```

Nếu service không dừng được, mới buộc kết thúc tiến trình:

```powershell
taskkill /IM memurai.exe /F
```

Không nên dùng PID cố định vì PID thay đổi sau mỗi lần khởi động.

### Gỡ Memurai

Mở trình gỡ cài đặt:

```powershell
Start-Process msiexec.exe -Verb RunAs -Wait -ArgumentList '/x {45536403-4D0F-414A-B584-E8B2098B798E}'
```

Hoặc gỡ im lặng:

```powershell
Start-Process msiexec.exe -Verb RunAs -Wait -ArgumentList '/x {45536403-4D0F-414A-B584-E8B2098B798E} /qn /norestart'
```

GUID trên là uninstall product code của `Memurai Developer 4.1.5` đang cài trên máy này.

Kiểm tra service và cổng đã được giải phóng:

```powershell
Get-Service -Name Memurai -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue
```

Nếu hai lệnh không trả về service/listener tương ứng thì có thể chạy Redis Docker.

## 5. Khởi động Redis Docker

Từ thư mục gốc repository:

```powershell
docker compose up -d redis
```

Kiểm tra container:

```powershell
docker ps --filter "name=godotlaunch-redis"
```

Kiểm tra Redis:

```powershell
docker exec godotlaunch-redis redis-cli PING
```

Kết quả đúng:

```text
PONG
```

Xem log:

```powershell
docker compose logs --tail 100 redis
```

## 6. Kiểm tra cache homepage

Sau khi gọi API homepage ít nhất một lần:

```powershell
docker exec godotlaunch-redis redis-cli EXISTS homepage:v2
docker exec godotlaunch-redis redis-cli TTL homepage:v2
docker exec godotlaunch-redis redis-cli GET homepage:v2
```

Ý nghĩa:

- `EXISTS` trả `1`: key đang tồn tại.
- `TTL` trả số giây còn lại, tối đa khoảng `300` giây.
- `GET` trả JSON homepage.

Xóa riêng cache homepage khi cần test:

```powershell
docker exec godotlaunch-redis redis-cli DEL homepage:v2
```

Không dùng `FLUSHALL` vì lệnh đó xóa toàn bộ dữ liệu của tất cả Redis database.

## 7. Lỗi thường gặp

### Port 6379 đã được sử dụng

```text
Bind for 0.0.0.0:6379 failed: port is already allocated
```

Kiểm tra tiến trình:

```powershell
Get-NetTCPConnection -LocalPort 6379 -State Listen |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

Nếu tiến trình là `memurai.exe`, dừng/gỡ Memurai theo mục 4.

### Backend không kết nối được Redis

Kiểm tra lần lượt:

```powershell
docker ps --filter "name=godotlaunch-redis"
docker exec godotlaunch-redis redis-cli PING
```

Nếu backend chạy trên Windows, dùng `REDIS_HOST=localhost`. Nếu backend chạy trong Docker cùng Compose network, dùng `REDIS_HOST=redis`.

Backend hiện bắt exception trong lớp cache, nên Redis hỏng không làm API homepage ngừng hoạt động; API sẽ đọc lại từ PostgreSQL và log ở mức `DEBUG`.

Có thể kiểm tra trực tiếp:
docker exec godotlaunch-redis redis-cli MEMORY USAGE homepage:v2
Kiểm tra tổng RAM Redis:
docker exec godotlaunch-redis redis-cli INFO memory

xem value hiện tại bằng:
docker exec godotlaunch-redis redis-cli GET homepage:v2