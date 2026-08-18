import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi, setAuthToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount, restore a previously-stored session and verify it's still valid.
  useEffect(() => {
    const savedToken = localStorage.getItem('personalverse_token');
    const savedUser = localStorage.getItem('personalverse_user');

    if (savedToken && savedUser) {
      setAuthToken(savedToken);
      authApi
        .me()
        .then((freshUser) => {
          setToken(savedToken);
          setUser(freshUser);
        })
        .catch(() => {
          localStorage.removeItem('personalverse_token');
          localStorage.removeItem('personalverse_user');
          setAuthToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const applySession = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    localStorage.setItem('personalverse_token', newToken);
    localStorage.setItem('personalverse_user', JSON.stringify(newUser));
  };

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const data = await authApi.login(email, password);
      applySession(data.access_token, data.user as User);
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Invalid email or password.';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setError(null);
    try {
      const data = await authApi.register(email, password, fullName);
      applySession(data.access_token, data.user as User);
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Could not create account.';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('personalverse_token');
    localStorage.removeItem('personalverse_user');
  }, []);

  // Let the axios 401 interceptor force a logout without a circular import.
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('personalverse:unauthorized', handler);
    return () => window.removeEventListener('personalverse:unauthorized', handler);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
