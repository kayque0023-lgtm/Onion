import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qualiqa_token');
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('qualiqa_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('qualiqa_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    localStorage.setItem('qualiqa_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('qualiqa_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data.user);
      return res.data.user;
    } catch {
      return null;
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isEditor = () => user?.role === 'editor';
  const canEdit = () => user?.role === 'admin' || user?.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser, isAdmin, isEditor, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
