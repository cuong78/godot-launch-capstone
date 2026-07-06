import api from './axios';
import { ApiResponse } from '../types';

export interface StorageAccountResponse {
  id: string;
  name: string;
  provider: 'seaweedfs';
  isActive: boolean;
  createdAt: string;
}

export interface StorageBucketResponse {
  id: string;
  accountId: string;
  accountName: string;
  provider: 'seaweedfs';
  name: string;
  publicUrl?: string;
  createdAt: string;
}

export interface StorageRoutingResponse {
  fileType: string;
  // Các field bucket null khi file_type chưa được admin gán bucket
  bucketId?: string | null;
  bucketName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  provider?: 'seaweedfs' | null;
  updatedAt: string;
}

export interface StorageAccountRequest {
  name: string;
  provider: 'seaweedfs';
  config: string; // JSON string
  isActive: boolean;
}

export interface StorageBucketRequest {
  accountId: string;
  name: string;
  publicUrl?: string;
}

export interface UploadedFileResponse {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  storageProvider: 'seaweedfs' | 'unknown';
  ownerId: string;
  ownerType: string;
  ownerName: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export const storageApi = {
  // Accounts
  listAccounts: async (): Promise<ApiResponse<StorageAccountResponse[]>> => {
    const res = await api.get('/api/admin/storage/accounts');
    return res.data;
  },
  createAccount: async (data: StorageAccountRequest): Promise<ApiResponse<StorageAccountResponse>> => {
    const res = await api.post('/api/admin/storage/accounts', data);
    return res.data;
  },
  updateAccount: async (id: string, data: StorageAccountRequest): Promise<ApiResponse<StorageAccountResponse>> => {
    const res = await api.put(`/api/admin/storage/accounts/${id}`, data);
    return res.data;
  },
  deleteAccount: async (id: string): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/api/admin/storage/accounts/${id}`);
    return res.data;
  },
  renameAccount: async (id: string, name: string): Promise<ApiResponse<StorageAccountResponse>> => {
    const res = await api.patch(`/api/admin/storage/accounts/${id}/name`, { name });
    return res.data;
  },

  // Buckets
  listBuckets: async (): Promise<ApiResponse<StorageBucketResponse[]>> => {
    const res = await api.get('/api/admin/storage/buckets');
    return res.data;
  },
  createBucket: async (data: StorageBucketRequest): Promise<ApiResponse<StorageBucketResponse>> => {
    const res = await api.post('/api/admin/storage/buckets', data);
    return res.data;
  },
  deleteBucket: async (id: string): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/api/admin/storage/buckets/${id}`);
    return res.data;
  },

  // Routing
  listRouting: async (): Promise<ApiResponse<StorageRoutingResponse[]>> => {
    const res = await api.get('/api/admin/storage/routing');
    return res.data;
  },
  listFileTypes: async (): Promise<ApiResponse<string[]>> => {
    const res = await api.get('/api/admin/storage/routing/file-types');
    return res.data;
  },
  updateRouting: async (fileType: string, bucketId: string): Promise<ApiResponse<StorageRoutingResponse>> => {
    const res = await api.put('/api/admin/storage/routing', { fileType, bucketId });
    return res.data;
  },
  batchUpdateRouting: async (items: { fileType: string; bucketId: string }[]): Promise<ApiResponse<StorageRoutingResponse[]>> => {
    const res = await api.put('/api/admin/storage/routing/batch', items);
    return res.data;
  },

  // File management
  listUploadedFiles: async (category: string, search: string, page: number, size: number, mediaType?: string): Promise<ApiResponse<PaginatedResponse<UploadedFileResponse>>> => {
    const res = await api.get('/api/admin/storage/files', {
      params: { category, search, page, size, mediaType }
    });
    return res.data;
  },
  deleteUploadedFile: async (fileUrl: string, fileType: string, ownerType: string, ownerId: string): Promise<ApiResponse<void>> => {
    const res = await api.delete('/api/admin/storage/files', {
      params: { fileUrl, fileType, ownerType, ownerId }
    });
    return res.data;
  },
  downloadFile: async (fileUrl: string, fileType: string): Promise<Blob> => {
    const res = await api.get('/api/admin/storage/files/download', {
      params: { fileUrl, fileType },
      responseType: 'blob'
    });
    return res.data;
  }
};
