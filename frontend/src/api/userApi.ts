import api from './axios';
import { ApiResponse, User } from '../types';

export interface AdminUpdateUserRequest {
  fullName: string;
  roleName: string;
  status: string;
  password?: string;
  avatarUrl?: string;
}

export const userApi = {
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await api.get<ApiResponse<User[]>>('/api/v1/users');
    return response.data;
  },

  updateUser: async (id: string, data: AdminUpdateUserRequest): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>(`/api/v1/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/users/${id}`);
    return response.data;
  }
};
