import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
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
export class NotificationsGateway implements OnGatewayConnection {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = (client.handshake.auth as { token?: string })?.token;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      this.jwtService.verify(token);
    } catch {
      client.disconnect();
    }
  }

  async emitNotification(payload: NotificationPayload) {
    const record = await this.prisma.notification.create({
      data: {
        type: payload.type,
        titre: payload.titre,
        message: payload.message,
        data: payload.data
          ? JSON.parse(JSON.stringify(payload.data))
          : undefined,
      },
    });

    this.server.emit('notification', {
      id: record.id,
      type: record.type,
      titre: record.titre,
      message: record.message,
      data: record.data,
      lu: record.lu,
      createdAt: record.createdAt,
    });

    return record;
  }

  notifierReservationExpiree(data: {
    reservationId: string;
    numeroChambre: string;
    clientNom: string;
    heureDepart: string;
  }) {
    return this.emitNotification({
      type: 'RESERVATION_EXPIREE',
      titre: `Chambre ${data.numeroChambre} — Temps ecoule`,
      message: `La reservation de ${data.clientNom} a expire (depart prevu: ${data.heureDepart}). Veuillez proceder au check-out.`,
      data,
      createdAt: new Date(),
    });
  }
}
