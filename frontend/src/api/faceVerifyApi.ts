import api from './axios';
import { ApiResponse } from '../types';

export type FaceAction = 'CENTER' | 'TURN_LEFT' | 'TURN_RIGHT' | 'LOOK_UP' | 'LOOK_DOWN';

export interface FaceChallenge {
  challengeId: string;
  actions: FaceAction[];
  expiresAt: string;
}

export interface FaceCapture {
  action: FaceAction;
  imageBase64: string;
  capturedAt: number;
}

export const faceVerifyApi = {
  getStatus: async (): Promise<ApiResponse<{ faceVerified: boolean }>> => {
    const res = await api.get('/api/developer/face-verify/status');
    return res.data;
  },

  createChallenge: async (): Promise<ApiResponse<FaceChallenge>> => {
    const res = await api.post('/api/developer/face-verify/challenge');
    return res.data;
  },

  verify: async (challengeId: string, frames: FaceCapture[]): Promise<ApiResponse<{ faceVerified: boolean }>> => {
    const res = await api.post('/api/developer/face-verify', { challengeId, frames });
    return res.data;
  },
};
