# Conceptual ERD — GodotLaunch (đầy đủ 36 bảng)

> Dùng để VẼ conceptual diagram. Mọi cardinality dưới đây **suy từ FK/constraint thật trong `V1__init_schema.sql`**, không phỏng đoán.
> Conceptual chia theo **5 view nghiệp vụ**. Một entity có thể xuất hiện ở nhiều view (đúng tinh thần conceptual) — entity dùng chung tô **mờ/xám**, entity trọng tâm của view tô **đậm**.

---

## 0. Quy ước Crow's Foot (đọc ở đầu phía thực thể)

| Ký hiệu | Tên | Nghĩa | Suy từ schema |
|---|---|---|---|
| `||` | one and only one | bắt buộc, đúng 1 | FK cột **NOT NULL** |
| `o|` | zero or one | tùy chọn, tối đa 1 | FK cột **nullable**, hoặc có **UNIQUE** phía con |
| `o<` | zero or many | tùy chọn, nhiều | đầu "con" mặc định |
| `|<` | one or many | bắt buộc ≥1, nhiều | **chỉ khi nghiệp vụ ép tối thiểu 1** (schema không tự suy ra được) |

> **Lưu ý quan trọng:** SQL FK chỉ biểu diễn được *tối đa*, không ép *tối thiểu ≥1* ở phía con → trong DB này **không có quan hệ nào dùng `|<`**. Nếu giảng viên/nghiệp vụ yêu cầu "A bắt buộc có ≥1 B" thì bạn tự đổi `o<`→`|<` ở quan hệ đó (ghi rõ đó là ràng buộc nghiệp vụ).
> Cách viết quan hệ: **Cha `cardinality` ──động từ──< `cardinality` Con**.

---

## 1. Bố cục 5 view + vị trí trên khung

| View | Trung tâm | TL | TR | BL | BR |
|---|---|---|---|---|---|
| **1. Developer** | Game | Developer | Contract, ExternalPublish, StoreDownloadStat | Category, Tag, GameTag, GameVersion, Media, SourceSnapshot | Asset, AssetTag, Wallet, Transaction, WithdrawalRequest |
| **2. Customer** | Order | Customer | Payment, Transaction | CartItem, Game, Asset *(mờ)* | Review |
| **3. Community** | CommunityChat | User | ChatReaction | ChatMessage | ChatMedia, Game *(mờ)* |
| **4. Admin** | Admin (User) | Game, AiReviewReport | Contract, WithdrawalRequest | Dispute | PlatformSettings, Notification |
| **5. Security/Ops** | User | FaceEmbedding | BannedIdentity, BannedIp | UserIpLog | StorageAccount, StorageBucket, StorageRouting |

> `User` = một entity duy nhất, hiện ra dưới 3 **vai** (Developer / Customer / Admin) tùy view. `Role` gắn với User (`User ||──phân quyền──< o< Role`? — không: 1 user có 1 role → xem §7).

---

## 2. VIEW 1 — DEVELOPER (đưa sản phẩm → ký kết → nhận tiền)

**Thứ tự vẽ:** Developer → Game → (version/media/snapshot/tag) → Contract → Publish → Stats; nhánh Asset; nhánh tiền (Wallet → Transaction → Withdrawal).

| # | Quan hệ (Cha — Con) | Cha | Con | Căn cứ (cột FK) |
|---|---|---|---|---|
| 1 | Developer **tạo** Game | `||` | `o<` | games.creator_id NOT NULL |
| 2 | Category **phân loại** Game | `o|` | `o<` | games.category_id nullable |
| 3 | Game **gắn** GameTag | `||` | `o<` | game_tags.game_id (PK) |
| 4 | Tag **gắn** GameTag | `||` | `o<` | game_tags.tag_id (PK) |
| 5 | Game **có** GameVersion | `||` | `o<` | game_versions.game_id NOT NULL |
| 6 | Game **có** Media | `||` | `o<` | media.game_id (arc) |
| 7 | Game **sinh** SourceSnapshot | `||` | `o<` | source_snapshots.game_id |
| 8 | Game **ký** Contract | `||` | `o<` | contracts.game_id NOT NULL |
| 9 | Game **xuất bản** ExternalPublish | `||` | `o<` | external_publishes.game_id NOT NULL |
| 10 | GameVersion **dùng cho** ExternalPublish | `||` | `o<` | external_publishes.game_version_id NOT NULL |
| 11 | Game **thống kê** StoreDownloadStat | `||` | `o<` | store_download_stats.game_id NOT NULL |
| 12 | Developer(seller) **bán** Asset | `||` | `o<` | assets.seller_id NOT NULL |
| 13 | Category **phân loại** Asset | `o|` | `o<` | assets.category_id nullable (FK SET NULL) |
| 14 | Asset **gắn** AssetTag | `||` | `o<` | asset_tags.asset_id (PK) |
| 15 | Tag **gắn** AssetTag | `||` | `o<` | asset_tags.tag_id (PK) |
| 16 | Asset **có** Media | `||` | `o<` | media.asset_id (arc) |
| 17 | Developer **sở hữu** Wallet | `||` | `o|` | wallets.user_id NOT NULL + **UNIQUE** |
| 18 | Wallet **ghi** Transaction | `||` | `o<` | transactions.wallet_id NOT NULL |
| 19 | Wallet **yêu cầu** WithdrawalRequest | `||` | `o<` | withdrawal_requests.wallet_id NOT NULL |

> **Category dùng chung cho cả Game lẫn Asset** (`games.category_id` + `assets.category_id` cùng → `categories`). → Trên diagram, box **Category** có 2 đường "phân loại": một tới Game (#2), một tới Asset (#13).

> **GameTag / AssetTag** = associative entity (bảng nối M:N). PK kép (game_id, tag_id) → ở conceptual có thể vẽ rút gọn `Game >──< Tag`, hoặc giữ box associative như trên (đưa-vào-hết theo yêu cầu).

---

## 3. VIEW 2 — CUSTOMER (chọn → mua → trả tiền → đánh giá)

**Thứ tự vẽ:** Customer → CartItem → Order → Payment → Transaction; nhánh Review.

| # | Quan hệ (Cha — Con) | Cha | Con | Căn cứ |
|---|---|---|---|---|
| 1 | Customer **bỏ vào** CartItem | `||` | `o<` | cart_items.user_id NOT NULL |
| 2 | Game **được thêm vào** CartItem | `o|` | `o<` | cart_items.game_id nullable (arc) |
| 3 | Asset **được thêm vào** CartItem | `o|` | `o<` | cart_items.asset_id nullable (arc) |
| 4 | Customer(buyer) **đặt** Order | `||` | `o<` | orders.buyer_id NOT NULL |
| 5 | Game **được mua qua** Order | `o|` | `o<` | orders.game_id nullable (arc) |
| 6 | Asset **được mua qua** Order | `o|` | `o<` | orders.asset_id nullable (arc) |
| 7 | Order **có** Payment | `||` | `o|` | payments.order_id NOT NULL + **UNIQUE(order_id)** |
| 8 | Order **liên kết** Transaction | `o|` | `o<` | orders.transaction_id nullable |
| 9 | Order **dẫn tới** Review | `||` | `o<` | reviews.order_id NOT NULL |
| 10 | Customer **viết** Review | `||` | `o<` | reviews.user_id NOT NULL |
| 11 | Game **được** Review | `o|` | `o<` | reviews.game_id nullable (arc) |
| 12 | Asset **được** Review | `o|` | `o<` | reviews.asset_id nullable (arc) |

> CartItem/Order/Review đều **exclusive arc** game XOR asset (CHECK `chk_*_target`) → mỗi cái có 2 quan hệ nhánh tới Game và Asset, đều `o|` phía cha vì cột nullable.
> UNIQUE: `uq_order_marketplace(buyer_id, asset_id)`, `uq_review_item(user_id, asset_id)`, `uq_cart_item(user_id, asset_id)` — 1 customer chỉ 1 dòng/asset.

---

## 4. VIEW 3 — COMMUNITY (cộng đồng, thảo luận)

**Thứ tự vẽ:** User → CommunityChat → (reply tự thân / theo Game) → ChatMedia, ChatReaction; nhánh ChatMessage (1-1).

| # | Quan hệ (Cha — Con) | Cha | Con | Căn cứ |
|---|---|---|---|---|
| 1 | User(sender) **đăng** CommunityChat | `||` | `o<` | community_chats.sender_id NOT NULL |
| 2 | Game **có thảo luận** CommunityChat | `o|` | `o<` | community_chats.game_id nullable (null = global) |
| 3 | CommunityChat **trả lời** CommunityChat | `o|` | `o<` | community_chats.parent_message_id nullable (self-FK) |
| 4 | CommunityChat **chia sẻ lại** CommunityChat | `o|` | `o<` | community_chats.original_chat_id nullable (self-FK) |
| 5 | CommunityChat **đính kèm** ChatMedia | `||` | `o<` | chat_media.chat_id NOT NULL |
| 6 | CommunityChat **nhận** ChatReaction | `||` | `o<` | chat_reactions.chat_id NOT NULL |
| 7 | User **thả** ChatReaction | `||` | `o<` | chat_reactions.user_id NOT NULL |
| 8 | User(sender) **gửi** ChatMessage | `||` | `o<` | chat_messages.sender_id NOT NULL |
| 9 | User(recipient) **nhận** ChatMessage | `||` | `o<` | chat_messages.recipient_id NOT NULL |

> ChatReaction có **UNIQUE(chat_id, user_id)** → 1 user 1 reaction/chat. ChatMessage = tin nhắn riêng 1-1 (khác CommunityChat = chat công khai).

---

## 5. VIEW 4 — ADMIN (kiểm duyệt → phán xử → vận hành)

**Thứ tự vẽ:** Admin ở giữa, tỏa ra các đối tượng bị quản: Game(duyệt), AiReviewReport, Contract, Dispute, Withdrawal, PlatformSettings, Notification.

| # | Quan hệ (Cha — Con) | Cha | Con | Căn cứ |
|---|---|---|---|---|
| 1 | Game **được chấm** AiReviewReport | `o|` | `o<` | ai_review_reports.game_id nullable (arc) |
| 2 | Asset **được chấm** AiReviewReport | `o|` | `o<` | ai_review_reports.asset_id nullable (arc) |
| 3 | Admin(seller) **ký** Contract | `||` | `o<` | contracts.seller_id NOT NULL (admin ký thay platform) |
| 4 | Reporter **mở** Dispute | `||` | `o<` | disputes.reporter_id NOT NULL |
| 5 | ReportedSeller **bị tố** Dispute | `||` | `o<` | disputes.reported_seller_id NOT NULL |
| 6 | Game **bị** Dispute | `||` | `o<` | disputes.game_id NOT NULL |
| 7 | Admin(resolver) **phán xử** Dispute | `o|` | `o<` | disputes.resolved_by nullable |
| 8 | Admin **duyệt** WithdrawalRequest | `o|` | `o<` | withdrawal_requests.processed_by nullable |
| 9 | Admin(verifier) **duyệt** Payment | `o|` | `o<` | payments.verified_by nullable |
| 10 | User(recipient) **nhận** Notification | `||` | `o<` | notifications.recipient_id NOT NULL |
| 11 | User(sender) **gửi** Notification | `||` | `o<` | notifications.sender_id NOT NULL |
| 12 | Admin **quản lý** PlatformSettings | `||` | `o|` | platform_settings: singleton (id=1) |

---

## 6. VIEW 5 — SECURITY / OPS (định danh, chống gian lận, hạ tầng)

**Thứ tự vẽ:** Developer (Face/KYC) + User-chung (Ban/Log) → các bảng định danh/bảo mật; cụm Storage độc lập (Account → Bucket → Routing).

> ⚠️ **Quan trọng — phân biệt vai khi vẽ (nghiệp vụ ≠ FK thuần):** FK đều trỏ `users(id)` không phân role, NHƯNG logic ứng dụng giới hạn ai làm được. Conceptual vẽ theo **nghiệp vụ**, nên:
> - **FaceEmbedding & KYC → neo vào `Developer`** (chỉ developer face-verify/KYC: route `/api/developer/*` + `@PreAuthorize('DEVELOPER','ADMIN')`; là điều kiện trước khi bán hàng — `createAsset` chặn nếu chưa face-verify). Customer chỉ mua → không có.
> - **BannedIdentity / BannedIp / UserIpLog → neo vào `User` chung** (cả developer-seller gian lận LẪN customer-reporter spam đều bị ban; IP log cho mọi role kể cả anonymous).

| # | Quan hệ (Cha — Con) | Cha | Con | Căn cứ |
|---|---|---|---|---|
| 1 | **Developer** **face-verify** FaceEmbedding | `||` | `o|` | face_embeddings.user_id NOT NULL. **One-time**: `FaceVerifyController` chặn verify lần 2 (`if isFaceVerified return`) → mỗi developer tối đa **1** embedding |
| 2 | User **bị chặn (danh tính)** BannedIdentity | `o|` | `o|` | banned_identities.user_id nullable (FK SET NULL). 1 user bị ban → **1** bản ghi blacklist (user đã banned thì không vào lại để bị ban lần 2) |
| 3 | User(related) **liên đới** BannedIp | `o|` | `o|` | banned_ips.related_user_id nullable. 1 user → **1** lần bị chặn IP (chặn rồi không vào lại) |
| 4 | Admin(banned_by) **chặn** BannedIp | `o|` | `o<` | banned_ips.banned_by nullable. 1 admin chặn **nhiều** IP |
| 5 | User **để lại** UserIpLog | `o|` | `o<` | user_ip_logs.user_id nullable (null = anonymous). LOG → 1 user **nhiều** dòng (login/upload/checkout… mỗi lần 1 dòng) |
| 6 | StorageAccount **chứa** StorageBucket | `||` | `o<` | storage_buckets.account_id NOT NULL |
| 7 | StorageBucket **được route bởi** StorageRouting | `o|` | `o<` | storage_routing.bucket_id nullable |

> `banned_ips.ip_address` UNIQUE (1 IP 1 record). `storage_routing` PK = file_type (mỗi loại file route tới 1 bucket).
> FaceEmbedding = mặt **đang hoạt động** (của developer đã verify); còn mặt **đã bị ban** nằm *bên trong* BannedIdentity (cột face_embedding) — 2 thứ khác mục đích.
> **KYC KHÔNG có bảng riêng** → lưu thẳng vào các cột `kyc_*` của bảng `users` (`kyc_verified`, `kyc_full_name`, `kyc_id_number`, `kyc_date_of_birth`, `kyc_address`, `kyc_document_type`, `kyc_verified_at`, `kyc_front_image_url`, `kyc_back_image_url`) + `face_verified`. → Ở conceptual KYC là **THUỘC TÍNH (attribute) của User/Developer**, KHÔNG vẽ box entity riêng.
> Đối lập: `face_embeddings` tách bảng riêng (vector(128), nhiều bản ghi/user) → vẽ box entity. Đó là khác biệt: KYC = attribute 1-1 trong users; FaceEmbedding = entity 1-n tách bảng.

---

## 7. Quan hệ NỀN (xuất hiện ngầm ở mọi view) — Identity

| # | Quan hệ (Cha — Con) | Cha | Con | Căn cứ |
|---|---|---|---|---|
| 1 | Role **phân cho** User | `||` | `o<` | users.role_id NOT NULL |
| 2 | Category **cha-con** Category | `o|` | `o<` | categories.parent_id nullable (self-FK) |

> `User` là **siêu-hub** (gần như mọi bảng FK về users). Ở conceptual, để tránh rối, **không** nối hết về 1 box User trung tâm — thay vào đó tách 3 vai (Developer/Customer/Admin) theo từng view như trên. Role gắn User ở View 5 hoặc một "Identity sub-diagram" nhỏ.

---

## 8. Bản đồ đầy đủ 36 bảng → entity conceptual (độ phủ 100%)

| Bảng (physical) | Entity (conceptual) | View | Loại |
|---|---|---|---|
| users | User (Developer/Customer/Admin) | tất cả | Strong |
| roles | Role | 7 | Strong |
| games | Game | 1 (2,3,4 mờ) | Strong |
| game_versions | GameVersion | 1 | Strong |
| assets | Asset | 1 (2 mờ) | Strong |
| categories | Category | 1,7 | Strong |
| tags | Tag | 1 | Strong |
| game_tags | GameTag | 1 | Associative (M:N) |
| asset_tags | AssetTag | 1 | Associative (M:N) |
| media | Media | 1 | Strong (arc game/asset) |
| source_snapshots | SourceSnapshot | 1 | Strong |
| contracts | Contract | 1,4 | Strong |
| external_publishes | ExternalPublish | 1 | Strong |
| store_download_stats | StoreDownloadStat | 1 | Strong |
| wallets | Wallet | 1 | Strong |
| transactions | Transaction | 1,2 | Strong |
| withdrawal_requests | WithdrawalRequest | 1,4 | Strong |
| cart_items | CartItem | 2 | Associative (arc) |
| orders | Order | 2 | Strong (arc) |
| payments | Payment | 2,4 | Strong |
| reviews | Review | 2 | Strong (arc) |
| community_chats | CommunityChat | 3 | Strong (self-ref) |
| chat_media | ChatMedia | 3 | Weak (của chat) |
| chat_reactions | ChatReaction | 3 | Associative |
| chat_messages | ChatMessage | 3 | Strong |
| ai_review_reports | AiReviewReport | 4 | Strong (arc) |
| disputes | Dispute | 4 | Strong |
| notifications | Notification | 4 | Strong |
| platform_settings | PlatformSettings | 4 | Singleton |
| face_embeddings | FaceEmbedding | 5 | Strong |
| banned_identities | BannedIdentity | 5 | Strong |
| banned_ips | BannedIp | 5 | Strong |
| user_ip_logs | UserIpLog | 5 | Weak (log) |
| storage_accounts | StorageAccount | 5 | Strong |
| storage_buckets | StorageBucket | 5 | Strong |
| storage_routing | StorageRouting | 5 | Associative |

→ **36/36 bảng đều có entity conceptual.** Không bỏ sót.

---

## 9. Mẹo trình bày để 36 entity nhất quán

1. **Entity neo cùng vị trí mọi view:** User/Developer/Customer/Admin luôn **góc trái**; sản phẩm (Game/Asset) luôn **giữa**.
2. **Tô đậm = trọng tâm view, tô mờ/xám = entity khách** (vd Game ở View 2/3/4 vẽ mờ).
3. **Đặt tên quan hệ bằng động từ nghiệp vụ** ("Developer *tạo* Game") — đặc trưng conceptual.
4. **Exclusive arc** (game XOR asset ở CartItem/Order/Review/Media/AiReviewReport): vẽ 2 nhánh `o|` tới Game và Asset, ghi chú "đúng 1".
5. **Self-reference** (Category cha-con, CommunityChat reply/share): vẽ vòng tự thân `o|──o<`.
