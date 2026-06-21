import api from './axios';
import { 
  SignUpRequest, 
  SignInRequest, 
  GoogleLoginRequest, 
  GitHubLoginRequest, 
  ForgotPasswordRequest,
  ResetPasswordRequest,
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
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/api/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/api/auth/reset-password', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<string>>('/api/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  requestSignupOtp: async (email: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/api/auth/signup/otp', { email });
    return response.data;
  },

  verifySignupOtp: async (email: string, otp: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>('/api/auth/signup/otp/verify', { email, otp });
    return response.data;
  },
};
