import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  // Gửi httpOnly cookie kèm theo mọi request (same-origin)
  withCredentials: true,
});

// Request Interceptor: Attach JWT Token nếu có trong localStorage
// (httpOnly cookie được browser tự gửi — không cần đọc thủ công)
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 + FACE_VERIFY_REQUIRED (403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      if (window.location.pathname !== '/signin' && window.location.pathname !== '/signup') {
        window.location.href = '/signin';
      }
    }
    if (error.response?.status === 403) {
      const code = error.response?.data?.code;
      if (code === 'FACE_VERIFY_REQUIRED') {
        window.dispatchEvent(new CustomEvent('face-verify-required'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
