import { create } from 'zustand';
import giosApi, { loginUser } from '../api/giosApi';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('gios_token') || null,
  isAuthenticated: !!localStorage.getItem('gios_token'),
  error: null,
  login: async (username, password) => {
    try {
      set({ error: null });
      const data = await loginUser(username.trim(), password);
      const token = data.access_token;
      localStorage.setItem('gios_token', token);
      set({ token, isAuthenticated: true, error: null });
    } catch (err) {
      let detail = 'Invalid credentials or backend offline';
      if (err.response?.status === 401) {
        detail = 'Incorrect ID or password. Access Denied.';
      } else if (err.response?.data?.detail) {
        detail = err.response.data.detail;
      }
      set({ error: detail, isAuthenticated: false });
      throw err;
    }
  },
  register: async (username, password) => {
    try {
      set({ error: null });
      const response = await giosApi.post('/api/v1/auth/register', { username: username.trim(), password });
      return response.data;
    } catch (err) {
      const detail = err.response?.data?.detail || 'Registration failed or backend offline';
      throw new Error(detail);
    }
  },
  logout: () => {
    localStorage.removeItem('gios_token');
    set({ token: null, isAuthenticated: false, error: null });
  }
}));

export default useAuthStore;
