import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'RESERVATION_EXPIREE' | 'CAISSE_ALERTE' | 'STOCK_ALERTE' | 'INFO';
  titre: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
  lu: boolean;
}

interface NotificationsState {
  items: AppNotification[];
  loaded: boolean;
  setItems: (items: AppNotification[]) => void;
  add: (notif: Omit<AppNotification, 'lu' | 'id'> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  loaded: false,
  setItems: (items) => set({ items, loaded: true }),
  add: (notif) =>
    set((s) => ({
      items: [{ ...notif, id: notif.id ?? crypto.randomUUID(), lu: false }, ...s.items].slice(0, 50),
    })),
  markRead: (id) =>
    set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, lu: true } : n)) })),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((n) => ({ ...n, lu: true })) })),
  clear: () => set({ items: [] }),
}));
