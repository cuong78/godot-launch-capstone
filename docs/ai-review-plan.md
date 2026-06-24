# Plan: AI Review Service (Multimodal Content Evaluation)

> AI đánh giá source code + media (frame video + ảnh) → tạo **report đề xuất** cho admin.
> **AI KHÔNG quyết định cuối** — admin luôn là người review và quyết định. AI là trợ lý.
>
> Quyết định đã chốt:
> - **Phần ẢNH** (media match, NSFW): **self-host** (CLIP + NSFW classifier) — không tốn API
> - **Phần TEXT** (chất lượng code, mô tả đúng sự thật): **DeepSeek API** — rẻ hơn Claude ~10-20×
> - Code sampling: **sample thông minh** (cây thư mục + file chính + description), KHÔNG gửi cả repo
> - Tiêu chí: **(1) chất lượng code, (2) media khớp game, (3) NSFW/policy, (4) mô tả đúng sự thật**
> - Trigger: chạy **sau virus scan sạch, trước admin review** (tạo report rồi mới tới admin)
> - Liên quan: nối tiếp [source-publishing-plan.md](source-publishing-plan.md) (P3)
>
> **Chiến lược chi phí:** ảnh → self-host (free), text → DeepSeek (rẻ), KHÔNG gọi Claude.

---

## 0. Nguyên tắc

```
AI = ĐỀ XUẤT, không phải PHÁN QUYẾT.
  → AI chấm điểm + flag + giải thích lý do
  → tạo "AI Report" đính vào item
  → ADMIN xem report → quyết định approve / reject / yêu cầu sửa
```

AI sai (false positive/negative) → admin sửa được. Không bao giờ auto-reject/auto-publish
chỉ dựa AI. Mọi quyết định cuối có con người.

---

## 1. Bốn tiêu chí & model phù hợp

> Mỗi tiêu chí dùng công cụ phù hợp nhất — ảnh thì self-host, text thì DeepSeek.

| # | Tiêu chí | Engine | Loại | Ghi chú |
|---|---|---|---|---|
| 1 | **Chất lượng code** | Rule-based + **DeepSeek API** | text | Rule-based: Godot project check, secret scan, đếm LOC. DeepSeek: đánh giá structure/smell/hoàn thiện trên sample |
| 2 | **Media khớp game** | **CLIP self-host** | ảnh | CLIP đo tương đồng ảnh↔text rất tốt. Không tốn API |
| 3 | **NSFW / policy** | **NSFW classifier self-host** | ảnh | Pretrained nhẹ (Falconsai/nsfw...), chạy nhanh trên frame + ảnh. Không tốn API |
| 4 | **Mô tả đúng sự thật** | CLIP + **DeepSeek API** | ảnh+text | CLIP: ảnh có khớp mô tả. DeepSeek: mô tả có phóng đại / claim tính năng không có trong code |

**Vì sao DeepSeek (không Claude):**
- 2 tiêu chí text (1, 4) KHÔNG cần đọc ảnh → DeepSeek làm được (DeepSeek không multimodal nhưng đây là text-only)
- DeepSeek-V3/Coder mạnh về code reasoning, rẻ hơn Claude ~10-20×
- Phần ảnh (2, 3) đã có CLIP/NSFW self-host lo → không cần model multimodal đắt tiền

**Phân chia engine:**
```
TEXT-ONLY  → DeepSeek API   : chất lượng code (1), mô tả phóng đại (4)
ẢNH/FRAME  → self-host      : media match CLIP (2), NSFW (3), ảnh↔mô tả (4-phần-ảnh)
ĐỊNH LƯỢNG → rule-based     : Godot check, secret scan, LOC (1-phần-cứng)
```

---

## 2. Kiến trúc — mở rộng python-face-service

```
Spring Boot ──POST /ai/review──► python service (port 8001)
  {source, mediaUrls,                 │
   title, desc, category}             ├─ 1. Code: rule-based + sample ──► DeepSeek API (text)
                                      ├─ 2. ffmpeg cắt frame video
                                      ├─ 3. CLIP: media ↔ description   (self-host, local)
                                      ├─ 4. NSFW classifier             (self-host, local)
                                      └─ tổng hợp ──► AIReport
            ◄──{ aiReport }───────────┘
  → lưu ai_review_reports vào DB → admin xem report + bằng chứng → QUYẾT ĐỊNH

Gọi API bên ngoài: CHỈ DeepSeek (phần text). CLIP + NSFW chạy local, không tốn API.
```

### Endpoints mới
```
POST /ai/extract-frames   → ffmpeg cắt N frame đều nhau từ video intro
POST /ai/analyze-code     → rule-based + sample → DeepSeek (chất lượng + mô tả đối chiếu code)
POST /ai/match-media      → CLIP: frames + screenshots ↔ title/description/category
POST /ai/nsfw-scan        → NSFW classifier trên tất cả frame + ảnh
POST /ai/review           → orchestrator: gọi cả 4, tổng hợp 1 AIReport
```

---

## 3. Video frame extraction (yêu cầu của bạn)

```
Video intro (đã upload, có mediaUrl)
  → ffmpeg cắt N frame đều nhau (vd 8-12 frame across timeline)
  → mỗi frame là 1 ảnh → đưa vào CLIP + NSFW cùng với screenshots
```

### Vì sao cắt frame
- Game có thể gắn video của game KHÁC để lừa → frame cho thấy nội dung thật của video
- NSFW có thể giấu trong vài giây giữa video → cần sample nhiều frame

### Tasks
- [ ] Thêm `ffmpeg` vào Dockerfile python service
- [ ] `frame_extractor.py`: download video → ffmpeg `-vf fps` hoặc lấy N keyframe → list ảnh
- [ ] Giới hạn: max frame, max thời lượng xử lý (tránh video dài làm nghẽn)

---

## 4. Từng module chi tiết

> **Phạm vi theo loại nội dung** (xem mô hình submit ở source-publishing-plan.md):
> - **CODE** (game + marketplace source_code, đến từ repo đã clone): chạy CẢ 4 module.
> - **ASSET** (3D/audio/sprite, upload file): CHỈ chạy module 2 (media match) + 3 (NSFW)
>   + 4-phần-ảnh. KHÔNG chạy 4.1 code analyzer (asset không có source code Godot).

### 4.1 Code analyzer (tiêu chí 1) — CHỈ cho CODE từ repo
```
Nguồn: thư mục đã git clone (KHÔNG phải zip — game.zip đã bỏ).

BƯỚC 1 — Rule-based (cứng, làm trước, không tốn API):
  - Có project.godot không? → đúng là Godot project
  - Có .gd / .cs / .tscn không? → có code thật, không phải zip rỗng
  - Secret scan: regex tìm API key / token / password hardcoded
  - Đếm LOC, số file → phát hiện "asset rỗng" (mô tả hoành tráng, code trống)

BƯỚC 2 — DeepSeek API (đánh giá chất lượng, SAMPLE THÔNG MINH):
  KHÔNG gửi cả repo. Chỉ gửi:
    - cây thư mục (file tree)
    - file chính: project.godot, main scene script, README
    - vài .gd tiêu biểu (entry point, script lớn nhất)
    - title + description
  → DeepSeek đánh giá: structure, code smell, độ hoàn thiện, có khớp mô tả không

Embedding (optional, giai đoạn sau):
  - CodeBERT embedding → lưu pgvector → phục vụ similarity (mục P3 plan chính)
```

### 4.2 Media-match (tiêu chí 2 + 4-phần-dễ)
```
CLIP encode:
  - mỗi frame/screenshot → image embedding
  - title + description + category → text embedding
  → cosine similarity
  → điểm thấp = media KHÔNG khớp mô tả (nghi gắn video game khác / quảng cáo sai)
```

### 4.3 NSFW / policy (tiêu chí 3)
```
NSFW classifier (pretrained nhẹ) trên TẤT CẢ frame + ảnh
  → mỗi ảnh: score [safe, nsfw, violence, ...]
  → bất kỳ ảnh nào vượt ngưỡng → flag "policy violation" + đính ảnh đó cho admin xem
```

### 4.4 Description truthfulness (tiêu chí 4)
```
Phần ẢNH (self-host CLIP): ảnh/frame có khớp description không (đã làm ở 4.2)
Phần TEXT (DeepSeek API):
  - "mô tả phóng đại" / "claim tính năng không có trong code"
  → gửi description + code sample (mục 4.1 bước 2) → DeepSeek đối chiếu
  → vd: mô tả "multiplayer online" nhưng code không có networking → flag
```

---

## 5. AIReport — kết quả tổng hợp

### ⚠️ Bảng `ai_reports` cũ ĐÃ TỒN TẠI nhưng KHÔNG khớp — dùng bảng MỚI

Schema gốc (V1) có bảng `ai_reports` nhưng:
- Gắn với `game_version_id` (GameVersion hiện CHƯA dùng trong code)
- Cấu trúc thiên về **định giá**: `quality_score`, `originality_score`, `trend_score`,
  `suggested_price`, `suggested_revenue_split` — KHÔNG có media/NSFW/multimodal
- → KHÔNG tái dùng được cho AI review multimodal. Tạo bảng MỚI `ai_review_reports`.

### Bảng mới: `ai_review_reports`
```sql
CREATE TABLE ai_review_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_item_id UUID REFERENCES marketplace_items(id),
    game_id         UUID REFERENCES games(id),

    -- điểm từng tiêu chí (0-100)
    code_quality_score   INT,
    media_match_score    INT,
    nsfw_flag            BOOLEAN DEFAULT FALSE,
    description_match_score INT,

    overall_recommendation VARCHAR(20),  -- 'approve' | 'review' | 'reject'
    flags           JSONB,               -- chi tiết: [{type, severity, detail, evidence_url}]
    raw_output      JSONB,               -- output thô từ python service
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

> `overall_recommendation` chỉ là ĐỀ XUẤT. `flags` đính kèm bằng chứng (ảnh NSFW,
> frame không khớp...) để admin xem trực tiếp, không phải tin AI mù quáng.

---

## 6. Luồng tích hợp (sau scan sạch, trước admin)

```
Developer submit source
  → clone → virus scan (ClamAV) → SẠCH
  → snapshot (commit SHA + hash)                    [P1 plan chính]
  → AI REVIEW:
      POST /ai/review { source, mediaUrls, title, desc, category }
      → extract frames + analyze code + CLIP match + NSFW
      → tạo ai_review_report (status item = ai_reviewed)
  → ADMIN dashboard: hiện item + AI report
      → admin xem điểm + flags + bằng chứng
      → admin APPROVE / REJECT / yêu cầu sửa          ← QUYẾT ĐỊNH CUỐI
  → approve → status = active/published (luồng có sẵn)
```

---

## 7. Tasks tổng hợp

### Giai đoạn AI-1 (làm được ngay)
- [ ] `ffmpeg` + frame extractor
- [ ] CLIP model self-host: media ↔ description match (tiêu chí 2)
- [ ] NSFW classifier self-host trên frame + ảnh (tiêu chí 3)
- [ ] Rule-based code analyzer: Godot project check + secret scan + LOC (tiêu chí 1 phần cứng)
- [ ] **DeepSeek client + code sampling** (cây thư mục + file chính) → chất lượng code + mô tả đối chiếu (tiêu chí 1+4 phần text)
- [ ] `DEEPSEEK_API_KEY` env var + config endpoint
- [ ] Bảng `ai_review_reports` + entity + repo
- [ ] `/ai/review` orchestrator (gọi 4 module, tổng hợp)
- [ ] Backend `AiReviewClient.java`
- [ ] Admin dashboard: hiện AI report + flags + bằng chứng

### Giai đoạn AI-2 (nâng cao)
- [ ] CodeBERT embedding → pgvector (phục vụ similarity P3)
- [ ] Tinh chỉnh prompt DeepSeek + ngưỡng từng tiêu chí dựa data thật
- [ ] Xử lý false positive (boilerplate Godot, thư viện chung)
- [ ] (optional) Claude fallback cho case nhạy cảm điểm sát ngưỡng — nếu cần độ chính xác cao hơn

---

## 8. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Self-host model nặng (CLIP, NSFW) → cần RAM/GPU | Chạy async, queue; cân nhắc GPU nếu volume lớn |
| Gửi cả repo cho DeepSeek → tốn token / vượt context | Sample thông minh: chỉ gửi cây thư mục + file chính (mục 4.1) |
| DeepSeek không đọc ảnh | Đúng thiết kế — ảnh để CLIP/NSFW self-host lo, DeepSeek chỉ text |
| Lộ source code ra API DeepSeek (privacy) | Chỉ gửi SAMPLE, không gửi toàn bộ; cân nhắc điều khoản với developer |
| Video dài làm nghẽn frame extract | Giới hạn thời lượng + số frame |
| False positive NSFW (art game bạo lực hợp lệ) | AI chỉ FLAG, admin xem ảnh quyết định — không auto-reject |
| Bảng `ai_reports` cũ (định giá, gắn game_version) | KHÔNG khớp → dùng bảng mới `ai_review_reports` |

---

## 9. Những gì ĐÃ CÓ (tái sử dụng)

| Có sẵn | Dùng cho |
|---|---|
| `python-face-service` + Docker | Thêm module AI review (CLIP, NSFW, ffmpeg, DeepSeek client) |
| pgvector | CLIP/CodeBERT embedding (nếu cần lưu) |
| ClamAV | Chạy trước AI (đã có) |
| Bảng `ai_reports` (schema gốc, định giá) | KHÔNG tái dùng — tạo `ai_review_reports` mới |
| GameMedia / marketplace media URL | Nguồn frame video + ảnh để AI đọc |
| Admin dashboard | Hiện AI report |
| Pattern `FaceServiceClient` | Mẫu cho `AiReviewClient.java` gọi python service |
