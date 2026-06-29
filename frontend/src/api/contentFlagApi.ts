import api from './axios';
import type { ApiResponse } from '../types';

export interface ContentFlagItem {
  id: string;
  mediaUrl: string;
  mediaType: string;
  ownerType: string;
  ownerId: string;
  ownerName: string;
  nsfwScore: number;
  flagged: boolean;
  flagDetails: string | null;
  status: 'pending' | 'approved' | 'removed' | 'warned';
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ContentFlagStats {
  pending: number;
  approved: number;
  removed: number;
  warned: number;
  total: number;
}

export interface PagedContentFlags {
  content: ContentFlagItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ContentFlagFilter {
  status?: string;
  ownerType?: string;
  onlyFlagged?: boolean;
  search?: string;
  page?: number;
  size?: number;
}

const contentFlagApi = {
  list: async (filter: ContentFlagFilter = {}): Promise<ApiResponse<PagedContentFlags>> => {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.ownerType) params.append('ownerType', filter.ownerType);
    if (filter.onlyFlagged) params.append('onlyFlagged', 'true');
    if (filter.search) params.append('search', filter.search);
    params.append('page', String(filter.page ?? 0));
    params.append('size', String(filter.size ?? 20));
    const res = await api.get(`/api/admin/content-flags?${params.toString()}`);
    return res.data;
  },

  stats: async (): Promise<ApiResponse<ContentFlagStats>> => {
    const res = await api.get('/api/admin/content-flags/stats');
    return res.data;
  },

  approve: async (id: string, note?: string): Promise<ApiResponse<ContentFlagItem>> => {
    const res = await api.post(`/api/admin/content-flags/${id}/approve`, { note });
    return res.data;
  },

  remove: async (id: string, note?: string): Promise<ApiResponse<ContentFlagItem>> => {
    const res = await api.post(`/api/admin/content-flags/${id}/remove`, { note });
    return res.data;
  },

  warn: async (id: string, note?: string): Promise<ApiResponse<ContentFlagItem>> => {
    const res = await api.post(`/api/admin/content-flags/${id}/warn`, { note });
    return res.data;
  },
};

export default contentFlagApi;
