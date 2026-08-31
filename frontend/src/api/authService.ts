import { tokenStorage } from '../utils/tokenStorage';
import { authApi } from './authApi';

export const loginWithGitHub = (rememberMe?: boolean): void => {
  const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  window.location.href = `${apiBaseUrl}/api/v1/auth/github${rememberMe ? '?rememberMe=true' : ''}`;
};

export const handleGitHubCallback = (): string => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) throw new Error("No token in callback URL");
  localStorage.setItem("accessToken", token);
  tokenStorage.setToken(token); // Sync with existing auth key
  return token;
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem("accessToken") || tokenStorage.getToken();
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

export const logout = (): void => {
  authApi.logout().catch(err => {
    console.warn("Backend logout failed:", err);
  }).finally(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
    tokenStorage.clear();
    window.location.href = "/signin";
  });
};
