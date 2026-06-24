import api from './axios';
import { ApiResponse, User, UpdateProfileRequest, JwtAuthenticationResponse } from '../types';

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
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>('/api/v1/users/me', data);
    return response.data;
  },

  getGitHubStatus: async (): Promise<ApiResponse<{ linked: boolean; githubUsername: string | null; githubLinkedAt: string | null }>> => {
    const response = await api.get<ApiResponse<{ linked: boolean; githubUsername: string | null; githubLinkedAt: string | null }>>('/api/v1/users/me/github-status');
    return response.data;
  },

  unlinkGitHub: async (): Promise<ApiResponse<JwtAuthenticationResponse>> => {
    const response = await api.delete<ApiResponse<JwtAuthenticationResponse>>('/api/v1/users/me/github');
    return response.data;
  }
};
