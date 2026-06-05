import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if present
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      tokenStorage.clear();
      if (window.location.pathname !== '/signin' && window.location.pathname !== '/signup') {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
