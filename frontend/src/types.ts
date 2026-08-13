export interface Asset {
  id: string;
  sellerEmail?: string;
  title: string;
  price: number;
  rating: number;
  reviewedCount: number;
  author: string;
  authorAvatar: string;
  category: string;
  description: string;
  image: string;
  tag: string;
  tagList: string[];
  itemType?: "source_code" | "asset";
  isBestseller?: boolean;
  version?: string;
  lastUpdated?: string;
  details?: {
    tilesCount: string;
    spritesCount: string;
    propsCount: string;
    featuresList: string[];
  };
  screenshots?: string[];
  videoUrl?: string;
  documentation?: string;
  supportedPlatforms?: string;
  webDemoUrl?: string;
}

export interface Project {
  id: string;
  projectName: string;
  version: string;
  date: string;
  status: "LIVE" | "BETA" | "ALPHA";
  engine: string;
  downloads: string;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl: string;
  role?: "user" | "admin" | "developer" | "customer" | "guest";
  roleName?: string;
  status?: string;
  preferredLanguage?: "vi" | "en" | "ja";
  bankName?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
  createdAt?: string;
}

export type ScreenType =
  | "explore"
  | "marketplace"
  | "upload"
  | "path"
  | "dashboard"
  | "detail"
  | "community"
  | "signin"
  | "signup"
  | "admin"
  | "auth-callback"
  | "profile"
  | "community-detail"
  | "author-profile"
  | "checkout"
  | "payment"
  | "payment-qr"
  | "payment-success"
  | "payment-failed"
  | "payment-cancelled"
  | "wallet"
  | "developer-onboarding";

export interface WalletResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt?: string | null;
}

export interface PayoutBalanceResponse {
  accountNumber?: string | null;
  accountName?: string | null;
  currency: string;
  balance: number;
  status: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected' | 'cancelled';

export interface DeveloperWalletSummaryResponse {
  walletId: string;
  developerId: string;
  developerEmail?: string;
  developerFullName?: string;
  currency: string;
  walletBalance: number;
  withdrawableBalance: number;
  restrictedBalance: number;
  availableBalance: number;
  pendingBalance: number;
  totalRevenue: number;
  updatedAt?: string | null;
}

export interface ProductSalesResponse {
  productId: string;
  productType: 'GAME' | 'ASSET';
  title: string;
  thumbnailUrl?: string | null;
  unitsSold: number;
  revenue: number;
}

export interface DeveloperSalesStatsResponse {
  developerId: string;
  developerEmail?: string;
  developerFullName?: string;
  currency: string;
  totalUnitsSold: number;
  totalRevenue: number;
  products: ProductSalesResponse[];
}

export interface TransactionResponse {
  id: string;
  type: string;
  amount: number;
  referenceId?: string;
  createdAt?: string;
  // Số dư ví SAU giao dịch này (running balance tại đúng thời điểm giao
  // dịch xảy ra) — khác với số dư ví HIỆN TẠI (latest) hiển thị đầu trang ví.
  balanceAfter?: number;
}

export interface WithdrawalResponse {
  id: string;
  developerId: string;
  developerFullName?: string;
  developerEmail?: string;
  walletId: string;
  amount: number;
  currency?: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  transferReference?: string;
  payosPayoutId?: string;
  payosReferenceId?: string;
  payosStatus?: string;
  payosCreatedAt?: string;
  status: WithdrawalStatus;
  processedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
  autoPayoutEligibleAt?: string | null;
  heldByDispute: boolean;
}

export interface WithdrawalDetailResponse extends WithdrawalResponse {
  walletBalance: number;
  withdrawableBalance: number;
  restrictedBalance: number;
  availableBalance: number;
  pendingBalance: number;
  totalRevenue: number;
  qrPayload?: string;
  standardQrImageUrl?: string;
  preferredQrImageUrl?: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  note?: string;
}

export interface RejectWithdrawalRequest {
  remark: string;
}

export type AiRecommendation = 'approve' | 'review' | 'reject';

export interface AiReviewFlag {
  type: string;
  severity: string;
  detail: string;
  evidenceIndex?: number;
}

export interface AiReviewReport {
  id: string;
  gameId?: string | null;
  assetId?: string | null;
  marketplaceItemId?: string | null;
  sourceSnapshotId?: string | null;
  commitSha?: string | null;
  codeQualityScore?: number | null;
  mediaMatchScore?: number | null;
  descriptionMatchScore?: number | null;
  tagsMatchScore?: number | null;
  nsfwFlag?: boolean;
  overallRecommendation: AiRecommendation;
  suggestedPrice?: number | null;
  suggestedRevenueSplit?: number | null;
  pricingRationale?: string | null;
  flags?: AiReviewFlag[];
  rawOutput?: any;
  createdAt?: string;
}

export type ReviewProcessStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PlagiarismFlag {
  id: string;
  gameId: string;
  gameTitle: string;
  matchedGameId: string;
  matchedGameTitle: string;
  sourceSnapshotId: string;
  sourceCommitSha?: string | null;
  matchedSourceSnapshotId: string;
  matchedCommitSha?: string | null;
  codeEmbeddingId: string;
  matchedCodeEmbeddingId: string;
  similarityScore: number;
  severity: 'review' | 'reject';
  modelName: string;
  modelVersion: string;
  reviewThreshold: number;
  rejectThreshold: number;
  reviewedByAdmin: boolean;
  createdAt?: string;
}

export interface GameReviewOverview {
  gameId: string;
  sourceSnapshotId?: string | null;
  commitSha?: string | null;
  aiReviewStatus?: ReviewProcessStatus | null;
  aiReviewError?: string | null;
  aiReviewCompletedAt?: string | null;
  plagiarismStatus?: ReviewProcessStatus | null;
  plagiarismError?: string | null;
  plagiarismCompletedAt?: string | null;
  report?: AiReviewReport | null;
  plagiarismFlags: PlagiarismFlag[];
}

export type ExtStatus = 'pending' | 'submitted' | 'live' | 'rejected' | 'removed';

export interface ExternalPublishResponse {
  id: string;
  gameId: string;
  gameVersionId?: string | null;
  versionNumber?: string | null;
  status: ExtStatus;
  externalAppId?: string | null;
  storeUrl?: string | null;
  submittedAt?: string | null;
  liveAt?: string | null;
  rejectedReason?: string | null;
  createdAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface SignUpRequest {
  email: string;
  password?: string;
  confirmPassword?: string;
  fullName: string;
  avatarUrl?: string;
  otp?: string;
  recaptchaToken?: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  avatarUrl?: string;
  password?: string;
}

export interface SignInRequest {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface GoogleLoginRequest {
  idToken: string;
  rememberMe?: boolean;
}

export interface GitHubLoginRequest {
  code: string;
  rememberMe?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  code?: string;
  message: string;
  data: T;
  errors?: Record<string, string>;
}

export interface PlatformSettingsResponse {
  commissionRate: number;
  withdrawalHoldDays: number;
  refundDeadlineDays: number;
  /** "HH:mm:ss", giờ Việt Nam — giờ chạy job maintenance hàng ngày */
  dailyMaintenanceTime: string;
  maintenanceMode: boolean;
  announcementBanner?: string | null;
  updatedAt?: string | null;
}

export interface UpdatePlatformSettingsRequest {
  commissionRate: number;
  withdrawalHoldDays: number;
  refundDeadlineDays: number;
  dailyMaintenanceTime: string;
  maintenanceMode: boolean;
  announcementBanner?: string | null;
}

export interface LanguagePreferenceResponse {
  preferredLanguage: "vi" | "en" | "ja";
}

export interface JwtAuthenticationResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword?: string;
  confirmPassword?: string;
}

// --- Spring Boot Page Wrapper ---
export interface Page<T> {
  content: T[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// --- Community Chat Feature ---
export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface UserSummary {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

export interface ChatMediaResponse {
  url: string;
  mediaType: "image" | "video";
}

export interface CommunityChatResponse {
  id: string;
  sender: UserSummary;
  gameId?: string;
  message: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  mediaFiles: ChatMediaResponse[];
  createdAt: string;
  updatedAt: string;
  originalChat?: CommunityChatResponse;
  currentUserReaction?: ReactionType;
}

export interface ChatReactionResponse {
  id: string;
  chatId: string;
  user: UserSummary;
  reactionType: ReactionType;
  createdAt: string;
  isNew: boolean;
}

export interface CreatePostRequest {
  message: string;
  gameId?: string;
  mediaUrls?: string[];
}

export interface UpdatePostRequest {
  message: string;
}

export interface CreateCommentRequest {
  message: string;
  mediaUrls?: string[];
}

export interface CreateReactionRequest {
  reactionType: ReactionType;
}

export interface SharePostRequest {
  message?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  type: "game" | "asset";
  createdAt?: string;
}

export interface CreateGameRequest {
  title: string;
  description?: string;
  priceProposed?: number;
  categoryId?: string;
  publishingType?: "full_acquisition" | "co_publishing" | "marketplace_listing";
  githubRepoUrl?: string;
  githubBranch?: string;
  tagIds?: string[];
}

export interface UpdateGameRequest {
  title?: string;
  description?: string;
  priceProposed?: number;
  categoryId?: string;
  publishingType?: "full_acquisition" | "co_publishing" | "marketplace_listing";
  status?: string;
}

export interface GameResponse {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  priceProposed?: number;
  downloadPrice?: number;
  communityAvailable?: boolean;
  status?: string;
  creatorName?: string;
  creatorFullName?: string;
  categoryName?: string;
  publishingType?: "full_acquisition" | "co_publishing" | "marketplace_listing";
  screenshots?: string[];
  videoUrl?: string;
  fileUrl?: string;
  webDemoUrl?: string;
  version?: string;
  tags?: string[];
  githubRepoUrl?: string;
  githubBranch?: string;
  pendingUpdateSnapshotId?: string;
  pendingUpdateFileUrl?: string;
  pendingTitle?: string;
  pendingDescription?: string;
  pendingThumbnailUrl?: string;
  pendingVideoUrl?: string;
  pendingScreenshots?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractResponse {
  id: string;
  gameId: string;
  gameTitle: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  buyerId?: string;
  contractType: "full_acquisition" | "co_publishing";
  termsHash: string;
  pdfUrl?: string;
  status:
    | "pending"
    | "signed"
    | "expired"
    | "cancelled"
    | "negotiating"
    | "re_issued";
  revenueSplit?: number;
  lumpSumAmount?: string;
  disputeResolutionClause?: string;
  additionalTerms?: string;
  buyerRepresentative?: string;
  buyerPosition?: string;
  sellerRepresentative?: string;
  sellerAddress?: string;
  sellerTaxCode?: string;
  signedAtSeller?: string;
  signedAtBuyer?: string;
  sellerSignatureBase64?: string;
  buyerSignatureBase64?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface CreateMarketplaceItemRequest {
  title: string;
  description?: string;
  price: number;
  categoryId?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  version?: string;
  supportedPlatforms?: string;
  tagIds?: string[];
  tags?: string[];
}

export interface UpdateMarketplaceItemRequest {
  title?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  version?: string;
  supportedPlatforms?: string;
  tagIds?: string[];
  tags?: string[];
}

export interface MarketplaceItemResponse {
  id: string;
  sellerEmail: string;
  sellerFullName?: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  description?: string;
  price: number;
  fileUrl?: string;
  thumbnailUrl?: string;
  version?: string;
  supportedPlatforms?: string;
  tags?: string[];
  screenshots?: string[];
  videoUrl?: string;
  status: "active" | "removed" | "pending" | "rejected";
  mediaUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export interface CreatePaymentRequest {
  marketplaceItemId: string;
}

export interface CreateTopUpRequest {
  amount: number;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  marketplaceItemId: string;
  marketplaceItemTitle: string;
  marketplaceItemType: "asset" | "game_source";
  buyerId: string;
  buyerEmail: string;
  buyerFullName: string;
  sellerId: string;
  sellerEmail: string;
  sellerFullName: string;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  payosOrderCode?: number | null;
  payosPaymentLinkId?: string | null;
  payosTransactionId?: string | null;
  checkoutUrl?: string | null;
  qrCode?: string | null;
  bin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  downloadUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  paymentStatus: PaymentStatus;
  checkoutUrl?: string | null;
  downloadUrl?: string | null;
}

// --- WebSocket Notifications & Chat DM ---
export type NotificationType =
  | "COMMENT"
  | "REACTION"
  | "SHARE"
  | "CHAT_MESSAGE"
  | "PAYMENT_SUCCESS"
  | "GAME_REVIEW_RESULT"
  | "CONTRACT_OFFERED"
  | "SELLER_RESPONSE"
  | "REVIEW_REMOVED"
  | (string & {});

export interface NotificationResponse {
  id: string;
  sender: UserSummary;
  type: NotificationType;
  message: string;
  targetId: string;
  isRead: boolean;
  createdAt: string;
}

// --- Audit Log Types ---
export type ActorRoleType = "admin" | "developer" | "customer";

export type AuditActionType =
  | "game_submitted"
  | "game_approved"
  | "game_rejected"
  | "game_published"
  | "game_community_enabled"
  | "game_updated"
  | "user_banned"
  | "user_unbanned"
  | "user_role_changed"
  | "contract_created"
  | "contract_signed"
  | "contract_cancelled"
  | "transaction_completed"
  | "transaction_failed"
  | "withdrawal_created"
  | "withdrawal_processing"
  | "withdrawal_completed"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "marketplace_item_removed"
  | "review_removed"
  | "chat_removed"
  | "ai_report_generated"
  | "security_alert"
  | "post_created"
  | "comment_created"
  | "reaction_created"
  | "chat_message_sent"
  | "user_registered"
  | "user_login_success"
  | "user_login_failed"
  | "user_logged_out";

export type AuditTargetType =
  | "user"
  | "game"
  | "contract"
  | "transaction"
  | "withdrawal"
  | "withdrawal_request"
  | "marketplace_item"
  | "review"
  | "community_chat"
  | "chat_message"
  | "ai_report";

export interface AuditLogResponse {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorFullName?: string;
  actorRole: ActorRoleType;
  action: AuditActionType;
  targetType: AuditTargetType;
  targetId: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogFilterParams {
  page?: number;
  size?: number;
  actorId?: string;
  action?: AuditActionType;
  targetType?: AuditTargetType;
  targetId?: string;
  ipAddress?: string;
}
