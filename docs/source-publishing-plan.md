# Plan: Source Code Publishing & Anti-Theft

> Lộ trình cho luồng push game/source qua GitHub: verify → clone (kể cả private) →
> virus scan → AI review → publish, kèm cơ chế chống đạo nhái và phòng thủ pháp lý.
>
> Quyết định kiến trúc đã chốt:
> - Private repo: clone bằng **token của chính developer** (scope `repo`)
> - Anti-theft: **cả 2** — snapshot/timestamp (giai đoạn 1) + AI similarity (giai đoạn 2)
> - Review: **AI service** (chưa lên plan chi tiết, để placeholder)
> - Runtime nặng: mở rộng **python-face-service** thành source-processing service
> - Dispute: **KHÔNG escrow** — trả tiền ngay, dùng **cưỡng chế hoàn trả + KYC/FaceID + admin backstop**
>
> Quy ước vai trò (thống nhất toàn bộ tài liệu):
> - **A = người bán** (bị tố đánh cắp)
> - **B = người báo cáo** (claim code của mình bị A bán)

---

## ⚠️ NGUYÊN TẮC TÀI CHÍNH (ĐÃ CHỐT CỨNG)

**KHÔNG GIAM TIỀN dưới mọi hình thức** — không escrow, không reserve, không payment hold,
không rolling reserve. Người bán nhận **100% ngay** khi giao dịch thành công.

Toàn bộ rủi ro tranh chấp xử lý SAU bằng: **cưỡng chế hoàn trả (5 ngày) + KYC/FaceID
truy danh tính + ban + admin backstop**. Không có cơ chế nào chặn/giữ dòng tiền của người bán.

---

## 0. Nguyên tắc nền tảng

Link GitHub **không** chứng minh "ai là tác giả gốc" — chỉ chứng minh "repo này thuộc account này".
Kẻ trộm có thể tạo repo mới chứa code ăn cắp và vẫn pass verify owner.

→ Chống trộm thật sự = **nhiều lớp**, trong đó **lớp pháp lý/vận hành quan trọng hơn lớp kỹ thuật**:

```
LỚP 1 — Kỹ thuật:   verify owner + clone + virus scan + snapshot + AI similarity
LỚP 2 — Pháp lý:    hợp đồng indemnity + KYC/FaceID (truy danh tính vô thời hạn)
LỚP 3 — Vận hành:   dispute workflow (cưỡng chế hoàn trả + ban + admin backstop)
```

**Collusion (A đưa code cho B, B tố) KHÔNG chống được bằng kỹ thuật** — vì người cho code tự nguyện.
Giải pháp: KHÔNG giam tiền (escrow gây thiệt cho người bán thật + dispute không giới hạn window),
mà **trả tiền ngay** rồi dùng **danh tính thật (KYC/FaceID) để cưỡng chế hoàn trả khi tranh chấp**.
Nền tảng là trung gian truy trách nhiệm người bán, không phải bên bảo lãnh.

---

## ⚠️ MÔ HÌNH SUBMIT (ĐÃ CHỐT — thay đổi lớn so với code hiện tại)

**Phân biệt theo loại nội dung:**

| Loại | Cách submit | Storage |
|---|---|---|
| **GAME** (publish to store) | CHỈ cung cấp **link repo GitHub** → hệ thống auto pull | KHÔNG upload zip |
| **MARKETPLACE source_code** | CHỈ cung cấp **link repo GitHub** → hệ thống auto pull | KHÔNG upload zip |
| **MARKETPLACE asset** (3D/audio/sprite...) | **Upload file** (không phải code) | StorageRouter (asset) |

→ **Nguyên tắc: CODE đi qua repo, ASSET đi qua upload file.**

### Cần GỠ BỎ (code hiện tại đang có, phải dọn khi implement)
- [ ] `game.zip` upload: `GameController` presigned URL + `confirmUploadComplete` cho game file
- [ ] `GameServiceImpl`: nhánh xử lý game.zip (`getPresignedUploadUrl` fileType=game, virus scan game.zip)
- [ ] `MarketplaceItemServiceImpl.uploadItemFile` cho source_code (`source_code_zip`)
- [ ] `MarketplaceItemServiceImpl.buildObjectKey` → `marketplace/items/{id}/project.zip`
- [ ] Frontend `UploadPage`: bỏ ô upload game.zip + upload zip cho source_code
- [ ] FileType enum: cân nhắc giữ `game_zip`, `source_code_zip` hay deprecate (asset vẫn cần)
- [ ] AsyncVirusScanService: scan từ repo đã clone thay vì từ zip

### Cần THÊM
- [ ] Migration: thêm cột `github_repo_url` vào bảng `games` + field vào `Game` entity
- [ ] Game submit form: ô nhập link repo thay vì upload zip (giống marketplace source_code)
- [ ] Verify owner cho game repo (tái dùng logic của marketplace: owner khớp + không fork)
- [ ] Auto-pull game repo → clone → scan → snapshot (dùng chung Source Processing Service)

### GIỮ LẠI
- Asset upload (StorageRouter, FileType.asset) — không đổi
- Game media (thumbnail/screenshot/video) — vẫn upload qua proxy StorageRouter
- Virus scan — nhưng đổi nguồn: scan thư mục đã clone, không phải zip

> ⚠️ Lưu ý quan trọng về entity:
> - `MarketplaceItem` ĐÃ có `githubRepoUrl` (dùng verify owner) → giờ thành nguồn pull code.
> - `Game` CHƯA có `githubRepoUrl` — chỉ có `fileUrl` (link game.zip cũ).
>   → **CẦN migration thêm cột `github_repo_url` vào bảng `games`** + field vào entity.
> - `fileUrl` của Game (trỏ game.zip) → deprecate sau khi chuyển sang repo.

---

## 1. GitHub OAuth — nâng scope để clone private repo

### Hiện tại
- Scope: `read:user, user:email` → chỉ đọc public metadata, **không clone được private**

### Cần đổi
- Scope: `read:user, user:email, repo` → token đọc được private repo của chính developer
- Clone: `git clone https://{decrypted_token}@github.com/{owner}/{repo}.git`
- Token là của developer (owner) → không cần admin vào repo, không cần email, không collaborator

### Tasks
- [ ] Cập nhật scope trong frontend OAuth redirect URL
- [ ] Cập nhật `docs/githubOauth.md` (mục 6 — scope)
- [ ] Re-link flow: user đã link với scope cũ → cần re-authorize để có `repo` scope
- [ ] Lưu ý bảo mật: token giờ có quyền đọc TẤT CẢ private repo của user → log rõ, audit khi dùng

### Lưu ý policy của bạn (verify owner khớp account đăng ký)
- Đã có trong code: `response.owner.login === users.github_username` + `fork === false`
- Giữ nguyên — đây là cổng đầu tiên trước khi clone

---

## 2. Source Processing Service (mở rộng python-face-service)

Service Python hiện có (Docker, port 8001) được mở rộng thêm các endpoint xử lý source.

### Endpoints mới (đề xuất)
```
POST /source/clone        → git clone repo (token developer) về thư mục tạm
POST /source/scan         → ClamAV scan toàn bộ source đã clone
POST /source/snapshot     → tính commit SHA + hash từng file + hash toàn bộ → trả về
POST /source/fingerprint  → (giai đoạn 2) tính fingerprint cho similarity check
POST /source/similarity   → (giai đoạn 2) so fingerprint mới với DB → trả % trùng
```

### Luồng xử lý (CHỈ áp dụng cho CODE: game + marketplace source_code)
```
Backend Java (submit code — có githubRepoUrl)
  → verify owner (owner khớp account + không fork)
  → POST /source/clone { repoUrl, token, commitSha? }
  → POST /source/scan  → ClamAV (sạch/nhiễm)
  → POST /source/snapshot → { commitSha, fileHashes, bundleHash, clonedAt }
  → (giai đoạn 2) POST /source/similarity → flag nếu trùng cao
  → AI review (xem ai-review-plan.md)
  → lưu kết quả vào DB → chuyển trạng thái review
```

> **ASSET (3D/audio/sprite) KHÔNG đi luồng này** — asset upload file thẳng qua
> StorageRouter (FileType.asset), vẫn virus scan zip nhưng KHÔNG clone/snapshot/similarity
> (asset không phải code, không có repo, không tranh chấp source theft kiểu code).

### Tasks giai đoạn 1
- [ ] Thêm `git` vào Dockerfile python-face-service
- [ ] `source_service.py`: clone (shallow `--depth 50` để có ít history), cleanup temp
- [ ] Tích hợp ClamAV (đã có container clamav trong docker-compose)
- [ ] `/source/snapshot`: commit SHA hiện tại + SHA-256 mỗi file + bundle hash
- [ ] Backend `SourceProcessingClient.java` gọi service (giống FaceServiceClient)

---

## 3. Snapshot bất biến (anti-theft giai đoạn 1)

Mục đích: **bằng chứng nền tảng đã due diligence** + xác định chính xác code đã bán.
KHÔNG chống collusion, nhưng giảm trách nhiệm pháp lý của nền tảng.

### Bảng mới: `source_snapshots`
```sql
CREATE TABLE source_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_item_id UUID REFERENCES marketplace_items(id),
    game_id         UUID REFERENCES games(id),
    repo_url        TEXT NOT NULL,
    commit_sha      VARCHAR(40) NOT NULL,   -- commit tại thời điểm submit
    bundle_hash     VARCHAR(64) NOT NULL,   -- SHA-256 toàn bộ source
    file_hashes     JSONB,                  -- { "path": "sha256", ... }
    submitted_by    UUID NOT NULL REFERENCES users(id),
    cloned_at       TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

> Mỗi submit = 1 snapshot bất biến. Khi tranh chấp: tra snapshot → biết ai submit
> code nào, lúc nào, commit gì. `commit_sha` + history GitHub = bằng chứng tác giả gốc
> (kẻ copy thường chỉ có 1 commit dump, không có history thật).

### Tasks
- [ ] Migration tạo bảng `source_snapshots`
- [ ] Entity + repository
- [ ] Gọi `/source/snapshot` sau clone → lưu snapshot
- [ ] Audit log: ghi mọi snapshot vào `audit_logs`

---

## 4. AI Similarity Check (anti-theft giai đoạn 2 — chống đạo nhái chủ động)

> Chưa lên plan chi tiết — placeholder. Đây là phần "triệt để" nhất ở lớp kỹ thuật:
> chặn đạo nhái NGAY lúc submit, không đợi báo cáo.

### Ý tưởng
```
B submit source X
  → tính fingerprint X (hash hàm / token shingle / MinHash / AST hash)
  → so với fingerprint TẤT CẢ source đã submit trước
  → trùng > ngưỡng với source của A (submit trước) → flag "nghi đạo nhái"
  → chặn / chuyển admin review thủ công
```

### Cần quyết định sau (khi lên plan AI)
- [ ] Thuật toán fingerprint: token-based (Moss-style) vs AST-based vs embedding (CodeBERT...)
- [ ] Ngưỡng similarity → flag vs block
- [ ] Lưu fingerprint ở đâu (pgvector? đã có cho face)
- [ ] Xử lý false positive (thư viện chung, boilerplate Godot)

---

## 5. Review flow (AI review)

> Sau clone + scan sạch → AI đánh giá → tạo report đề xuất → **admin quyết định cuối**.
>
> **→ Plan chi tiết: [ai-review-plan.md](ai-review-plan.md)**

Tóm tắt:
- AI = đề xuất, KHÔNG phán quyết. Admin luôn review cuối.
- Multimodal: code + frame video (ffmpeg cắt frame) + ảnh.
- 4 tiêu chí: chất lượng code, media khớp game, NSFW/policy, mô tả đúng sự thật.
- Self-host: CLIP (media match) + NSFW classifier làm trước; rule-based cho code;
  LLM fallback cho phần suy luận (chất lượng code, mô tả phóng đại).
- Bảng mới `ai_review_reports` (bảng `ai_reports` cũ thiên định giá, không khớp).

---

## 6. Dispute Resolution — KHÔNG ESCROW, dùng cưỡng chế hoàn trả + danh tính

> **Tại sao bỏ escrow:** giam tiền gây thiệt cho người bán thật (họ muốn rút sớm),
> và dispute bản quyền không giới hạn trong window cố định. Thay vào đó: **trả tiền ngay**,
> rồi dùng **KYC/FaceID + điều khoản cưỡng chế hoàn trả** để truy trách nhiệm khi có tranh chấp.
>
> Vai trò: **A = người bán (bị tố)**, **B = người báo cáo**.

### 6.1 Hợp đồng Indemnity (bổ sung vào contract bán source)
```
Người bán (A) ký cam kết khi bán source:
  - "Tôi là tác giả gốc / có toàn quyền sở hữu hợp pháp"
  - "Nếu có khiếu nại bản quyền hợp lệ → trong 5 NGÀY tôi phải HOÀN TRẢ đủ
     số tiền đã nhận; nền tảng dùng tiền đó hoàn cho bên bị hại"
  - "Cố tình không hoàn → nền tảng có quyền kiện tụng (dùng KYC/giấy tờ/FaceID),
     ban tài khoản + bank account của tôi"
```
→ Indemnity VÔ THỜI HẠN (không như escrow window). KYC + FaceID đảm bảo truy được A là ai thật.

### 6.2 Cây quyết định dispute (policy đã chốt)
```
B báo cáo "A đánh cắp source của tôi"
│  → thu thập bằng chứng: snapshot của A (đã có khi submit)
│                       + B cung cấp repo của mình → hệ thống clone → so 2 history
│
├─ TH1: commit history + thời gian 2 bên GẦN GIỐNG NHAU
│   → KHÔNG auto-xử (vì A có thể đã clone full repo B kèm history)
│   → LUÔN chuyển admin review thủ công
│   → nếu admin kết luận do B không bảo mật code → B chịu, A vô can
│
├─ TH2: A cao hơn hẳn B (A có history thật, B chỉ 1 commit dump / mỏng)
│   → B báo cáo SAI (vu cáo)
│   → trừ điểm B; spam report > 3 lần → ban bank account B
│   → lưu FaceID + CCCD + bank vào BẢNG BANNED → B không đăng ký/thêm bank lại được
│
└─ TH3: A thật sự đánh cắp của B (kể cả nghi collusion)
    → A phải nạp lại đủ tiền đã nhận trong 5 NGÀY
    → tiền đó hoàn cho B
    → A cố tình không trả:
        → admin kiện tụng (manual) — có sẵn KYC + giấy tờ + FaceID
        → ban tài khoản + bank account A (lưu vào bảng banned)
        → ADMIN BACKSTOP: admin tự bỏ tiền hoàn cho B (cuối cùng)
```

### 6.3 So sánh bằng chứng (TH phán xử)
```
Bằng chứng A: snapshot lúc submit (commit SHA + full history + timestamp)
Bằng chứng B: repo B cung cấp khi tố → hệ thống clone → trích history
So sánh:
  - Commit AUTHOR gốc + commit DATE sớm nhất (không chỉ độ dài history)
  - Nếu A clone repo B → author/date gốc vẫn là B → lộ A copy
  - history "1 commit dump" = dấu hiệu đạo nhái mạnh
```

### Tasks
- [ ] Điều khoản indemnity + "hoàn trả 5 ngày" vào template hợp đồng bán source
- [ ] Bảng `disputes` (reporter B, reported_seller A, item, reason, evidence, status, resolution)
- [ ] API: B tạo dispute, admin xử lý theo cây quyết định
- [ ] Auto-suspend sản phẩm của A khi có dispute (gỡ khỏi store ngay)
- [ ] Clone repo B khi tố → so history với snapshot A
- [ ] Reputation/điểm: trừ điểm B khi vu cáo, đếm spam report
- [ ] Cưỡng chế hoàn trả: tạo "debt" cho A, đếm 5 ngày, hoàn cho B từ tiền A nạp
- [ ] Admin backstop: admin chi tiền hoàn cho B khi A không trả (ghi audit)
- [ ] Notification (bảng đã có) cho A, B, admin — KHÔNG email

---

## 7. Bảng Banned — chặn đăng ký lại đa tầng (FaceID + CCCD + Bank)

> Khi ban A (đạo nhái) hoặc B (spam report > 3 lần): chặn họ tạo tài khoản mới
> hoặc thêm bank account mới bằng cách lưu BLACKLIST đa tầng.

### Bảng mới: `banned_identities`
```sql
CREATE TABLE banned_identities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),   -- tài khoản bị ban
    face_embedding  vector(128),                 -- FaceID (Tier 1) — chặn đăng ký lại
    kyc_id_number   TEXT,                         -- số CCCD/passport (Tier 2) — đã hash/encrypt
    bank_account    TEXT,                         -- số tài khoản ngân hàng — đã hash/encrypt
    reason          TEXT NOT NULL,                -- 'copyright_theft' | 'spam_report' | ...
    banned_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON banned_identities USING ivfflat (face_embedding vector_cosine_ops);
```

### Chặn khi đăng ký / thêm bank lại
```
Đăng ký mới (face verify Tier 1):
  → so face với banned_identities.face_embedding (cosine)
  → match → chặn "danh tính này đã bị cấm"

KYC mới (Tier 2):
  → so kyc_id_number → match → chặn

Thêm bank account:
  → so bank_account → match → chặn
```

### Tasks
- [ ] Migration tạo bảng `banned_identities`
- [ ] Khi ban: copy face_embedding (từ face_embeddings) + kyc + bank vào banned
- [ ] Hook vào face verify (Tier 1): check banned trước khi register
- [ ] Hook vào KYC confirm (Tier 2): check CCCD banned
- [ ] Hook vào thêm bank account: check bank banned
- [ ] Tận dụng bảng `banned_ips` đã có (cùng nhóm Security)

---

## 8. Lộ trình triển khai (thứ tự ưu tiên)

| Giai đoạn | Nội dung | Lý do ưu tiên |
|---|---|---|
| **P1** | GitHub scope `repo` + clone private + virus scan | Mở khóa luồng cơ bản |
| **P1** | Snapshot (commit SHA + hash + history) | Bằng chứng phán xử dispute, nhẹ |
| **P2** | Indemnity contract (hoàn trả 5 ngày) | Cơ sở pháp lý cưỡng chế hoàn trả |
| **P2** | Dispute workflow (cây quyết định TH1/2/3) | Vận hành xử lý tố cáo |
| **P2** | Bảng `banned_identities` (face+CCCD+bank) | Chặn đăng ký lại sau ban |
| **P3** | AI similarity check | Chống đạo nhái chủ động (chờ plan AI) |
| **P3** | AI review service | Tự động đánh giá (chờ plan AI) |

> **Khuyến nghị:** P1 + P2 trước. P2 (pháp lý + dispute) quan trọng hơn P3 (AI) cho việc
> "bảo vệ nền tảng khỏi tranh chấp" — vì AI không chống được collusion, chỉ danh tính
> thật (KYC/FaceID) + cưỡng chế hoàn trả mới giải quyết được.

---

## 9. Những gì ĐÃ CÓ (tái sử dụng)

| Có sẵn | Dùng cho |
|---|---|
| GitHub OAuth + verify owner | Cổng verify trước clone (chỉ cần nâng scope) |
| ClamAV container | Virus scan source sau clone |
| `python-face-service` + Docker | Mở rộng thành source processing |
| pgvector | Lưu fingerprint cho similarity (giai đoạn 2) |
| Tier 2 KYC | Danh tính thật người bán → indemnity contract có hiệu lực + truy A vô thời hạn |
| Tier 1 FaceID (`face_embeddings`) | Copy sang `banned_identities` để chặn đăng ký lại |
| Bảng `notifications` | Thông báo dispute cho A/B/admin, KHÔNG qua email |
| Bảng `audit_logs` | Ghi vết mọi bước dispute + admin backstop |
| Bảng `banned_ips` (Security) | Cùng nhóm với `banned_identities` mới |
| Contract system | Thêm điều khoản indemnity + hoàn trả 5 ngày |
| Wallet/transactions | Tạo "debt" cho A, hoàn tiền cho B |
| `external_publishes` (entity trống) | Publish ra store ngoài (tương lai) |
