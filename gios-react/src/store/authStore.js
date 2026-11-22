import { create } from 'zustand';
import giosApi, { loginUser, logoutUser } from '../api/giosApi';

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
      const raw = err.response?.data?.detail;
      const detail = Array.isArray(raw)
        ? raw.map((item) => `${item.loc?.slice(-1)[0]}: ${item.msg}`).join('; ')
        : raw || 'Registration failed or backend offline';
      set({ error: detail });
      throw new Error(detail);
    }
  },
  logout: async () => {
    localStorage.removeItem('gios_token');
    set({ token: null, isAuthenticated: false, error: null });
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Could not clear the server session cookie', err);
    }
  }
}));

export default useAuthStore;
