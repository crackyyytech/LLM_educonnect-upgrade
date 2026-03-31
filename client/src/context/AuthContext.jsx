import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('kalvi_token'));
  const [loading, setLoading] = useState(true);
  const interceptorRef        = useRef(null);

  // Attach token + auto-logout on 401
  useEffect(() => {
    if (interceptorRef.current !== null) {
      axios.interceptors.response.eject(interceptorRef.current);
    }
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('kalvi_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('kalvi_token');
    }
    interceptorRef.current = axios.interceptors.response.use(
      r => r,
      err => {
        if (err.response?.status === 401 && token) {
          setToken(null); setUser(null);
        }
        return Promise.reject(err);
      }
    );
  }, [token]);

  // Verify stored token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => { setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (fields) => {
    const res = await axios.post('/api/auth/register', fields);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const res = await axios.patch(`/api/auth/users/${user._id}`, updates);
    setUser(res.data.user);
    return res.data.user;
  }, [user?._id]);

  const syncProgress = useCallback(async (progress) => {
    if (!token) return;
    try { await axios.patch('/api/auth/progress', progress); } catch {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, syncProgress }}>
      {children}
    </AuthContext.Provider>
  );
}
