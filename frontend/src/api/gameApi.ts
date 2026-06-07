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
