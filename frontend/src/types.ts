export interface Asset {
  id: string;
  title: string;
  price: number;
  rating: number;
  reviewedCount: number;
  author: string;
  authorAvatar: string;
  category: '3D Models' | '2D Assets' | 'Shaders & VFX' | 'Audio & SFX' | 'Scripts & Plugins';
  description: string;
  image: string;
  tag: string;
  tagList: string[];
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
}

export interface Project {
  id: string;
  projectName: string;
  version: string;
  date: string;
  status: 'LIVE' | 'BETA' | 'ALPHA';
  engine: string;
  downloads: string;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl: string;
  role?: 'user' | 'admin' | 'developer' | 'customer' | 'guest';
  roleName?: string;
  status?: string;
}

export type ScreenType = 'explore' | 'marketplace' | 'upload' | 'path' | 'dashboard' | 'detail' | 'community' | 'signin' | 'signup' | 'admin' | 'auth-callback' | 'profile' | 'community-detail' | 'author-profile' | 'chat';

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
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface GitHubLoginRequest {
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  errors?: Record<string, string>;
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
export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface UserSummary {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

export interface ChatMediaResponse {
  url: string;
  mediaType: 'image' | 'video';
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
  publishingType?: 'full_acquisition' | 'co_publishing' | 'marketplace_listing';
}

export interface UpdateGameRequest {
  title?: string;
  description?: string;
  priceProposed?: number;
  categoryId?: string;
  publishingType?: 'full_acquisition' | 'co_publishing' | 'marketplace_listing';
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
  publishingType?: 'full_acquisition' | 'co_publishing' | 'marketplace_listing';
  screenshots?: string[];
  videoUrl?: string;
  fileUrl?: string;
}

export interface ContractResponse {
  id: string;
  gameId: string;
  gameTitle: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  buyerId?: string;
  contractType: 'full_acquisition' | 'co_publishing';
  termsHash: string;
  pdfUrl?: string;
  status: 'pending' | 'signed' | 'expired' | 'cancelled' | 'negotiating' | 're_issued';
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
  itemType: 'source_code' | 'asset';
  categoryId?: string;
  godotVersion?: string;
  githubRepoUrl?: string;
  sourceGameId?: string;
  fileUrl?: string;
}

export interface UpdateMarketplaceItemRequest {
  title?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  godotVersion?: string;
  githubRepoUrl?: string;
  fileUrl?: string;
}

export interface MarketplaceItemResponse {
  id: string;
  sellerEmail: string;
  sellerFullName?: string;
  categoryId?: string;
  categoryName?: string;
  itemType: 'source_code' | 'asset';
  title: string;
  description?: string;
  price: number;
  fileUrl?: string;
  godotVersion?: string;
  sourceGameId?: string;
  sourceGameTitle?: string;
  githubRepoUrl?: string;
  githubVerifiedAt?: string;
  status: 'active' | 'removed' | 'pending' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

// --- WebSocket Notifications & Chat DM ---
export type NotificationType = 'COMMENT' | 'REACTION' | 'SHARE' | 'CHAT_MESSAGE';

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
export type ActorRoleType = 'admin' | 'developer' | 'customer';

export type AuditActionType =
  | 'game_submitted'
  | 'game_approved'
  | 'game_rejected'
  | 'game_published'
  | 'game_community_enabled'
  | 'game_updated'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_role_changed'
  | 'contract_created'
  | 'contract_signed'
  | 'contract_cancelled'
  | 'transaction_completed'
  | 'transaction_failed'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'marketplace_item_removed'
  | 'review_removed'
  | 'chat_removed'
  | 'ai_report_generated'
  | 'security_alert'
  | 'post_created'
  | 'comment_created'
  | 'reaction_created'
  | 'chat_message_sent'
  | 'user_registered'
  | 'user_login_success'
  | 'user_login_failed'
  | 'user_logged_out';

export type AuditTargetType =
  | 'user'
  | 'game'
  | 'contract'
  | 'transaction'
  | 'withdrawal'
  | 'marketplace_item'
  | 'review'
  | 'community_chat'
  | 'chat_message'
  | 'ai_report';

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




