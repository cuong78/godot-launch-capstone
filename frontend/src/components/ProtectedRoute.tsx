import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ScreenType } from '../types';
import { tokenStorage } from '../utils/tokenStorage';
import { isTokenExpired } from '../utils/jwtUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  setCurrentScreen: (screen: ScreenType) => void;
  requiredRole?: 'admin' | 'developer' | 'guest';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  setCurrentScreen,
  requiredRole
}) => {
  const { currentUser, loading, logout } = useAuth();

  useEffect(() => {
    const token = tokenStorage.getToken() || localStorage.getItem("accessToken");
    if (token && isTokenExpired(token)) {
      logout();
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!loading && !currentUser) {
      setCurrentScreen('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!loading && currentUser && requiredRole) {
      const userRole = currentUser.role;
      if (requiredRole === 'admin' && userRole !== 'admin') {
        setCurrentScreen('explore');
      } else if (requiredRole === 'developer' && userRole !== 'developer' && userRole !== 'admin') {
        setCurrentScreen('explore');
      }
    }
  }, [currentUser, loading, requiredRole, setCurrentScreen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (requiredRole && currentUser.role !== 'admin' && currentUser.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};
