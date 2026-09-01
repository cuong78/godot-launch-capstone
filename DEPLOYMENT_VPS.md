# GodotLaunch — triển khai production trên VPS

Tài liệu này dành cho Codex agent hoặc kỹ thuật viên tiếp quản một VPS mới.
Các giá trị bí mật không được commit vào repository; dùng kênh an toàn để chép
các file `.env` vào server.

## 1. Mô hình và yêu cầu tài nguyên

Production hiện chạy các service:

- React frontend (Nginx trong container)
- Spring Boot backend (Java 21)
- PostgreSQL/pgvector, MongoDB, Redis
- SeaweedFS master, volume và filer
- ClamAV, AI service, Google Play mock và pgAdmin

Cấu hình VPS tham chiếu đã chuẩn bị: **Ubuntu 24.04, 16 vCPU, 32 GB RAM,
100 GB SSD**. Đây là cấu hình dư an toàn cho toàn bộ stack. Mức tối thiểu để
chạy thử là 4 vCPU, 8 GB RAM và 80–100 GB SSD.

SeaweedFS có thể preallocate volume 1 GB, vì vậy không dùng VPS 25 GB cho
production. Theo dõi disk thường xuyên và giữ mức sử dụng dưới 70–80%.

## 2. Quy ước biến cần thay

Trong tài liệu, thay các placeholder sau:

```text
<SERVER_IP>       IP public của VPS mới
<PROJECT_DIR>     /ubuntu/godot-launch-capstone
<DOMAIN>          godotlaunch.shop
<ADMIN_DOMAIN>    app.godotlaunch.shop
<PGADMIN_DOMAIN>  pgadmin.godotlaunch.shop
```

Không đưa giá trị thật của password, OAuth secret, PayOS key, API key hoặc
private key vào Git.

## 3. DNS và firewall

Tại Cloudflare tạo các bản ghi `A` trỏ đến `<SERVER_IP>`:

| Name | Target | Proxy |
|---|---|---|
| `@` | `<SERVER_IP>` | Proxied hoặc DNS only |
| `www` | `<SERVER_IP>` | Proxied hoặc DNS only |
| `app` | `<SERVER_IP>` | Proxied hoặc DNS only |
| `pgadmin` | `<SERVER_IP>` | Proxied hoặc DNS only |

Khi xin SSL bằng HTTP challenge, để DNS **DNS only** cho đến khi Certbot hoàn
tất (hoặc dùng DNS challenge với Cloudflare API token). Mở cổng trên security
group và UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Chỉ public cổng 80/443. Các cổng PostgreSQL, MongoDB, Redis, SeaweedFS,
backend, frontend và pgAdmin trong Compose đã bind vào localhost hoặc network
nội bộ.

## 4. Chuẩn bị Ubuntu

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx \
  unzip jq cloud-guest-utils e2fsprogs
```

Cài Docker Engine và Compose plugin:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker version
docker compose version
```

Các script seed/upload là PowerShell. Trên Ubuntu cài PowerShell 7:

```bash
. /etc/os-release
curl -fsSL "https://packages.microsoft.com/config/ubuntu/${VERSION_ID}/packages-microsoft-prod.deb" \
  -o /tmp/packages-microsoft-prod.deb
sudo dpkg -i /tmp/packages-microsoft-prod.deb
sudo apt update
sudo apt install -y powershell
pwsh --version
```

## 5. Lấy source và đặt secrets

```bash
sudo mkdir -p /ubuntu/godot-launch-capstone
sudo chown -R "$USER":"$USER" /ubuntu/godot-launch-capstone
cd /ubuntu
git clone <REPOSITORY_URL> godot-launch-capstone
cd /ubuntu/godot-launch-capstone
```

Chép các file bí mật vào đúng vị trí:

```text
/ubuntu/godot-launch-capstone/.env.production
/ubuntu/godot-launch-capstone/backend/.env
/ubuntu/godot-launch-capstone/ai-service/.env
```

`.env.production` được Compose dùng để thay biến `${...}` và tối thiểu phải có:

```env
POSTGRES_PASSWORD=<strong-password>
ADMIN_INITIAL_PASSWORD=<strong-password>
PGADMIN_DEFAULT_EMAIL=<admin-email>
PGADMIN_DEFAULT_PASSWORD=<strong-password>
```

`backend/.env` chứa OAuth, email, PayOS, AI và các integration khác.
`ai-service/.env` chứa cấu hình model và AI. Không sao chép giá trị secret vào
tài liệu.

```bash
chmod 600 .env.production backend/.env ai-service/.env
```

Kiểm tra Compose nhận biến mà không in secret ra terminal:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config >/tmp/godotlaunch-compose-check.yml
```

## 6. Khởi động production lần đầu

Không chạy `docker compose down -v`; tùy chọn `-v` sẽ xóa database và storage.

```bash
cd /ubuntu/godot-launch-capstone
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Chờ PostgreSQL, ClamAV và AI service healthy trước khi dùng backend:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 postgres backend ai-service clamav
```

Flyway của backend tự tạo/cập nhật schema khi backend khởi động. Không chạy
seed development trên database production.

## 7. Nginx và SSL

Các template đã commit:

- `deploy/nginx-godotlaunch.conf`
- `deploy/nginx-pgadmin.conf`

Route SeaweedFS bắt buộc phải giữ prefix `/godotlaunch`:

```nginx
location /files/ {
    rewrite ^/files/(.*)$ /godotlaunch/$1 break;
    proxy_pass http://127.0.0.1:8888;
    proxy_buffering off;
}
```

`proxy_buffering off` giúp stream file trực tiếp, tránh Nginx ghi cache vào disk
khi server gần đầy.

### 7.1. Cài route HTTP ban đầu

```bash
sudo cp deploy/nginx-godotlaunch.conf /etc/nginx/sites-available/godotlaunch.shop
sudo ln -sfn /etc/nginx/sites-available/godotlaunch.shop /etc/nginx/sites-enabled/godotlaunch.shop
sudo nginx -t
sudo systemctl reload nginx
```

Nếu cài pgAdmin trước khi có certificate, dùng tạm một server HTTP proxy cho
`pgadmin.godotlaunch.shop` (không có các dòng `ssl_*`), rồi xin certificate.
Sau khi Certbot thành công, thay bằng `deploy/nginx-pgadmin.conf`.

### 7.2. Xin certificate Let's Encrypt

Đảm bảo DNS đã trỏ đúng và cổng 80 đến được server:

```bash
sudo certbot --nginx \
  -d godotlaunch.shop \
  -d www.godotlaunch.shop \
  -d app.godotlaunch.shop \
  -d pgadmin.godotlaunch.shop
```

Sau đó cài cấu hình pgAdmin đã có SSL:

```bash
sudo cp deploy/nginx-pgadmin.conf /etc/nginx/sites-available/pgadmin.godotlaunch.shop
sudo ln -sfn /etc/nginx/sites-available/pgadmin.godotlaunch.shop /etc/nginx/sites-enabled/pgadmin.godotlaunch.shop
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Nếu Cloudflare đang Proxied và HTTP challenge thất bại, chuyển tạm sang DNS
only hoặc dùng Cloudflare DNS challenge.

## 8. Seed và upload dữ liệu demo (tùy chọn)

Chỉ chạy phần này cho database demo/empty. `run_all_seeds.ps1` có thể xóa và
tạo lại dữ liệu development; không chạy trên production có dữ liệu người dùng.

Lấy container ID bằng Compose để không phụ thuộc tên project:

```bash
cd /ubuntu/godot-launch-capstone
PG_CONTAINER=$(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q postgres)
REDIS_CONTAINER=$(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q redis)
```

Chờ PostgreSQL healthy, sau đó chạy từng script:

```bash
pwsh -NoProfile -ExecutionPolicy Bypass -File ./backend/seed/run_all_seeds.ps1 \
  -ContainerName "$PG_CONTAINER" \
  -RedisContainerName "$REDIS_CONTAINER" \
  -Force

pwsh -NoProfile -ExecutionPolicy Bypass -File ./upload_banner_images.ps1 \
  -SourceFolder "/ubuntu/godot-launch-capstone/resource/media/banner" \
  -FilerUrl "http://localhost:8888" \
  -ContainerName "$PG_CONTAINER" \
  -PublicBaseUrl "https://godotlaunch.shop/files"

pwsh -NoProfile -ExecutionPolicy Bypass -File ./upload_game_images.ps1 \
  -SourceFolder "/ubuntu/godot-launch-capstone/resource/media" \
  -FilerUrl "http://localhost:8888" \
  -ContainerName "$PG_CONTAINER" \
  -PublicBaseUrl "https://godotlaunch.shop/files"
```

Các script upload dùng database user mặc định trong script. Nếu server dùng
user/database khác, truyền thêm `-DbUser` và `-DbName`.

## 9. Kiểm tra sau deploy

```bash
cd /ubuntu/godot-launch-capstone
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS https://godotlaunch.shop/ >/dev/null
curl -fsS http://127.0.0.1:8080/actuator/health || true
curl -fsS http://127.0.0.1:8888/godotlaunch/ >/dev/null
df -h /
free -h
```

Kiểm tra một ảnh sau upload:

```bash
curl -I https://godotlaunch.shop/files/banners/<banner-id>.jpeg
```

Kết quả cần là `200` và `Content-Type: image/jpeg`. Nếu Filer trả 200 nhưng
domain trả 404, kiểm tra Nginx rewrite có thêm `/godotlaunch` hay chưa. Nếu
tải bị ngắt, kiểm tra disk và `proxy_buffering off`.

## 10. Cập nhật code

```bash
cd /ubuntu/godot-launch-capstone
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Không xóa volumes khi cập nhật. Nếu chỉ sửa frontend/backend, Compose sẽ build
lại image tương ứng; kiểm tra log sau khi container lên.

## 11. Chẩn đoán nhanh

### Disk đầy hoặc ảnh tải dở

```bash
df -h /
docker system df
du -xhd1 /var/lib/docker | sort -h
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 seaweedfs-volume seaweedfs-filer
```

Không xóa trực tiếp `seaweedfs-data`, `postgres-data`, `mongodb-data` hoặc các
file `.dat`/`.idx` của SeaweedFS. Dọn Docker cache chỉ sau khi đã kiểm tra:

```bash
docker builder prune -af
docker image prune -f
sudo journalctl --vacuum-size=100M
sudo apt-get clean
```

Nếu disk vẫn tăng nhanh, mở rộng block disk rồi:

```bash
lsblk
sudo growpart /dev/vda 2
sudo resize2fs /dev/vda2
df -h /
```

Chỉ chạy `growpart` sau khi nhà cung cấp VPS đã tăng kích thước `/dev/vda`.

### Container unhealthy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker inspect --format '{{json .State.Health}}' <container-name> | jq
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 <service>
```

Nếu healthcheck báo `no space left on device`, đây thường là lỗi disk/Docker
không tạo được process kiểm tra, chưa chắc là lỗi ứng dụng.

### PostgreSQL chưa nhận kết nối

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 postgres
docker compose --env-file .env.production -f docker-compose.prod.yml restart postgres
```

Không restart liên tục khi disk đầy; xử lý disk trước.

## 12. Backup tối thiểu

Thực hiện backup trước khi seed, nâng cấp hoặc thay đổi storage:

```bash
mkdir -p /ubuntu/backups/godotlaunch
PG_CONTAINER=$(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q postgres)
docker exec "$PG_CONTAINER" pg_dump -U user_godot_launch -d godot_launch \
  | gzip > /ubuntu/backups/godotlaunch/postgres-$(date +%F).sql.gz
```

Snapshot toàn bộ VPS là phương án khôi phục SeaweedFS đơn giản nhất. Không dùng
`docker compose down -v` để thử sửa lỗi vì lệnh đó xóa dữ liệu persistent.

## 13. Checklist bàn giao

- [ ] VPS có tối thiểu 4 vCPU, 8 GB RAM, 80–100 GB SSD; production khuyến nghị 16/32/100.
- [ ] DNS `@`, `www`, `app`, `pgadmin` trỏ đúng IP.
- [ ] Security group/UFW chỉ mở SSH, 80 và 443.
- [ ] Ba file env đã chép riêng và `chmod 600`.
- [ ] Compose đã `up -d`, các service quan trọng healthy.
- [ ] Nginx có route `/files/` → `/godotlaunch/` và `proxy_buffering off`.
- [ ] SSL có đủ bốn hostname và `certbot renew --dry-run` thành công.
- [ ] Đã kiểm tra frontend, API, pgAdmin và một URL ảnh.
- [ ] Đã tạo backup/snapshot trước khi nạp dữ liệu demo.
