export interface Asset {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviewedCount: number;
  author: string;
  authorAvatar: string;
  category:
    | "3D Models"
    | "2D Assets"
    | "Shaders & VFX"
    | "Audio & SFX"
    | "Scripts & Plugins";
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
  | "chat"
  | "checkout"
  | "payment"
  | "payment-success"
  | "payment-failed"
  | "payment-cancelled"
  | "wallet";

export interface WalletResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt?: string | null;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected' | 'cancelled';

export interface DeveloperWalletSummaryResponse {
  walletId: string;
  developerId: string;
  developerEmail?: string;
  developerFullName?: string;
  currency: string;
  walletBalance: number;
  availableBalance: number;
  pendingBalance: number;
  totalRevenue: number;
  updatedAt?: string | null;
}

export interface TransactionResponse {
  id: string;
  type: string;
  amount: number;
  status: string;
  referenceId?: string;
  createdAt?: string;
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
  processedById?: string;
  processedByFullName?: string;
  processedAt?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WithdrawalDetailResponse extends WithdrawalResponse {
  walletBalance: number;
  availableBalance: number;
  pendingBalance: number;
  totalRevenue: number;
  qrPayload?: string;
  standardQrImageUrl?: string;
  preferredQrImageUrl?: string;
}

export type WithdrawalRequestResponse = WithdrawalResponse;

export interface CreateWithdrawalRequest {
  amount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  note?: string;
}

export interface ApproveWithdrawalRequest {
  transferReference?: string;
  remark?: string;
}

export interface RejectWithdrawalRequest {
  remark: string;
}

export interface ReviewWithdrawalRequest {
  approve: boolean;
  rejectReason?: string;
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
  marketplaceItemId?: string | null;
  codeQualityScore?: number | null;
  mediaMatchScore?: number | null;
  descriptionMatchScore?: number | null;
  nsfwFlag?: boolean;
  overallRecommendation: AiRecommendation;
  suggestedPrice?: number | null;
  suggestedRevenueSplit?: number | null;
  pricingRationale?: string | null;
  flags?: AiReviewFlag[];
  rawOutput?: any;
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
  message: string;
  data: T;
  errors?: Record<string, string>;
}

export interface PlatformSettingsResponse {
  commissionRate: number;
  maintenanceMode: boolean;
  announcementBanner?: string | null;
  updatedAt?: string | null;
}

export interface UpdatePlatformSettingsRequest {
  commissionRate: number;
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
  createdAt?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
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
  itemType: "source_code" | "asset";
  categoryId?: string;
  godotVersion?: string;
  githubRepoUrl?: string;
  sourceGameId?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  documentation?: string;
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
  godotVersion?: string;
  githubRepoUrl?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  documentation?: string;
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
  itemType: "source_code" | "asset";
  title: string;
  description?: string;
  price: number;
  fileUrl?: string;
  thumbnailUrl?: string;
  documentation?: string;
  version?: string;
  supportedPlatforms?: string;
  tags?: string[];
  screenshots?: string[];
  videoUrl?: string;
  godotVersion?: string;
  sourceGameId?: string;
  sourceGameTitle?: string;
  githubRepoUrl?: string;
  githubVerifiedAt?: string;
  status: "active" | "removed" | "pending" | "rejected";
  mediaUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentProvider = "PAYOS";

export type OrderStatus = "PENDING" | "PAID";

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

export interface PaymentResponse {
  id: string;
  orderId: string;
  marketplaceItemId: string;
  marketplaceItemTitle: string;
  marketplaceItemType: "source_code" | "asset";
  buyerId: string;
  buyerEmail: string;
  buyerFullName: string;
  sellerId: string;
  sellerEmail: string;
  sellerFullName: string;
  orderStatus: OrderStatus;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  payosOrderCode?: number | null;
  payosPaymentLinkId?: string | null;
  payosTransactionId?: string | null;
  checkoutUrl?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  downloadUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  checkoutUrl?: string | null;
  downloadUrl?: string | null;
}

// --- WebSocket Notifications & Chat DM ---
export type NotificationType =
  | "COMMENT"
  | "REACTION"
  | "SHARE"
  | "CHAT_MESSAGE";

export interface NotificationResponse {
  id: string;
  sender: UserSummary;
  type: NotificationType;
  message: string;
  targetId: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessageResponse {
  id: string;
  sender: UserSummary;
  recipient: UserSummary;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationResponse {
  recipient: UserSummary;
  lastMessage: string;
  unreadCount: number;
  lastActiveAt: string;
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
