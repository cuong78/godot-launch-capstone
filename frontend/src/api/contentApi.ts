import api from './axios';
import { ApiResponse } from '../types';
import { BannerResponse } from './bannerApi';

export type CollectionItemType = 'GAME' | 'ASSET' | 'ALL';
export type CollectionMatchMode = 'ANY' | 'ALL';
export type CollectionSortMode = 'NEWEST' | 'POPULAR' | 'RANDOM';
export type HomepageSectionType = 'RECENT_RELEASES' | 'FREE_CONTENT' | 'COLLECTION';

export interface ContentTag { id: string; name: string; slug: string }
export interface ContentCategory { id: string; name: string; slug: string; description?: string; parentId?: string; type: string }
export interface ContentCollection {
  id: string; title: string; slug: string; description?: string;
  itemType: CollectionItemType; matchMode: CollectionMatchMode; sortMode: CollectionSortMode;
  maxItems: number; active: boolean; tags: ContentTag[]; categories: ContentCategory[];
}
export interface ContentCollectionPayload {
  title: string; slug: string; description: string; itemType: CollectionItemType;
  matchMode: CollectionMatchMode; sortMode: CollectionSortMode; maxItems: number;
  active: boolean; tagIds: string[]; categoryIds: string[];
}
export interface HomepageProduct {
  id: string; itemType: 'GAME' | 'ASSET'; title: string; description?: string;
  thumbnailUrl?: string; price?: number; creatorName?: string; categoryName?: string;
  tags: string[]; popularity?: number; createdAt?: string;
}
export interface HomepageSection {
  id: string; title: string; sectionType: HomepageSectionType; collectionId?: string;
  collectionSlug?: string; displayOrder: number; itemLimit: number; active: boolean;
  system: boolean; products: HomepageProduct[];
}
export interface HomepagePayload { banners: BannerResponse[]; sections: HomepageSection[] }

export const contentApi = {
  getHomepage: async () => (await api.get<ApiResponse<HomepagePayload>>('/api/v1/homepage')).data,
  getCollections: async () => (await api.get<ApiResponse<ContentCollection[]>>('/api/v1/admin/collections')).data,
  createCollection: async (payload: ContentCollectionPayload) => (await api.post<ApiResponse<ContentCollection>>('/api/v1/admin/collections', payload)).data,
  updateCollection: async (id: string, payload: ContentCollectionPayload) => (await api.put<ApiResponse<ContentCollection>>(`/api/v1/admin/collections/${id}`, payload)).data,
  deleteCollection: async (id: string) => (await api.delete<ApiResponse<void>>(`/api/v1/admin/collections/${id}`)).data,
  getSections: async () => (await api.get<ApiResponse<HomepageSection[]>>('/api/v1/admin/homepage-sections')).data,
  createSection: async (payload: { title: string; collectionId: string; displayOrder: number; itemLimit: number; active: boolean }) =>
    (await api.post<ApiResponse<HomepageSection>>('/api/v1/admin/homepage-sections', payload)).data,
  updateSection: async (id: string, payload: { title: string; collectionId?: string; displayOrder: number; itemLimit: number; active: boolean }) =>
    (await api.put<ApiResponse<HomepageSection>>(`/api/v1/admin/homepage-sections/${id}`, payload)).data,
  deleteSection: async (id: string) => (await api.delete<ApiResponse<void>>(`/api/v1/admin/homepage-sections/${id}`)).data,
  getTags: async () => (await api.get<ApiResponse<ContentTag[]>>('/api/v1/tags')).data,
  createTag: async (payload: { name: string; slug: string }) => (await api.post<ApiResponse<ContentTag>>('/api/v1/tags', payload)).data,
  updateTag: async (id: string, payload: { name: string; slug: string }) => (await api.put<ApiResponse<ContentTag>>(`/api/v1/tags/${id}`, payload)).data,
  deleteTag: async (id: string) => (await api.delete<ApiResponse<void>>(`/api/v1/tags/${id}`)).data,
  getCategories: async () => (await api.get<ApiResponse<ContentCategory[]>>('/api/v1/categories')).data,
  createCategory: async (payload: Omit<ContentCategory, 'id'>) => (await api.post<ApiResponse<ContentCategory>>('/api/v1/categories', payload)).data,
  updateCategory: async (id: string, payload: Omit<ContentCategory, 'id'>) => (await api.put<ApiResponse<ContentCategory>>(`/api/v1/categories/${id}`, payload)).data,
  deleteCategory: async (id: string) => (await api.delete<ApiResponse<void>>(`/api/v1/categories/${id}`)).data,
};
