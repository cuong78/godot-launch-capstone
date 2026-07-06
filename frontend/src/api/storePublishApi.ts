import api from './axios';
import { ApiResponse, ExternalPublishResponse } from '../types';

/**
 * Admin upload build (APK/AAB) cho game đã ký hợp đồng (status = awaiting_store_build)
 * và theo dõi trạng thái submit lên Google Play.
 */
export const storePublishApi = {
  uploadBuild: async (
    gameId: string,
    file: File,
    versionNumber: string,
    changelog?: string
  ): Promise<ApiResponse<ExternalPublishResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('versionNumber', versionNumber);
    if (changelog) formData.append('changelog', changelog);

    const res = await api.post<ApiResponse<ExternalPublishResponse>>(
      `/api/v1/admin/games/${gameId}/store-build`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  getStatus: async (gameId: string): Promise<ApiResponse<ExternalPublishResponse | null>> => {
    const res = await api.get<ApiResponse<ExternalPublishResponse | null>>(
      `/api/v1/admin/games/${gameId}/store-publish`
    );
    return res.data;
  },
};
