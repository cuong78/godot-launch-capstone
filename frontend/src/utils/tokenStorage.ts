import { User } from '../types';

const TOKEN_KEY = 'godotlaunch_token';
const USER_KEY = 'godotlaunch_user';

export const tokenStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser: (): User | null => {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },
  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  removeUser: (): void => {
    localStorage.removeItem(USER_KEY);
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
