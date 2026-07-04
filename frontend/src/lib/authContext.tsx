'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface FeatureAccess {
  dashboard: boolean;
  billing: boolean;
  scanner: boolean;
  inventory: boolean;
  suppliers: boolean;
  purchaseOrders: boolean;
  aiAlerts: boolean;
  reports: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  access: FeatureAccess | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('erp_token');
    const storedUser = localStorage.getItem('erp_user');
    const storedAccess = localStorage.getItem('erp_access');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedAccess) setAccess(JSON.parse(storedAccess));
    }

    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('erp_token', data.token);
    localStorage.setItem('erp_user', JSON.stringify(data.user));

    // Fetch feature access right after login
    const meData = await apiRequest<{ user: User; access: FeatureAccess }>('/auth/me', {
      token: data.token,
    });
    setAccess(meData.access);
    localStorage.setItem('erp_access', JSON.stringify(meData.access));

    router.push('/dashboard');
  }

  function logout() {
    setToken(null);
    setUser(null);
    setAccess(null);
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_access');
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, token, access, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}