import { create } from 'zustand';
import giosApi, { loginUser, logoutUser } from '../api/giosApi';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('gios_token') || null,
  isAuthenticated: !!localStorage.getItem('gios_token'),
  username: localStorage.getItem('tiepoint_user') || null,
  error: null,
  login: async (username, password) => {
    try {
      set({ error: null });
      const data = await loginUser(username.trim(), password);
      const token = data.access_token;
      localStorage.setItem('gios_token', token);
      localStorage.setItem('tiepoint_user', username.trim());
      set({ token, username: username.trim(), isAuthenticated: true, error: null });
    } catch (err) {
      let detail = 'Could not reach the server. Is the backend running?';
      if (err.response?.status === 401) {
        detail = 'That username and password don\u2019t match.';
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
    localStorage.removeItem('tiepoint_user');
    set({ token: null, username: null, isAuthenticated: false, error: null });
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Could not clear the server session cookie', err);
    }
  }
}));

export default useAuthStore;
