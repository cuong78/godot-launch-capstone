import api from './axios';
import { 
  SignUpRequest, 
  SignInRequest, 
  GoogleLoginRequest, 
  GitHubLoginRequest, 
  ApiResponse, 
  JwtAuthenticationResponse, 
  User 
} from '../types';

export const authApi = {
  signUp: async (data: SignUpRequest): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/api/auth/signup', data);
    return response.data;
  },

  signIn: async (data: SignInRequest): Promise<ApiResponse<JwtAuthenticationResponse>> => {
    const response = await api.post<ApiResponse<JwtAuthenticationResponse>>('/api/auth/signin', data);
    return response.data;
  },

  loginWithGoogle: async (data: GoogleLoginRequest): Promise<ApiResponse<JwtAuthenticationResponse>> => {
    const response = await api.post<ApiResponse<JwtAuthenticationResponse>>('/api/auth/google', data);
    return response.data;
  },

  loginWithGitHub: async (data: GitHubLoginRequest): Promise<ApiResponse<JwtAuthenticationResponse>> => {
    const response = await api.post<ApiResponse<JwtAuthenticationResponse>>('/api/auth/github', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>('/api/v1/users/me');
    return response.data;
  }
};
