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
  videoUrl?: string | null;
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
  role?: 'user' | 'admin' | 'developer' | 'player';
  roleName?: string;
  status?: string;
}

export type ScreenType = 'explore' | 'marketplace' | 'upload' | 'path' | 'dashboard' | 'detail' | 'community' | 'signin' | 'signup' | 'admin';

export interface SignUpRequest {
  email: string;
  password?: string;
  confirmPassword?: string;
  fullName: string;
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

export interface GameResponse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  priceProposed: number;
  downloadPrice: number | null;
  communityAvailable: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published';
  creatorName: string;
  categoryName: string;
  publishingType: 'full_acquisition' | 'co_publishing' | 'marketplace_listing';
  screenshots?: string[];
  videoUrl?: string | null;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
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
}



