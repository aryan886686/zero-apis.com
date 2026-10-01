import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="btn-loading scale-150"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/shadowphantomlogin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
