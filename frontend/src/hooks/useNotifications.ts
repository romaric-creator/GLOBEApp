import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { App } from 'antd';
import { useNotificationsStore } from '../store/notifications';
import api from '../api/axios';

interface NotificationPayload {
  type: 'RESERVATION_EXPIREE' | 'CAISSE_ALERTE' | 'STOCK_ALERTE' | 'INFO';
  titre: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

const NOTIFICATION_TYPES: Record<string, 'warning' | 'error' | 'info'> = {
  RESERVATION_EXPIREE: 'warning',
  CAISSE_ALERTE: 'error',
  STOCK_ALERTE: 'warning',
  INFO: 'info',
};

export function useNotifications() {
  const { notification } = App.useApp();
  const { add, setItems, loaded } = useNotificationsStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!loaded) {
      api.get('/notifications?limit=50').then((res) => {
        setItems(res.data);
      }).catch(() => {});
    }
  }, [loaded, setItems]);

  useEffect(() => {
    const apiUrl = (window as any).__GLOBE_API_URL__ ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket = io(`${baseUrl}/notifications`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socket.on('notification', (payload: NotificationPayload) => {
      add({
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
  }, [notification, add]);
}
