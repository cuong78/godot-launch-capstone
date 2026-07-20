# 06. Plagiarism Detection (Module thứ 5 của AI Review)

> Bối cảnh: [05. AI Review](05-ai-review-plan.md) có 4 tiêu chí (chất lượng code, media
> khớp game, NSFW, mô tả đúng sự thật) — cả 4 đều là kiểm tra **nội tại** (game này có
> tự nhất quán không), KHÔNG có bước nào so sánh với sản phẩm KHÁC trong hệ thống.
> → **Không phát hiện được đạo văn/đạo nhái**, chỉ dựng lại được bằng chứng SAU KHI
> đã có người tố cáo (qua `SourceCommit` + `Dispute`).
>
> Module này bổ sung khả năng **chủ động phát hiện** giống nhau giữa 2 sản phẩm,
> chạy ngay lúc submit — không chờ ai report.
>
> Vị trí trong luồng: nối tiếp bước "AI review" trong [00. Tổng quan nghiệp vụ](00-flow-overview.md) #2 (push game)
> — chạy song song/sau 4 tiêu chí hiện có, cùng 1 lần submit.

---

## 0. Phân biệt với những gì ĐÃ CÓ (tránh làm trùng)

| Đã có | Vai trò | Có phát hiện đạo văn không |
|---|---|---|
| `AiReviewReport` (4 tiêu chí) | Game này có tự nhất quán, sạch, đúng mô tả không | Không — không so với sản phẩm khác |
| `SourceCommit` + `Dispute` | Dựng lại timeline SAU KHI có người tố cáo | Không tự động — chỉ chạy khi **đã có** Dispute, và chỉ đối chiếu context nội tại (code có khớp mô tả tại thời điểm đó không), không so 2 game với nhau |
| **Module này (mới)** | **Chủ động** so sánh sản phẩm mới nộp với **toàn bộ kho đã có**, chạy lúc submit | **Có** — đây là mục đích chính |

Module này không thay thế 2 cái trên — nó là lớp phòng ngừa **trước khi** cần tới Dispute. Nếu phát hiện giống nhau bất thường ngay lúc submit, admin có thể chặn sớm, không cần chờ nạn nhân tự phát hiện và report.

---

## 1. Ba câu hỏi cần trả lời rõ (theo đúng yêu cầu review)

### 1.1 Phạm vi check (scope)

**Đối tượng so sánh**: game/asset mới submit ↔ **toàn bộ** game/asset đã tồn tại trong hệ thống (không giới hạn theo category, vì đạo nhái có thể đổi tên/đổi thể loại để né).

**Loại nội dung được đưa vào scope**:
| Loại | Vào scope? | Vì sao |
|---|---|---|
| Source code (`.gd`, `.cs`, cấu trúc scene) | Có | Trọng tâm — đạo nhái code là rủi ro pháp lý lớn nhất |
| Asset media (ảnh, model, audio marketplace) | Có (giai đoạn 2) | Asset cũng bị đạo nhái (copy model 3D, texture) |
| Mô tả/text | Không (giai đoạn 1) | Rủi ro thấp hơn, mô tả trùng không chứng minh được đạo code |
| Game đã bị `rejected`/gỡ khỏi hệ thống | Có, vẫn giữ trong scope so sánh | Đạo nhái có thể re-submit sau khi bản gốc bị gỡ |

**Thời điểm chạy**: lúc submit (cùng lúc với 4 tiêu chí AI review hiện có) — **không** chạy lại định kỳ cho toàn bộ kho (tốn kém, không cần thiết vì mỗi game chỉ submit vài lần).

### 1.2 Nội dung check (so sánh cái gì, bằng cách nào)

Không so sánh code dạng text thô (dễ né bằng đổi tên biến/format lại) — dùng **embedding vector** để bắt được sự tương đồng về cấu trúc/logic, giống hệt pattern đã dùng cho `FaceEmbedding` (128-dim, pgvector, ivfflat index):

```
Code mới submit
  → sample thông minh (cây thư mục + file chính, TÁI DÙNG cách sample của
    05-ai-review-plan.md mục 6.1 — không gửi cả repo)
  → CodeBERT (hoặc tương đương) → vector embedding
  → so cosine similarity với TOÀN BỘ embedding đã lưu trong kho
  → top-N kết quả giống nhất → nếu vượt ngưỡng → flag
```

Đây chính là phần mở rộng P3 trong `05-ai-review-plan.md`: CodeBERT embedding → lưu pgvector → phục vụ similarity. Module này hiện thực hóa nhánh chống đạo nhái đó.

**Với Asset (giai đoạn 2)**: tái dùng CLIP embedding đã có sẵn cho media-match (tiêu chí 2 của AI review) — so ảnh/model mới với toàn bộ ảnh đã lưu, cùng cơ chế vector similarity.

### 1.3 Ngưỡng vi phạm (threshold)

Không dùng 1 ngưỡng nhị phân duy nhất (giống/không giống) — dùng **3 vùng**, giống cách `AiRecommendation` đã phân approve/review/reject:

| Similarity score | Ý nghĩa | Hành động |
|---|---|---|
| < 70% | Không đáng ngờ | Không flag, submit tiếp tục bình thường |
| 70% – 90% | Đáng ngờ — có thể trùng do dùng chung template/plugin Godot phổ biến (false positive dễ xảy ra) | Flag `review`, admin xem cụ thể phần nào giống, tự quyết định |
| > 90% | Rất đáng ngờ — gần như chắc chắn copy | Flag `reject` đề xuất, đính kèm bằng chứng (game nào bị nghi giống, % giống) cho admin xem — **admin vẫn quyết định cuối**, không auto-reject |

Ngưỡng cụ thể (70/90) là điểm khởi đầu — cần tinh chỉnh dựa trên dữ liệu thật sau khi chạy thử, theo kế hoạch chất lượng ở mục 14 của `05-ai-review-plan.md`.

**Xử lý false positive quan trọng**: nhiều game Godot dùng chung boilerplate (player controller mẫu, plugin phổ biến từ Asset Library chính thức của Godot) → sẽ luôn có % giống nền nhất định. Threshold 70% ở vùng "review" (không tự reject) chính là để admin lọc trường hợp này, tránh chặn oan.

---

## 2. Entity (thiết kế — CHƯA implement)

### `CodeEmbedding` — vector đại diện cho 1 lần submit

```java
@Entity
@Table(name = "code_embeddings")
public class CodeEmbedding {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    // Vector CodeBERT (hoặc model tương đương) — chiều cụ thể tùy model chọn
    // (giống FaceEmbedding: tách bảng riêng vì cần index ivfflat chuyên cho
    // cosine similarity, không gộp vào Game).
    @Column(name = "embedding", columnDefinition = "vector(768)")
    private PGvector embedding;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
```

Không unique theo `game_id` (khác `FaceEmbedding`) — 1 game có thể re-submit nhiều lần (nhiều version), mỗi lần submit là 1 embedding mới để so sánh, giữ lại lịch sử.

### `PlagiarismFlag` — kết quả phát hiện giống nhau

```java
@Entity
@Table(name = "plagiarism_flags")
public class PlagiarismFlag {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;              // game MỚI submit, bị nghi ngờ

    @ManyToOne(optional = false)
    @JoinColumn(name = "matched_game_id", nullable = false)
    private Game matchedGame;       // game ĐÃ CÓ, giống với game trên

    @Column(name = "similarity_score", nullable = false)
    private Float similarityScore;  // 0.0 - 1.0, cosine similarity

    @Enumerated(EnumType.STRING)
    private PlagiarismSeverity severity;   // review | reject (theo ngưỡng mục 1.3)

    @Column(name = "reviewed_by_admin", nullable = false)
    private boolean reviewedByAdmin = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
```

Tách riêng khỏi `AiReviewReport.flags` (JSONB tự do hiện có) vì đây là quan hệ **game↔game** có cấu trúc rõ (2 FK), cần query được ("game nào từng bị nghi giống game X") — JSONB tự do không làm được việc này hiệu quả.

### Enum `PlagiarismSeverity`
```java
public enum PlagiarismSeverity {
    review,   // 70-90%
    reject    // >90%
}
```

---

## 3. Luồng tích hợp (thiết kế — CHƯA implement)

```
Developer submit game
  → clone → virus scan → SẠCH
  → snapshot (SourceSnapshot) + ghi SourceCommit
  → AI REVIEW (4 tiêu chí hiện có, 05-ai-review-plan.md)
  → PLAGIARISM CHECK (module này):
      1. Sample code (tái dùng cách sample mục 6.1 trong 05-ai-review-plan.md)
      2. CodeBERT embedding → lưu CodeEmbedding
      3. Query top-N similarity trong pgvector (toàn bộ CodeEmbedding đã có)
      4. Với mỗi kết quả > 70% → tạo PlagiarismFlag
  → ADMIN dashboard: hiện AI report (4 tiêu chí) + Plagiarism flags (nếu có)
      → admin xem % giống + game bị nghi giống + tự quyết định
      → admin APPROVE / REJECT / yêu cầu giải trình     ← QUYẾT ĐỊNH CUỐI
```

Nguyên tắc giữ nguyên như AI review chính: **AI chỉ đề xuất, không tự động reject**. Kể cả similarity 99%, vẫn chỉ là flag cho admin xem — có thể 2 game hợp pháp dùng chung 1 template được cấp phép (asset store chính thức của Godot).

---

## 4. Tasks tổng hợp

### Giai đoạn 1 (code, ưu tiên — theo đúng bài toán hội đồng hỏi)
- [ ] Chọn model embedding code (CodeBERT hoặc tương đương nhẹ hơn, cân nhắc chi phí self-host)
- [ ] Entity `CodeEmbedding` + `PlagiarismFlag` + enum `PlagiarismSeverity`
- [ ] Migration tạo 2 bảng + index `ivfflat` cho `code_embeddings.embedding`
- [ ] Endpoint `/ai/plagiarism-check` (python service) — nhận code sample, trả embedding + top-N similarity
- [ ] Backend: gọi endpoint sau AI review, lưu `PlagiarismFlag` nếu vượt ngưỡng 70%
- [ ] Admin dashboard: hiện danh sách flag (game bị nghi giống + % + xem 2 code side-by-side)

### Giai đoạn 2 (mở rộng sang Asset)
- [ ] Tái dùng CLIP embedding đã có (media-match) để so ảnh/model asset mới với kho ảnh đã có
- [ ] `PlagiarismFlag` mở rộng nhận `asset_id` thay vì chỉ `game_id` (hoặc tách entity riêng nếu cấu trúc khác nhau nhiều)

### Giai đoạn 3 (tinh chỉnh)
- [ ] Tinh chỉnh ngưỡng 70/90 dựa dữ liệu thật
- [ ] Xử lý false positive: nhận diện boilerplate/plugin phổ biến của Godot (whitelist các template chính thức) để không flag nhầm
- [ ] Cân nhắc so sánh cả với source bên ngoài hệ thống (GitHub public) — phạm vi lớn hơn, chi phí cao hơn, để sau

---

## 5. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| False positive: nhiều game dùng chung boilerplate Godot phổ biến | Ngưỡng "review" (70-90%) không tự reject — admin xem lý do giống nhau trước khi quyết định |
| Né bằng cách đổi tên biến/format code | Dùng embedding (CodeBERT) thay vì so text thô — bắt được tương đồng cấu trúc/logic, không chỉ ký tự |
| Chi phí tính embedding cho TOÀN BỘ kho mỗi lần submit mới | Chỉ tính embedding 1 lần lúc submit, lưu lại — so sánh là truy vấn vector (nhanh, không tính lại) |
| Kho càng lớn, query similarity càng chậm | ivfflat index (đã dùng cho FaceEmbedding) tối ưu approximate nearest neighbor — chấp nhận được ở quy mô capstone |
| Đạo nhái từ NGOÀI hệ thống (GitHub public, không phải từ GodotLaunch) | Ngoài phạm vi giai đoạn 1 — chỉ so trong nội bộ kho GodotLaunch trước |

---

## 6. Những gì ĐÃ CÓ (tái sử dụng)

| Có sẵn | Dùng cho |
|---|---|
| pgvector + pattern `FaceEmbedding` | Mẫu thiết kế bảng embedding + ivfflat index cho `CodeEmbedding` |
| Cách sample code (`05-ai-review-plan.md` mục 6.1) | Input cho bước tính embedding — không gửi cả repo |
| CLIP pipeline (media-match) | Tái dùng cho Plagiarism giai đoạn 2 (so ảnh/asset) |
| `python-face-service` (đã mở rộng cho AI review) | Thêm endpoint `/ai/plagiarism-check` vào cùng service |
| Admin dashboard AI report | Mở rộng hiện thêm Plagiarism flags cạnh 4 tiêu chí hiện có |
