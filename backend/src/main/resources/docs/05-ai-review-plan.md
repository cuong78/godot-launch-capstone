# 05. AI Review — Luồng hiện tại và kế hoạch hoàn thiện

> Cập nhật theo implementation hiện tại của Spring Boot, `python-face-service` và Admin UI.
>
> Nguyên tắc bất biến: **AI chỉ tạo báo cáo đề xuất. Admin là người duyệt hoặc từ chối cuối cùng.**
> Kết quả `overallRecommendation = reject` không tự đổi trạng thái Game/Asset thành rejected.

## 1. Mục tiêu và vị trí trong hệ thống

AI Review hỗ trợ admin kiểm duyệt Game và Asset trước khi sản phẩm được công khai hoặc đi tiếp vào luồng hợp đồng/publish store.

Luồng mong muốn:

```text
Developer submit
    -> kiểm tra source/file an toàn
    -> AI Review
    -> lưu AiReviewReport
    -> Admin xem report và bằng chứng
    -> Admin APPROVE hoặc REJECT
```

AI Review không thay thế:

- ClamAV, Zip Slip/Zip Bomb validation hoặc kiểm tra Godot project.
- Xác minh quyền sở hữu GitHub repository.
- Kiểm duyệt thủ công của admin.
- Plagiarism Detection giữa nhiều sản phẩm.
- Dispute workflow và bằng chứng pháp lý.

Luồng tổng thể kết hợp `SourceSnapshot`, AI Review, `CodeEmbedding` và
`PlagiarismFlag`, kèm Mermaid sequence/entity diagram, nằm tại
[06. AI Review và Plagiarism Detection](06-plagiarism-detection-plan.md).

## 2. Phạm vi theo loại nội dung

| Nội dung | Nguồn chính | Code analysis | Media/NSFW | Text/tag analysis |
|---|---|---:|---:|---:|
| Game bán source trên Marketplace | GitHub repository | Có | Có | Có |
| Game gửi lên mobile store | GitHub repository | Có | Có | Có |
| Asset 2D/3D/audio/plugin | File upload + preview media | Không | Có | Có |

Quy ước request tới Python:

- `contentType = code`: tải bundle của đúng `SourceSnapshot`, xác minh `bundleHash` và chạy toàn bộ module.
- `contentType = asset`: không có source snapshot, bỏ qua code analyzer.

## 3. Kiến trúc đang chạy

```text
Spring Boot
  |
  | snapshotId + bundleUrl + bundleHash + commitSha
  | POST /ai/review
  v
python-face-service :8001
  |-- tải ZIP bất biến từ SeaweedFS và xác minh hash
  |-- FrameExtractor: cắt frame video bằng FFmpeg
  |-- CodeAnalyzer: rule-based + DeepSeek
  |-- TextAnalyzer: từ nhạy cảm + tag match + DeepSeek
  |-- CLIP: media <-> title/description/category
  |-- NSFW classifier
  |-- OCR: kiểm tra chữ nhạy cảm trong ảnh/frame
  `-- tổng hợp recommendation + flags + raw output
  |
  v
Spring Boot lưu ai_review_reports
  |
  v
Admin UI hiển thị report, admin quyết định cuối
```

Thành phần chính:

| Tầng | Thành phần | Vai trò |
|---|---|---|
| Java | `AiReviewServiceImpl` | Thu thập Game/Asset, media và gọi Python bất đồng bộ |
| Java | `AiReviewClient` | HTTP client gọi `POST /ai/review`, timeout đọc 5 phút |
| Python | `main.py::ai_review` | Orchestrator các module AI |
| Python | `code_analyzer.py` | Rule-based và DeepSeek cho source code |
| Python | `text_analyzer.py` | Text moderation, tag match và DeepSeek |
| Python | `frame_extractor.py` | Download video và cắt frame bằng FFmpeg |
| Python | `clip_service.py` | Media match bằng CLIP self-host |
| Python | `nsfw_service.py` | NSFW classifier self-host |
| Database | `ai_review_reports` | Lưu lịch sử report |
| Frontend | `AiReviewReportCard.tsx` | Hiển thị report và cho admin trigger lại |

Redis hiện không tham gia AI Review. Redis chỉ cache homepage.

## 4. Luồng Game hiện tại

```text
1. Developer tạo Game draft với title, description, category và tags.
2. Developer submit GitHub repo URL + branch.
3. Backend verify repo thuộc developer.
4. Repo private phải cấp quyền read cho bot.
5. SourceProcessingClient gọi POST /source/process:
   - clone repo;
   - ClamAV scan;
   - kiểm tra project.godot và Godot source;
   - tính bundle hash;
   - tạo source bundle.
6. Nếu malware: Game -> rejected và lưu snapshot bằng chứng.
7. Nếu không phải Godot project: dừng submit.
8. Nếu hợp lệ:
   - lưu githubRepoUrl/githubBranch/githubVerifiedAt;
   - Game -> pending;
   - lưu SourceSnapshot;
   - commit transaction.
9. Bundle được lưu tại `games/{gameId}/snapshots/{snapshotId}/source-bundle.zip`.
10. Sau commit, gọi `reviewGameSnapshotAsync(gameId, snapshotId)`.
11. Python tải bundle của snapshot, giải nén an toàn, tính lại hash rồi chạy các module.
12. Lưu `AiReviewReport.sourceSnapshotId = snapshot.id`.
13. Admin xem report và tự quyết định.
```

### Lưu ý về source

Repository chỉ được clone một lần ở `/source/process`. Kết quả sạch được đóng thành ZIP và gắn với một row `SourceSnapshot` gồm `commitSha`, `bundleHash` và `bundleUrl`. AI không nhận GitHub token và không clone lại repository.

Mỗi lần submit tạo một UUID snapshot và một object key riêng:

```text
games/{gameId}/snapshots/{snapshotId}/source-bundle.zip
```

Python tải đúng URL này, chặn path traversal/symlink/zip bomb và tính lại canonical hash từ đường dẫn + SHA-256 nội dung từng file. Chỉ khi hash khớp `SourceSnapshot.bundleHash` thì source mới được phân tích. Vì report giữ FK `source_snapshot_id`, admin luôn truy ngược được báo cáo đã chấm commit và bundle nào.

## 5. Luồng Asset hiện tại

```text
1. Developer tạo Asset pending.
2. Developer upload file ZIP.
3. Backend lưu file vào SeaweedFS.
4. Backend khởi chạy song song:
   - AsyncVirusScanService.scanAndProcessAsset(...)
   - AiReviewService.reviewAssetAsync(...)
5. AI Review lấy title, description, category, tags và media đã tồn tại.
6. Python chạy text/tag analysis, CLIP, NSFW và OCR; bỏ qua code analyzer.
7. Lưu AiReviewReport.
8. Admin xem report và tự quyết định.
```

### Khoảng trống cần sửa

Luồng Asset hiện chưa đúng nguyên tắc “virus scan sạch rồi mới AI”:

- Virus scan và AI chạy song song.
- AI có thể chạy trước khi virus scan kết thúc.
- Upload media thường diễn ra sau upload file ZIP, nên report đầu tiên có thể không có screenshot/video.

Giải pháp mục tiêu:

```text
Upload asset file
    -> virus scan thành công
    -> đợi media upload hoàn tất / developer bấm Submit for review
    -> trigger AI Review đúng một lần
    -> Asset chuyển sang trạng thái sẵn sàng cho admin
```

## 6. Các module đánh giá

### 6.1 Code quality — chỉ dành cho Game

Rule-based kiểm tra:

- Có `project.godot`.
- Có `.gd` hoặc `.tscn`.
- Số file và LOC.
- API key, token hoặc password hard-code.
- README và LICENSE.
- `.godot/` hoặc `.import/` bị commit nhầm.

DeepSeek nhận sample thông minh thay vì toàn bộ repository:

- Cây thư mục.
- `project.godot`.
- README.
- Script chính và một số script tiêu biểu.
- Title và description.

Kết quả chính:

- `codeQualityScore`.
- `descriptionMatchScore`.
- Issues về code.
- `suggestedPrice`.
- `suggestedRevenueSplit`.
- `pricingRationale`.

Khi không cấu hình DeepSeek, code analyzer fail-soft và dùng điểm rule-based; các trường cần suy luận sâu có thể là `null`.

### 6.2 Media match

Nguồn ảnh:

- Thumbnail.
- Screenshot.
- Asset preview image.
- Frame được cắt từ video intro.

CLIP encode ảnh và text gồm title, description, category rồi tính similarity. Score thấp hơn `35` tạo flag `media_mismatch`.

CLIP chạy self-host và lazy-load model `openai/clip-vit-base-patch32` theo cấu hình mặc định.

### 6.3 NSFW

NSFW classifier chạy trên toàn bộ ảnh và frame đã thu thập. Ngưỡng mặc định là `0.7`.

Khi ảnh vượt ngưỡng:

- `nsfwFlag = true`.
- Tạo flag severity `high`.
- Ghi `evidenceIndex` để admin biết ảnh/frame nào bị đánh dấu.

Model mặc định: `Falconsai/nsfw_image_detection`.

### 6.4 Text, description và tags

`text_analyzer.py` kiểm tra:

- Từ ngữ nhạy cảm trong title/description.
- Tag có khớp nội dung được khai báo không.
- DeepSeek đánh giá nội dung gây hiểu lầm hoặc phóng đại.

Kết quả được lưu vào `tagsMatchScore` và danh sách flags.

### 6.5 OCR media

Pipeline lấy tối đa 8 ảnh/frame, OCR nội dung chữ rồi so với danh sách từ nhạy cảm. Khi phát hiện vi phạm, report nhận flag `media_ocr_sensitive` với `evidenceIndex`.

## 7. Quy tắc tổng hợp recommendation

Python trả một trong ba giá trị:

- `approve`: đề xuất duyệt.
- `review`: cần admin xem kỹ.
- `reject`: đề xuất từ chối.

Quy tắc hiện tại:

```text
Nếu NSFW hoặc có flag severity=high
    -> reject

Nếu tất cả score hiện có >= 70 và không có flag
    -> approve

Nếu bất kỳ score hiện có < 30
    -> reject

Còn lại
    -> review
```

Các score `null` bị bỏ khỏi phép tổng hợp. Recommendation vẫn chỉ là đề xuất và không cập nhật trạng thái sản phẩm.

## 8. Entity và quan hệ

### 8.1 Entity trung tâm: `AiReviewReport`

```text
Game  1 -------- N AiReviewReport
Asset 1 -------- N AiReviewReport
SourceSnapshot 1 -------- N AiReviewReport
```

Một Game hoặc Asset có nhiều report để giữ lịch sử re-submit/re-run. Mỗi report phải thuộc đúng một target.

Trường chính:

| Nhóm | Trường |
|---|---|
| Target | `game`, `asset`, `sourceSnapshot` (chỉ áp dụng cho Game) |
| Score | `codeQualityScore`, `mediaMatchScore`, `descriptionMatchScore`, `tagsMatchScore` |
| Policy | `nsfwFlag`, `overallRecommendation` |
| Pricing | `suggestedPrice`, `suggestedRevenueSplit`, `pricingRationale` |
| Evidence/debug | `flags`, `rawOutput` |
| History | `createdAt` |

Migration V7 đổi constraint target thành XOR để một report chỉ thuộc Game hoặc Asset:

```sql
CHECK (
    (game_id IS NOT NULL AND asset_id IS NULL)
 OR (game_id IS NULL AND asset_id IS NOT NULL)
)
```

### 8.2 Entity cung cấp input

| Entity | Vai trò |
|---|---|
| `Game` | Target code review; cung cấp title, description, category, tags và thumbnail |
| `Asset` | Target media-only review; cung cấp title, description, category, tags, thumbnail |
| `SourceSnapshot` | Cung cấp exact source input qua `bundleUrl`, `bundleHash`, `commitSha` |
| `Media` | Screenshot, video, thumbnail hoặc asset image cho CLIP/NSFW/OCR |
| `Category` | Context text cho CLIP và analyzer |
| `Tag` | Context text và input tính `tagsMatchScore` |

### 8.3 Entity ở bước trước hoặc bước sau

| Entity | Trạng thái tích hợp |
|---|---|
| `SourceSnapshot` | AI phân tích bundle trực tiếp; `AiReviewReport.sourceSnapshot` giữ FK tới snapshot |
| `AuditLog` | Đã ghi event `ai_report_generated` sau khi lưu report |
| `SourceCommit` | Entity/schema đã có nhưng submit flow chưa lưu commit history |
| `CodeEmbedding` | Đã sinh từ exact snapshot, lưu model/revision và vector 768 chiều |
| `PlagiarismFlag` | Đã tạo từ pgvector top-N khi vượt threshold; giữ đủ hai phía để audit |

`CodeEmbedding` và `PlagiarismFlag` thuộc module Plagiarism Detection, không nên gộp vào JSON `AiReviewReport.flags` vì cần query quan hệ Game-to-Game có cấu trúc.

## 9. API contract

### 9.1 Spring Boot gọi Python

```http
POST {app.face-service.url}/ai/review
Content-Type: application/json
```

Request chính:

```json
{
  "contentType": "code",
  "snapshotId": "4de1d76f-8f14-4dc2-9cf6-129abf58018b",
  "bundleUrl": "http://seaweedfs-filer:8888/godotlaunch/games/{gameId}/snapshots/{snapshotId}/source-bundle.zip",
  "bundleHash": "canonical-sha256-hash",
  "commitSha": "git-commit-sha",
  "title": "Example Game",
  "description": "...",
  "category": "Adventure",
  "videoUrl": "...",
  "screenshotUrls": ["..."],
  "tags": ["Stylized", "Adventure"]
}
```

Response chính:

```json
{
  "codeQualityScore": 82,
  "mediaMatchScore": 74,
  "descriptionMatchScore": 79,
  "tagsMatchScore": 88,
  "nsfwFlag": false,
  "overallRecommendation": "review",
  "suggestedPrice": 15,
  "suggestedRevenueSplit": 70,
  "pricingRationale": "...",
  "flags": [],
  "raw": {}
}
```

### 9.2 Admin API

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/v1/admin/ai-reviews/game/{gameId}/trigger` | Chạy lại Game review |
| POST | `/api/v1/admin/ai-reviews/asset/{assetId}/trigger` | Chạy lại Asset review |
| GET | `/api/v1/admin/ai-reviews/game/{gameId}` | Report Game mới nhất |
| GET | `/api/v1/admin/ai-reviews/game/{gameId}/overview` | Snapshot/status/report/plagiarism flags mới nhất |
| GET | `/api/v1/admin/ai-reviews/asset/{assetId}` | Report Asset mới nhất |
| GET | `/api/v1/admin/ai-reviews/game/{gameId}/history` | Lịch sử Game report |
| GET | `/api/v1/admin/ai-reviews/asset/{assetId}/history` | Lịch sử Asset report |

Tất cả endpoint này yêu cầu `ROLE_ADMIN`.

## 10. Admin UI

`AiReviewReportCard` hiển thị:

- Recommendation badge.
- 4 score: code, media, description, tags.
- NSFW status.
- Khuyến nghị giá và revenue split.
- Flags theo severity.
- `evidenceIndex`.
- DeepSeek summary nếu có.
- Nút refresh và re-run.

Hiện UI chỉ hiện số thứ tự bằng chứng, chưa render trực tiếp ảnh/frame tương ứng. `rawOutput` chủ yếu phục vụ debug.

## 11. Fail-soft và trạng thái sản phẩm

AI Review đang chạy bằng `@Async` và fail-soft:

- Lỗi Python/DeepSeek/model không làm submit thất bại.
- `AiReviewClient` trả `null` khi không gọi được Python.
- Không lưu report nếu response là `null`.
- Game/Asset vẫn có thể ở `pending` và admin vẫn có thể duyệt.
- Admin có thể trigger lại thủ công.

Đây là lựa chọn đảm bảo AI outage không khóa moderation, nhưng hệ thống cần hiển thị rõ một trong các trạng thái:

```text
not_started | queued | running | completed | failed
```

Với Game source, migration V11 lưu trạng thái trực tiếp trên exact
`SourceSnapshot`: `aiReviewStatus` và `plagiarismStatus`, kèm error/completedAt.
Admin UI polling endpoint overview khi một bước đang chạy. Asset media-only vẫn
dùng report hiện có và không tham gia code plagiarism.

## 12. Cấu hình runtime

Các biến môi trường chính:

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
CLIP_MODEL=openai/clip-vit-base-patch32
NSFW_MODEL=Falconsai/nsfw_image_detection
NSFW_THRESHOLD=0.7
CODE_EMBEDDING_MODEL=microsoft/codebert-base
CODE_EMBEDDING_MODEL_REVISION=3b0952feddeffad0063f274080e3c23d75e7eb39
PLAGIARISM_REVIEW_THRESHOLD=0.70
PLAGIARISM_REJECT_THRESHOLD=0.90
PLAGIARISM_TOP_N=10
```

Các Java client đọc property `app.face-service.url`; nếu chưa khai báo trong YAML, giá trị mặc định là `http://localhost:8001`:

```yaml
app:
  face-service:
    url: http://localhost:8001
```

FFmpeg phải tồn tại trong image Python. CLIP và NSFW model được lazy-load nên lần gọi đầu có thể chậm hơn đáng kể.

### Lưu ý bảo mật

- GitHub token chỉ dùng trong source-processing để clone lần đầu; AI Review không nhận token.
- `bundleUrl` do backend lấy từ `SourceSnapshot`, không nhận trực tiếp từ client bên ngoài.
- Python giới hạn kích thước download, số file, kích thước giải nén và chặn Zip Slip/symlink.
- Chỉ gửi code sample tới DeepSeek, không gửi toàn bộ repository.
- Cần công bố rõ việc một phần source sample được gửi tới dịch vụ AI bên ngoài.
- Media URL phải đủ quyền truy cập từ container Python nhưng không nên public vĩnh viễn.

## 13. Trạng thái triển khai

| Hạng mục | Trạng thái |
|---|---|
| `ai_review_reports` + entity + repository | Đã có |
| Game trigger sau source processing | Đã có |
| Asset media-only review | Đã có nhưng trigger chưa đúng thời điểm |
| FFmpeg frame extraction | Đã có |
| Rule-based code analyzer | Đã có |
| DeepSeek code/text analyzer | Đã có, phụ thuộc API key |
| CLIP media match | Đã có |
| NSFW classifier | Đã có |
| Tag match | Đã có |
| OCR media moderation | Đã có |
| Admin latest/history/re-run API | Đã có |
| Admin report card | Đã có |
| Trạng thái AI/plagiarism theo Game snapshot | Đã có |
| Durable queue/worker và retry backoff | Chưa có; hiện vẫn dùng `@Async` |
| Clone GitHub đúng một lần cho mỗi submit | Đã có |
| Bundle path chứa Game ID và Snapshot ID | Đã có |
| Python tải bundle và xác minh `bundleHash` | Đã có |
| Report gắn với exact SourceSnapshot | Đã có |
| Evidence image preview | Chưa có |
| Plagiarism runtime pipeline | Đã có cho source code Game |
| Web demo screenshot đưa vào CLIP | Chưa có |

## 14. Kế hoạch hoàn thiện theo ưu tiên

### P0 — sửa tính đúng đắn của flow

- Chỉ trigger Asset AI sau khi virus scan sạch.
- Thêm hành động `Submit for review` sau khi file và media upload hoàn tất.
- Không chạy AI khi Asset đã `removed/rejected` hoặc virus scan chưa thành công.

### P1 — vận hành ổn định

- [x] Lưu `pending/running/completed/failed` theo exact Game snapshot.
- [x] Plagiarism idempotent theo snapshot + model + version; không chạy lại snapshot đã completed.
- Dùng queue/worker thay cho `@Async` trong process Spring Boot.
- Retry có backoff cho lỗi tạm thời.
- Thêm metrics: thời gian xử lý, lỗi model, số report theo recommendation.
- Không để admin hiểu “chưa có report” là “AI đang chạy”.

### P2 — bằng chứng và chất lượng review

- Lưu mapping `evidenceIndex -> media/frame URL` để admin mở đúng bằng chứng.
- Chụp screenshot Web Demo và đưa vào CLIP.
- Tinh chỉnh threshold CLIP/NSFW dựa trên dữ liệu thật.
- Version hóa model, prompt và threshold trong report để tái lập kết quả.
- Bổ sung trạng thái admin đã xem/override recommendation và lý do override.

### P3 — Plagiarism Detection

- [x] Sample code từ exact SourceSnapshot.
- [x] Tạo CodeBERT embedding và lưu `CodeEmbedding`.
- [x] Query top-N cosine similarity bằng pgvector.
- [x] Tạo `PlagiarismFlag` khi vượt threshold.
- [x] Hiển thị Game/snapshot/commit/model/similarity đối chiếu cho admin.
- [ ] Hiển thị diff source side-by-side ở cấp file/đoạn code.

Chi tiết nằm trong [06. Plagiarism Detection](06-plagiarism-detection-plan.md).

## 15. Tài liệu liên quan theo thứ tự flow

1. [00. Tổng quan nghiệp vụ](00-flow-overview.md)
2. [01. JWT Session](01-jwt-session-pattern.md)
3. [02. GitHub OAuth và repo access](02-github-oauth.md)
4. [03. Face Verify và KYC](03-face-kyc-security.md)
5. [04. Source Publishing và Anti-Theft](04-source-publishing-plan.md)
6. **05. AI Review** — tài liệu hiện tại
7. [06. Plagiarism Detection](06-plagiarism-detection-plan.md)
8. [07. Live Preview](07-live-preview-plan.md)
9. [08. Google Play Publish](08-google-play-publish-flow.md)
10. [09. Google Play API Setup](09-google-play-api-setup-guide.md)
11. [10. Payment Flow](10-payment-flow.md)
12. [11. Payout Flow](11-payout-flow.md)
13. [90. Redis](90-redis.md) — tài liệu hạ tầng, không nằm trong AI pipeline
