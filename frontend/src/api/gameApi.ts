import api from './axios';
import { 
  ApiResponse, 
  GameResponse, 
  CategoryResponse, 
  CreateGameRequest, 
  UpdateGameRequest,
  GameEntitlementResponse
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

  // Lấy username bot GitHub (để mời vào repo private)
  getGithubBot: async (): Promise<ApiResponse<{ botUsername: string }>> => {
    const response = await api.get<ApiResponse<{ botUsername: string }>>('/api/v1/games/github-bot');
    return response.data;
  },

  // Sau khi developer mời bot vào repo → bot accept invitation
  acceptBot: async (repoUrl: string): Promise<ApiResponse<{ granted: boolean }>> => {
    const response = await api.post<ApiResponse<{ granted: boolean }>>(
      '/api/v1/games/accept-bot',
      { repoUrl }
    );
    return response.data;
  },

  getAllGames: async (status?: string, search?: string): Promise<ApiResponse<GameResponse[]>> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await api.get<ApiResponse<GameResponse[]>>('/api/v1/games', { params });
    return response.data;
  },

  getGameById: async (id: string): Promise<ApiResponse<GameResponse>> => {
    const response = await api.get<ApiResponse<GameResponse>>(`/api/v1/games/${id}`);
    return response.data;
  },

  getEntitlement: async (id: string): Promise<ApiResponse<GameEntitlementResponse>> => {
    const response = await api.get<ApiResponse<GameEntitlementResponse>>(`/api/v1/games/${id}/entitlement`);
    return response.data;
  },

  downloadPurchase: async (purchaseId: string): Promise<{ blob: Blob; fileName: string }> => {
    const response = await api.get<Blob>(`/api/v1/downloads/${purchaseId}`, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const utf8Match = disposition?.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition?.match(/filename="?([^";]+)"?/i);
    const encodedName = utf8Match?.[1] || plainMatch?.[1];
    let fileName = 'game-package.zip';
    if (encodedName) {
      try {
        fileName = decodeURIComponent(encodedName);
      } catch {
        fileName = encodedName;
      }
    }
    return { blob: response.data, fileName };
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

  // Proxy upload media (thumbnail/screenshot/video) qua backend → SeaweedFsService
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

  getCategories: async (type?: 'game' | 'asset'): Promise<ApiResponse<CategoryResponse[]>> => {
    const response = await api.get<ApiResponse<CategoryResponse[]>>('/api/v1/categories', {
      params: type ? { type } : {},
    });
    return response.data;
  },

  approveGame: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/api/v1/admin/games/${id}/approve`);
    return response.data;
  },

  rejectGame: async (id: string, reason: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(`/api/v1/admin/games/${id}/reject`, { reason });
    return response.data;
  },

  uploadWebDemo: async (
    gameId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<void>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<void>>(
      `/api/v1/games/${gameId}/web-demo`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      }
    );
    return response.data;
  },

  uploadUnifiedGame: async (
    gameId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<{ gameId: string; status: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ gameId: string; status: string }>>(
      `/api/v1/games/${gameId}/upload-unified`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      }
    );
    return response.data;
  },

  getGameUploadStatus: async (id: string): Promise<ApiResponse<GameResponse>> => {
    const response = await api.get<ApiResponse<GameResponse>>(`/api/v1/games/${id}/upload-status`);
    return response.data;
  },

  reorderGameScreenshots: async (id: string, orderedUrls: string[]): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.put<ApiResponse<{ message: string }>>(`/api/v1/games/${id}/reorder-screenshots`, orderedUrls);
    return response.data;
  }
};
