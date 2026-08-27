import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export interface NotificationPayload {
  type: 'RESERVATION_EXPIREE' | 'CAISSE_ALERTE' | 'STOCK_ALERTE' | 'INFO';
  titre: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  /**
   * Émet une notification à tous les clients connectés
   */
  emitNotification(payload: NotificationPayload) {
    this.server.emit('notification', payload);
  }

  /**
   * Notifie qu'une réservation hôtelière a expiré / le temps est écoulé
   */
  notifierReservationExpiree(data: {
    reservationId: string;
    numeroChambre: string;
    clientNom: string;
    heureDepart: string;
  }) {
    this.emitNotification({
      type: 'RESERVATION_EXPIREE',
      titre: `⏰ Chambre ${data.numeroChambre} — Temps écoulé`,
      message: `La réservation de ${data.clientNom} a expiré (départ prévu: ${data.heureDepart}). Veuillez procéder au check-out.`,
      data,
      createdAt: new Date(),
    });
  }
}
