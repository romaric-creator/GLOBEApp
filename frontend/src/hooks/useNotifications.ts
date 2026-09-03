import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { App } from 'antd';
import { useNotificationsStore } from '../store/notifications';
import api from '../api/axios';

interface NotificationPayload {
  id?: string;
  type: 'RESERVATION_EXPIREE' | 'CAISSE_ALERTE' | 'STOCK_ALERTE' | 'INFO';
  titre: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
  lu?: boolean;
}

const NOTIFICATION_TYPES: Record<string, 'warning' | 'error' | 'info'> = {
  RESERVATION_EXPIREE: 'warning',
  CAISSE_ALERTE: 'error',
  STOCK_ALERTE: 'warning',
  INFO: 'info',
};

const USE_POLLING = import.meta.env.VITE_USE_POLLING === 'true';

export function useNotifications() {
  const { notification } = App.useApp();
  const { add, setItems, loaded, items } = useNotificationsStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!loaded) {
      api.get('/notifications?limit=50').then((res) => {
        setItems(res.data);
      }).catch(() => {});
    }
  }, [loaded, setItems]);

  // Polling mode: used when deployed on Vercel (no WebSocket support)
  useEffect(() => {
    if (!USE_POLLING) return;

    const poll = async () => {
      try {
        const res = await api.get<NotificationPayload[]>('/notifications?limit=20');
        const known = new Set(items.map((n) => n.id));
        const fresh = res.data.filter((n) => n.id && !known.has(n.id));
        fresh.forEach((payload) => {
          add({
            id: payload.id,
            type: payload.type,
            titre: payload.titre,
            message: payload.message,
            data: payload.data,
            createdAt: payload.createdAt || new Date().toISOString(),
          });
          const type = NOTIFICATION_TYPES[payload.type] || 'info';
          notification[type]({
            message: payload.titre,
            description: payload.message,
            placement: 'topRight',
            duration: type === 'error' ? 0 : 8,
          });
        });
      } catch {}
    };

    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [USE_POLLING, notification, add, items]);

  // WebSocket mode: used in Electron / local deployment
  useEffect(() => {
    if (USE_POLLING) return;

    const apiUrl = (window as any).__GLOBE_API_URL__ ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    const token = localStorage.getItem('accessToken') ?? '';
    const socket = io(`${baseUrl}/notifications`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socket.on('notification', (payload: NotificationPayload) => {
      add({
        id: payload.id,
        type: payload.type,
        titre: payload.titre,
        message: payload.message,
        data: payload.data,
        createdAt: payload.createdAt || new Date().toISOString(),
      });

      const type = NOTIFICATION_TYPES[payload.type] || 'info';
      notification[type]({
        message: payload.titre,
        description: payload.message,
        placement: 'topRight',
        duration: type === 'error' ? 0 : 8,
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [USE_POLLING, notification, add]);
}
