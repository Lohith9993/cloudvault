import { create } from 'zustand';
import { authAPI } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login(email, password);
      set({ user: res.data.user, token: res.data.token, isLoading: false });
      // Save token simply (in production, use react-native-async-storage)
      (global as any).token = res.data.token; 
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Login failed', isLoading: false });
    }
  },
  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.register(name, email, password);
      set({ user: res.data.user, token: res.data.token, isLoading: false });
      (global as any).token = res.data.token;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Registration failed', isLoading: false });
    }
  },
  logout: () => {
    set({ user: null, token: null });
    (global as any).token = null;
  },
}));
