import api from './axios';
import { ApiResponse } from '../types';

export interface TagResponse {
  id: string;
  name: string;
  slug: string;
}

export const tagApi = {
  getAllTags: async (): Promise<ApiResponse<TagResponse[]>> => {
    const res = await api.get<ApiResponse<TagResponse[]>>('/api/v1/tags');
    return res.data;
  },
};
