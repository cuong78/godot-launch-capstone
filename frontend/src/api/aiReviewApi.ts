import api from './axios';
import { ApiResponse, AiReviewReport, GameReviewOverview } from '../types';

/**
 * AI review report (đề xuất của AI). Admin xem điểm + flags + bằng chứng rồi tự quyết định.
 */
export const aiReviewApi = {
  /** Trạng thái AI + plagiarism và kết quả của snapshot mới nhất. */
  getGameOverview: async (gameId: string): Promise<ApiResponse<GameReviewOverview>> => {
    const res = await api.get<ApiResponse<GameReviewOverview>>(
      `/api/v1/admin/ai-reviews/game/${gameId}/overview`);
    return res.data;
  },

  /** Report mới nhất của 1 game (null nếu chưa có). */
  getLatestForGame: async (gameId: string): Promise<ApiResponse<AiReviewReport | null>> => {
    const res = await api.get<ApiResponse<AiReviewReport | null>>(
      `/api/v1/admin/ai-reviews/game/${gameId}`);
    return res.data;
  },

  /** Report mới nhất của 1 marketplace item (null nếu chưa có). */
  getLatestForItem: async (itemId: string): Promise<ApiResponse<AiReviewReport | null>> => {
    const res = await api.get<ApiResponse<AiReviewReport | null>>(
      `/api/v1/admin/ai-reviews/asset/${itemId}`);
    return res.data;
  },

  /** Lịch sử report của game (mỗi lần re-submit). */
  getHistoryForGame: async (gameId: string): Promise<ApiResponse<AiReviewReport[]>> => {
    const res = await api.get<ApiResponse<AiReviewReport[]>>(
      `/api/v1/admin/ai-reviews/game/${gameId}/history`);
    return res.data;
  },

  /** Lịch sử report của marketplace item. */
  getHistoryForItem: async (itemId: string): Promise<ApiResponse<AiReviewReport[]>> => {
    const res = await api.get<ApiResponse<AiReviewReport[]>>(
      `/api/v1/admin/ai-reviews/asset/${itemId}/history`);
    return res.data;
  },

  /** Kích hoạt chạy AI review thủ công cho game. */
  triggerGameReview: async (gameId: string): Promise<ApiResponse<string>> => {
    const res = await api.post<ApiResponse<string>>(
      `/api/v1/admin/ai-reviews/game/${gameId}/trigger`);
    return res.data;
  },

  /** Kích hoạt chạy AI review thủ công cho marketplace item. */
  triggerItemReview: async (itemId: string): Promise<ApiResponse<string>> => {
    const res = await api.post<ApiResponse<string>>(
      `/api/v1/admin/ai-reviews/asset/${itemId}/trigger`);
    return res.data;
  },
};
