import api from './axios';
import { 
  ApiResponse, 
  Page, 
  CommunityChatResponse, 
  ChatReactionResponse, 
  CreatePostRequest, 
  UpdatePostRequest, 
  CreateCommentRequest, 
  CreateReactionRequest, 
  SharePostRequest 
} from '../types';

export const communityApi = {
  getPosts: async (
    gameId?: string, 
    page = 0, 
    size = 20, 
    sort = 'createdAt,desc'
  ): Promise<ApiResponse<Page<CommunityChatResponse>>> => {
    const params: Record<string, any> = { page, size, sort };
    if (gameId) {
      params.game_id = gameId;
    }
    const response = await api.get<ApiResponse<Page<CommunityChatResponse>>>('/api/v1/community/posts', { params });
    return response.data;
  },

  createPost: async (data: CreatePostRequest): Promise<ApiResponse<CommunityChatResponse>> => {
    const response = await api.post<ApiResponse<CommunityChatResponse>>('/api/v1/community/posts', data);
    return response.data;
  },

  getPost: async (id: string): Promise<ApiResponse<CommunityChatResponse>> => {
    const response = await api.get<ApiResponse<CommunityChatResponse>>(`/api/v1/community/posts/${id}`);
    return response.data;
  },

  updatePost: async (id: string, data: UpdatePostRequest): Promise<ApiResponse<CommunityChatResponse>> => {
    const response = await api.put<ApiResponse<CommunityChatResponse>>(`/api/v1/community/posts/${id}`, data);
    return response.data;
  },

  deletePost: async (id: string): Promise<ApiResponse<string>> => {
    const response = await api.delete<ApiResponse<string>>(`/api/v1/community/posts/${id}`);
    return response.data;
  },

  addComment: async (id: string, data: CreateCommentRequest): Promise<ApiResponse<CommunityChatResponse>> => {
    const response = await api.post<ApiResponse<CommunityChatResponse>>(`/api/v1/community/posts/${id}/comments`, data);
    return response.data;
  },

  getComments: async (id: string, page = 0, size = 20): Promise<ApiResponse<Page<CommunityChatResponse>>> => {
    const response = await api.get<ApiResponse<Page<CommunityChatResponse>>>(`/api/v1/community/posts/${id}/comments`, {
      params: { page, size }
    });
    return response.data;
  },

  reactToPost: async (id: string, data: CreateReactionRequest): Promise<ApiResponse<ChatReactionResponse>> => {
    const response = await api.post<ApiResponse<ChatReactionResponse>>(`/api/v1/community/posts/${id}/reactions`, data);
    return response.data;
  },

  removeReaction: async (id: string): Promise<ApiResponse<string>> => {
    const response = await api.delete<ApiResponse<string>>(`/api/v1/community/posts/${id}/reactions`);
    return response.data;
  },

  sharePost: async (id: string, data: SharePostRequest): Promise<ApiResponse<CommunityChatResponse>> => {
    const response = await api.post<ApiResponse<CommunityChatResponse>>(`/api/v1/community/posts/${id}/share`, data);
    return response.data;
  },
};
