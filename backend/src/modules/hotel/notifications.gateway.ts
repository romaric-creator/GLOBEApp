import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

  @WebSocketServer()
  server: Server;

  async emitNotification(payload: NotificationPayload) {
    await this.prisma.notification.create({
      data: {
        type: payload.type,
        titre: payload.titre,
        message: payload.message,
        data: payload.data ? JSON.parse(JSON.stringify(payload.data)) : undefined,
      },
    });

    this.server.emit('notification', payload);
  }

  notifierReservationExpiree(data: {
    reservationId: string;
    numeroChambre: string;
    clientNom: string;
    heureDepart: string;
  }) {
    this.emitNotification({
      type: 'RESERVATION_EXPIREE',
      titre: `Chambre ${data.numeroChambre} — Temps ecoule`,
      message: `La reservation de ${data.clientNom} a expire (depart prevu: ${data.heureDepart}). Veuillez proceder au check-out.`,
      data,
      createdAt: new Date(),
    });
  }
}
