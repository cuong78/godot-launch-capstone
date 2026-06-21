import api from './axios';
import { ApiResponse } from '../types';

export const faceVerifyApi = {
  getStatus: async (): Promise<ApiResponse<{ faceVerified: boolean }>> => {
    const res = await api.get('/api/developer/face-verify/status');
    return res.data;
  },

  verify: async (faceImageBase64: string): Promise<ApiResponse<{ faceVerified: boolean }>> => {
    const res = await api.post('/api/developer/face-verify', { faceImageBase64 });
    return res.data;
  },
};
