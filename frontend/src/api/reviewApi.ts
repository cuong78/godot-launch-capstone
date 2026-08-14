import api from './axios';
import { ApiResponse } from '../types';

export interface ReviewResponse {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  gameId?: string;
  assetId?: string;
  rating: number;
  comment?: string;
  sellerReply?: string;
  sellerRepliedAt?: string;
  adminReply?: string;
  adminRepliedAt?: string;
  adminRepliedByUserId?: string;
  adminRepliedUserName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummaryDto {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
  userCanReview: boolean;
  currentUserReview?: ReviewResponse;
}

export interface CreateReviewRequest {
  gameId?: string;
  assetId?: string;
  rating: number;
  comment?: string;
}

export const reviewApi = {
  createOrUpdateReview: async (data: CreateReviewRequest): Promise<ApiResponse<ReviewResponse>> => {
    const response = await api.post<ApiResponse<ReviewResponse>>('/api/reviews', data);
    return response.data;
  },

  replyToReview: async (reviewId: string, replyComment: string): Promise<ApiResponse<ReviewResponse>> => {
    const response = await api.post<ApiResponse<ReviewResponse>>(`/api/reviews/${reviewId}/reply`, { replyComment });
    return response.data;
  },

  getGameReviewSummary: async (gameId: string): Promise<ApiResponse<ReviewSummaryDto>> => {
    const response = await api.get<ApiResponse<ReviewSummaryDto>>(`/api/reviews/game/${gameId}/summary`);
    return response.data;
  },

  getAssetReviewSummary: async (assetId: string): Promise<ApiResponse<ReviewSummaryDto>> => {
    const response = await api.get<ApiResponse<ReviewSummaryDto>>(`/api/reviews/asset/${assetId}/summary`);
    return response.data;
  },

  getGameReviews: async (gameId: string, page = 0, size = 10): Promise<ApiResponse<{ content: ReviewResponse[]; totalElements: number; totalPages: number }>> => {
    const response = await api.get(`/api/reviews/game/${gameId}?page=${page}&size=${size}`);
    return response.data;
  },

  getAssetReviews: async (assetId: string, page = 0, size = 10): Promise<ApiResponse<{ content: ReviewResponse[]; totalElements: number; totalPages: number }>> => {
    const response = await api.get(`/api/reviews/asset/${assetId}?page=${page}&size=${size}`);
    return response.data;
  },

  getAllReviews: async (page = 0, size = 20): Promise<ApiResponse<{ content: ReviewResponse[]; totalElements: number; totalPages: number }>> => {
    const response = await api.get(`/api/reviews/all?page=${page}&size=${size}`);
    return response.data;
  },

  deleteReview: async (reviewId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/reviews/${reviewId}`);
    return response.data;
  },
};
