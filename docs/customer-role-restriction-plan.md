# Plan: Restrict Customer Uploads for Source Code and Assets

## Mục tiêu

Rule cần chốt:

- `customer` không được tạo `game draft`
- `customer` không được sửa `game draft` / metadata
- `customer` không được upload `source code`
- `customer` không được upload `game media / web demo / file upload phục vụ publish`
- nếu muốn upload source code hoặc asset thì user phải được nâng role thành `developer`
- `developer` và `admin` vẫn giữ nguyên quyền upload/publish

---

## Kết quả rà source code

### 1. Frontend đã chặn customer ở menu, nhưng route chưa chặn đủ

Phần UI chính đã có ý định không cho `customer` vào khu vực upload:

- [frontend/src/components/Header.tsx](../frontend/src/components/Header.tsx) `377-388`
  - `handleOpenCreatorCenter()` mở dialog "Become Developer" nếu role là `customer`
- [frontend/src/components/Header.tsx](../frontend/src/components/Header.tsx) `1067-1073`
  - chỉ hiện nút `Dashboard` khi role khác `customer`

Nhưng route thực tế vẫn chưa khóa role:

- [frontend/src/App.tsx](../frontend/src/App.tsx) `1299-1303`
  - màn `upload` chỉ dùng `ProtectedRoute`, chưa truyền `requiredRole="developer"`
- [frontend/src/components/ProtectedRoute.tsx](../frontend/src/components/ProtectedRoute.tsx) `29-38`, `54-55`
  - nếu không truyền `requiredRole` thì component chỉ kiểm tra đăng nhập, không kiểm tra role

Kết luận:

- từ menu chính, `customer` đang bị chặn đúng theo rule mới
- nhưng nếu user đã đăng nhập và đi thẳng tới route `/upload`, frontend vẫn render toàn bộ `UploadPage`
- theo rule mới, `customer` không được vào flow creator này luôn
- vì vậy route `/upload` cũng phải chặn theo role, không chỉ chặn ở menu

### 2. UploadPage vẫn mở đầy đủ luồng upload/source cho user đã đăng nhập

Trong `UploadPage`, hiện không có guard riêng cho role `developer`.

Các điểm chính:

- [frontend/src/page/UploadPage.tsx](../frontend/src/page/UploadPage.tsx) `279-308`
  - `submitDraft()` gọi:
    - `marketplaceApi.createMarketplaceItem(...)`
    - `gameApi.createGameDraft(...)`
- [frontend/src/page/UploadPage.tsx](../frontend/src/page/UploadPage.tsx) `374-430`
  - `uploadFileToStorage()` gọi:
    - `marketplaceApi.uploadItemFile(...)`
    - `marketplaceApi.uploadMedia(...)`
    - `gameApi.uploadMedia(...)`
    - `gameApi.getPresignedUrl(...)`
- [frontend/src/page/UploadPage.tsx](../frontend/src/page/UploadPage.tsx) `504-522`
  - `handleSubmitRepo()` gọi `gameApi.submitGameRepo(...)`
- [frontend/src/page/UploadPage.tsx](../frontend/src/page/UploadPage.tsx) `347-359`
  - `handleUploadDemo()` gọi `gameApi.uploadWebDemo(...)`
- [frontend/src/page/UploadPage.tsx](../frontend/src/page/UploadPage.tsx) `1019-1456`
  - màn hình vẫn hiển thị các ô upload cho:
    - marketplace ZIP
    - preview images
    - thumbnail
    - screenshots
    - gameplay video
    - web demo ZIP
    - GitHub repository

Kết luận:

- nếu `customer` vào được `UploadPage`, UI hiện tại vẫn cho thao tác toàn bộ flow:
  - tạo/sửa draft
  - upload/source
- theo rule mới, cả 2 phần này đều không hợp lệ đối với `customer`

### 3. Backend `assets` đã khóa role khá tốt

Nhóm API marketplace asset đã có `@PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")`:

- [backend/src/main/java/com/godotlaunch/backend/controller/AssetController.java](../backend/src/main/java/com/godotlaunch/backend/controller/AssetController.java)
  - `31-38` create asset
  - `94-101` upload item ZIP
  - `105-113` upload media
  - `130-136` confirm upload complete
  - `170-177` upload media proxy

Service layer cũng đang kiểm tra owner:

- [backend/src/main/java/com/godotlaunch/backend/service/impl/AssetServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/AssetServiceImpl.java) `70-106`
  - tạo asset từ seller hiện tại
- [backend/src/main/java/com/godotlaunch/backend/service/impl/AssetServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/AssetServiceImpl.java) `191-221`
  - upload file chỉ cho owner
- [backend/src/main/java/com/godotlaunch/backend/service/impl/AssetServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/AssetServiceImpl.java) `225-263`
  - upload media chỉ cho owner

Kết luận:

- mình chưa thấy lỗ hở rõ ràng cho `customer` upload `standalone marketplace asset`
- phần `assets` hiện đang được khóa tốt hơn phần `games`

### 4. Backend `games` hiện đang hở toàn bộ creator flow cho customer

Theo rule cuối cùng, toàn bộ mutating flow của `GameController` phải là `developer`/`admin` only, bao gồm cả metadata lẫn upload/source.

#### 4.1 Metadata endpoints cũng phải chặn customer

- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `36-42`
  - `POST /api/v1/games` tạo game draft
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `98-105`
  - `PUT /api/v1/games/{id}` sửa metadata game

Service layer hiện tại:

- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `114-151`
  - `createGameDraft()` không check role
- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `330-357`
  - `updateGame()` chỉ check owner, chưa check role

#### 4.2 Upload/source endpoints cũng phải chặn customer

- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `46-53`
  - `POST /api/v1/games/{id}/submit-repo`
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `66-73`
  - `POST /api/v1/games/accept-bot`
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `107-117`
  - `GET /api/v1/games/{id}/upload-url`
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `120-134`
  - `POST /api/v1/games/{id}/upload-complete`
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `137-145`
  - `POST /api/v1/games/{id}/media/upload`
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `149-167`
  - `DELETE /api/v1/games/{id}/media`
  - `DELETE /api/v1/games/{id}/media/item`
- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `171-177`
  - `POST /api/v1/games/{id}/web-demo`

Service layer hiện tại của nhóm upload/source còn thiếu role guard:

- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `156-237`
  - `submitGameRepo()` check owner repo và owner game, chưa chặn `customer`
- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `373-413`
  - `clearGameMedia()` và `deleteGameMediaByUrl()` chỉ check owner
- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `495-512`
  - `getPresignedUploadUrl()` không check owner, cũng không check role
- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `516-556`
  - `confirmUploadComplete()` không check owner, cũng không check role
- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `562-602`
  - `uploadGameMedia()` chỉ check owner
- [backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java](../backend/src/main/java/com/godotlaunch/backend/service/impl/GameServiceImpl.java) `750-873`
  - `uploadWebDemo()` chỉ check owner

Kết luận:

- backend hiện tại cho phép `customer` đi tiếp vào cả:
  - flow metadata/draft
  - flow upload/source
- toàn bộ phần này đều lệch với rule đã chốt

### 5. `SecurityConfig` đang làm lộ thêm 1 bề mặt upload ở `games`

- [backend/src/main/java/com/godotlaunch/backend/config/SecurityConfig.java](../backend/src/main/java/com/godotlaunch/backend/config/SecurityConfig.java) `61-64`
  - `GET /api/v1/games/**` đang `permitAll()`

Điều này ảnh hưởng trực tiếp tới:

- [backend/src/main/java/com/godotlaunch/backend/controller/GameController.java](../backend/src/main/java/com/godotlaunch/backend/controller/GameController.java) `107-117`
  - `GET /api/v1/games/{id}/upload-url`

Kết luận:

- endpoint lấy presigned upload URL của `games` hiện không chỉ hở cho `customer`
- mà còn có nguy cơ hở cho cả anonymous user nếu biết `gameId`

---

## Những chỗ đang cho customer upload source code và asset

### Nhóm chắc chắn đang hở

1. Route `/upload` trên frontend
- `customer` có thể vào bằng route trực tiếp vì route chưa gắn `requiredRole="developer"`

2. Tạo game draft
- API: `POST /api/v1/games`
- hiện chưa yêu cầu role `DEVELOPER` hoặc `ADMIN`
- nghĩa là chưa chặn đúng `customer`

3. Sửa game draft / metadata
- API: `PUT /api/v1/games/{id}`
- service mới check owner, chưa check role
- nghĩa là `customer` owner vẫn sửa draft được

4. Submit source code qua GitHub repo
- API: `POST /api/v1/games/{id}/submit-repo`
- hiện chưa yêu cầu role `DEVELOPER` hoặc `ADMIN`
- nghĩa là chưa chặn đúng `customer`

5. Upload asset/media cho game
- API: `POST /api/v1/games/{id}/media/upload`
- bao gồm thumbnail, screenshot, video
- hiện chưa yêu cầu role `DEVELOPER` hoặc `ADMIN`
- nghĩa là chưa chặn đúng `customer`

6. Upload web demo ZIP
- API: `POST /api/v1/games/{id}/web-demo`
- hiện chưa yêu cầu role `DEVELOPER` hoặc `ADMIN`
- nghĩa là chưa chặn đúng `customer`

7. Lấy presigned upload URL cho game
- API: `GET /api/v1/games/{id}/upload-url`
- hiện chưa yêu cầu role `DEVELOPER` hoặc `ADMIN`
- ngoài ra còn đang bị `permitAll`

8. Hoàn tất upload cho game
- API: `POST /api/v1/games/{id}/upload-complete`
- hiện chưa có identity check ở controller/service
- nếu đã có objectKey hợp lệ thì vẫn có thể ghi nhận upload hoàn tất

### Nhóm hiện chưa thấy customer upload được

1. Standalone marketplace asset pack
- API thuộc `AssetController`
- đã có `@PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")`

2. Marketplace asset preview media
- cũng đang ở `AssetController`
- đã có `@PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")`

---

## Kế hoạch triển khai từng bước

### Bước 1: Rà source code

Đã hoàn tất cho phạm vi liên quan tới upload `source code` và `asset`.

Kết luận ngắn:

- `assets` flow: backend đã khóa tương đối đúng
- `games` flow: đang là lỗ hở chính
- frontend đang lệch ở route:
  - menu đã chặn customer
  - nhưng route `/upload` chưa chặn customer

### Bước 2: Chỉ ra chính xác chỗ nào đang cho customer upload

Danh sách ưu tiên fix ngay:

1. `frontend/src/App.tsx`
- khóa route `upload` bằng `requiredRole="developer"`

2. `frontend/src/components/ProtectedRoute.tsx`
- giữ cơ chế hiện tại, nhưng dùng `requiredRole="developer"` cho route `upload`

3. `frontend/src/components/Header.tsx` và `frontend/src/page/UploadPage.tsx`
- `Header.tsx` hiện đang chặn customer ở menu là đúng hướng
- `UploadPage.tsx` không nên render cho `customer`; nếu bị truy cập trực tiếp thì route guard phải chặn từ ngoài

4. `backend/.../GameController.java`
- thêm `@PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")` cho toàn bộ endpoint mutating của game
- bao gồm cả metadata endpoints và upload/source endpoints

5. `backend/.../GameServiceImpl.java`
- thêm check role ở service layer để phòng thủ nhiều lớp, không phụ thuộc duy nhất vào controller

6. `backend/.../SecurityConfig.java`
- bỏ việc để `GET /api/v1/games/**` che luôn `upload-url`
- nếu vẫn muốn public game detail thì tách matcher public/read-only riêng

### Bước 3: Bắt đầu code để chặn customer upload

Thứ tự code đề xuất:

#### Phase 1: Khóa ngay ở frontend

Mục tiêu:

- `customer` không thể mở `UploadPage` bằng route trực tiếp
- `developer` và `admin` vẫn vào được flow creator bình thường

Việc cần làm:

- sửa [frontend/src/App.tsx](../frontend/src/App.tsx)
  - đổi route `upload` sang `<ProtectedRoute ... requiredRole="developer">`
- giữ logic menu trong [frontend/src/components/Header.tsx](../frontend/src/components/Header.tsx)
  - vì hiện tại đang phù hợp với rule mới
- không cần mở `UploadPage` cho `customer`

#### Phase 2: Khóa backend ở controller

Mục tiêu:

- kể cả khi frontend bị bypass, `customer` vẫn không gọi được API upload/source
- `developer` và `admin` vẫn giữ nguyên quyền upload/source

Việc cần làm trong `GameController`:

- thêm `@PreAuthorize("hasAnyRole('DEVELOPER', 'ADMIN')")` cho:
  - `POST /api/v1/games`
  - `POST /api/v1/games/{id}/submit-repo`
  - `POST /api/v1/games/accept-bot`
  - `PUT /api/v1/games/{id}`
  - `GET /api/v1/games/{id}/upload-url`
  - `POST /api/v1/games/{id}/upload-complete`
  - `POST /api/v1/games/{id}/media/upload`
  - `DELETE /api/v1/games/{id}/media`
  - `DELETE /api/v1/games/{id}/media/item`
  - `POST /api/v1/games/{id}/web-demo`
- riêng `GET /api/v1/games/{id}/upload-url` và `POST /api/v1/games/{id}/upload-complete`
  - cần thêm `Principal principal` vào controller
  - và truyền requester identity xuống service để check owner + role

#### Phase 3: Khóa backend ở service layer

Mục tiêu:

- defense in depth
- tránh tình huống sau này có controller mới quên gắn `@PreAuthorize`

Việc cần làm:

- thêm helper kiểu `assertDeveloperOrAdmin(User user)` trong `GameServiceImpl`
- gọi helper này tại:
  - `createGameDraft()`
  - `updateGame()`
  - `submitGameRepo()`
  - `acceptBotInvitation()`
  - `clearGameMedia()`
  - `deleteGameMediaByUrl()`
  - `getPresignedUploadUrl()`
  - `confirmUploadComplete()`
  - `uploadGameMedia()`
  - `uploadWebDemo()`

#### Phase 4: Siết lại SecurityConfig

Mục tiêu:

- không để endpoint `upload-url` của `games` lọt qua `permitAll`

Việc cần làm:

- thay rule public hiện tại bằng rule hẹp hơn
- ví dụ:
  - chỉ `GET /api/v1/games`
  - chỉ `GET /api/v1/games/{id}`
- không để `GET /api/v1/games/{id}/upload-url` public

#### Phase 5: Test

Các case cần có:

1. `customer` mở route `/upload` -> bị chặn
2. `customer` tạo game draft -> `403`
3. `customer` sửa metadata draft -> `403`
4. `customer` gọi submit repo -> `403`
5. `customer` lấy upload URL -> `403`
6. `customer` upload thumbnail/screenshot/video -> `403`
7. `customer` upload web demo -> `403`
8. `developer` vẫn đi được toàn bộ flow bình thường
9. `admin` vẫn đi được toàn bộ flow bình thường nếu business cho phép

---

## Đề xuất implement ngắn gọn

Nếu muốn fix an toàn và ít rủi ro nhất, mình đề xuất làm theo đúng thứ tự:

1. Khóa route `/upload` ở frontend
2. Khóa toàn bộ mutating endpoints của `GameController`
3. Thêm role guard ở `GameServiceImpl`
4. Siết `SecurityConfig`
5. Viết test hồi quy cho `customer/developer/admin`

---

## Kết luận

Trạng thái hiện tại:

- `customer` chưa upload được `standalone marketplace asset` qua `AssetController`
- nhưng `customer` vẫn có đường để đi vào flow `games`, từ đó upload:
  - source code qua GitHub repo
  - game asset/media như thumbnail, screenshot, video, web demo

Điểm cần fix gấp nhất là:

- route `UploadPage` ở frontend
- toàn bộ mutating endpoints trong `GameController`
- rule `GET /api/v1/games/**` trong `SecurityConfig`
