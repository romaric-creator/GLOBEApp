import { create } from 'zustand';

interface Permission {
  module: string;
  action: string;
}

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  permissions?: Permission[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
  hasPermission: (module: string, action: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'admin') return true;
    return (user.permissions ?? []).some((p) => p.module === module && p.action === action);
  },
}));
