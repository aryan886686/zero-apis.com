import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

interface Admin {
  id: string;
  email: string;
  role: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const stored = localStorage.getItem('admin');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!admin;

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await authApi.getMe();
        const adminData = res.data.data;
        setAdmin(adminData);
        localStorage.setItem('admin', JSON.stringify(adminData));
      } catch {
        setToken(null);
        setAdmin(null);
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
      } finally {
        setIsLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token: newToken, admin: adminData } = res.data.data;
    setToken(newToken);
    setAdmin(adminData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('admin', JSON.stringify(adminData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      const adminData = res.data.data;
      setAdmin(adminData);
      localStorage.setItem('admin', JSON.stringify(adminData));
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
