import axios from 'axios';
import { getAccessToken, logout } from './authService';

const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || window.location.origin}/api/v1`,
});

// Request interceptor — attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout(); // clear token and redirect to login
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
