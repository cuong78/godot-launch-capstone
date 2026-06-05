import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, SignUpRequest, SignInRequest, GoogleLoginRequest, GitHubLoginRequest } from '../types';
import { authApi } from '../api/authApi';
import { tokenStorage } from '../utils/tokenStorage';

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  signUp: (data: SignUpRequest) => Promise<User>;
  signIn: (data: SignInRequest) => Promise<User>;
  loginWithGoogle: (data: GoogleLoginRequest) => Promise<User>;
  loginWithGitHub: (data: GitHubLoginRequest) => Promise<User>;
  logout: () => void;
  setError: (error: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapBackendUserToFrontendUser = (backendUser: any): User => {
  return {
    ...backendUser,
    role: backendUser.roleName === 'admin' ? 'admin' : backendUser.roleName,
    avatarUrl: backendUser.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80`
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenStorage.getToken();
      const storedUser = tokenStorage.getUser();
      
      if (token && storedUser) {
        setCurrentUser(storedUser);
        try {
          const res = await authApi.getCurrentUser();
          if (res.success && res.data) {
            const mappedUser = mapBackendUserToFrontendUser(res.data);
            setCurrentUser(mappedUser);
            tokenStorage.setUser(mappedUser);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.warn("Token validation failed on startup, logging out.", err);
          handleLogout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogout = () => {
    tokenStorage.clear();
    setCurrentUser(null);
  };

  const signUp = async (data: SignUpRequest): Promise<User> => {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.signUp(data);
      if (response.success && response.data) {
        return mapBackendUserToFrontendUser(response.data);
      } else {
        throw new Error(response.message || 'Registration failed.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (data: SignInRequest): Promise<User> => {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.signIn(data);
      if (response.success && response.data) {
        const { token, user } = response.data;
        const mappedUser = mapBackendUserToFrontendUser(user);
        tokenStorage.setToken(token);
        tokenStorage.setUser(mappedUser);
        setCurrentUser(mappedUser);
        return mappedUser;
      } else {
        throw new Error(response.message || 'Login failed.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Invalid credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (data: GoogleLoginRequest): Promise<User> => {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.loginWithGoogle(data);
      if (response.success && response.data) {
        const { token, user } = response.data;
        const mappedUser = mapBackendUserToFrontendUser(user);
        tokenStorage.setToken(token);
        tokenStorage.setUser(mappedUser);
        setCurrentUser(mappedUser);
        return mappedUser;
      } else {
        throw new Error(response.message || 'Google login failed.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Google login failed.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGitHub = async (data: GitHubLoginRequest): Promise<User> => {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.loginWithGitHub(data);
      if (response.success && response.data) {
        const { token, user } = response.data;
        const mappedUser = mapBackendUserToFrontendUser(user);
        tokenStorage.setToken(token);
        tokenStorage.setUser(mappedUser);
        setCurrentUser(mappedUser);
        return mappedUser;
      } else {
        throw new Error(response.message || 'GitHub login failed.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'GitHub login failed.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      error,
      signUp,
      signIn,
      loginWithGoogle,
      loginWithGitHub,
      logout: handleLogout,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
};
