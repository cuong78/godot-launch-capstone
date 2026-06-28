import api from './axios';
import {
  ApiResponse,
  PlatformSettingsResponse,
  UpdatePlatformSettingsRequest,
} from '../types';

export const platformSettingsApi = {
  getPlatformSettings: async (): Promise<ApiResponse<PlatformSettingsResponse>> => {
    const response = await api.get<ApiResponse<PlatformSettingsResponse>>(
      '/api/v1/admin/platform-settings',
    );
    return response.data;
  },

  updatePlatformSettings: async (
    data: UpdatePlatformSettingsRequest,
  ): Promise<ApiResponse<PlatformSettingsResponse>> => {
    const response = await api.put<ApiResponse<PlatformSettingsResponse>>(
      '/api/v1/admin/platform-settings',
      data,
    );
    return response.data;
  },
};
