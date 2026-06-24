import api from './axios';
import { 
  ApiResponse, 
  GameResponse, 
  CategoryResponse, 
  CreateGameRequest, 
  UpdateGameRequest 
} from '../types';

export const gameApi = {
  createGameDraft: async (data: CreateGameRequest): Promise<ApiResponse<{ gameId: string }>> => {
    const response = await api.post<ApiResponse<{ gameId: string }>>('/api/v1/games', data);
    return response.data;
  },

  // Submit game bằng repo GitHub: verify owner → clone → virus scan → snapshot
  submitGameRepo: async (
    gameId: string,
    repoUrl: string,
    branch?: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post<ApiResponse<{ message: string }>>(
      `/api/v1/games/${gameId}/submit-repo`,
      { repoUrl, branch }
    );
    return response.data;
  },

  getAllGames: async (status?: string): Promise<ApiResponse<GameResponse[]>> => {
    const response = await api.get<ApiResponse<GameResponse[]>>('/api/v1/games', {
      params: status ? { status } : {}
    });
    return response.data;
  },

  getGameById: async (id: string): Promise<ApiResponse<GameResponse>> => {
    const response = await api.get<ApiResponse<GameResponse>>(`/api/v1/games/${id}`);
    return response.data;
  },

  updateGame: async (id: string, data: UpdateGameRequest): Promise<ApiResponse<GameResponse>> => {
    const response = await api.put<ApiResponse<GameResponse>>(`/api/v1/games/${id}`, data);
    return response.data;
  },

  getPresignedUrl: async (
    gameId: string, 
    fileType: 'game' | 'thumbnail' | 'screenshot' | 'video', 
    contentType: string
  ): Promise<ApiResponse<{ uploadUrl: string }>> => {
    const response = await api.get<ApiResponse<{ uploadUrl: string }>>(`/api/v1/games/${gameId}/upload-url`, {
      params: { fileType, contentType }
    });
    return response.data;
  },

  confirmUploadComplete: async (
    gameId: string,
    fileType: 'game' | 'thumbnail' | 'screenshot' | 'video',
    objectKey?: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post<ApiResponse<{ message: string }>>(`/api/v1/games/${gameId}/upload-complete`, null, {
      params: { fileType, objectKey }
    });
    return response.data;
  },

  // Proxy upload media (thumbnail/screenshot/video) qua backend → StorageRouter (S3/SeaweedFS)
  uploadMedia: async (
    gameId: string,
    fileType: 'thumbnail' | 'screenshot' | 'video',
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<{ message: string; objectKey: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ message: string; objectKey: string }>>(
      `/api/v1/games/${gameId}/media/upload`,
      formData,
      {
        params: { fileType },
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      }
    );
    return response.data;
  },

  // Xóa toàn bộ screenshot ('image') hoặc video của game — dùng khi thay bộ ảnh mới
  clearMedia: async (
    gameId: string,
    mediaType: 'image' | 'video'
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/api/v1/games/${gameId}/media`, {
      params: { mediaType }
    });
    return response.data;
  },

  // Xóa 1 screenshot/video lẻ theo mediaUrl
  deleteMediaItem: async (
    gameId: string,
    mediaUrl: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete<ApiResponse<{ message: string }>>(`/api/v1/games/${gameId}/media/item`, {
      params: { mediaUrl }
    });
    return response.data;
  },

  getCategories: async (): Promise<ApiResponse<CategoryResponse[]>> => {
    const response = await api.get<ApiResponse<CategoryResponse[]>>('/api/v1/categories');
    return response.data;
  },

  approveGame: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/api/v1/admin/games/${id}/approve`);
    return response.data;
  },

  rejectGame: async (id: string, reason: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/api/v1/admin/games/${id}/reject`, { reason });
    return response.data;
  }
};
