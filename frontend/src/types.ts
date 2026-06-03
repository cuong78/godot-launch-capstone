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
  username: string;
  email: string;
  avatarUrl: string;
  role?: 'user' | 'admin';
}

export type ScreenType = 'explore' | 'marketplace' | 'upload' | 'path' | 'dashboard' | 'detail' | 'community' | 'signin' | 'signup' | 'admin';

