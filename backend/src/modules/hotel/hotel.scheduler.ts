import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class HotelScheduler {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReservationsExpirees() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const heureActuelle = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const reservations = await this.prisma.reservation.findMany({
      where: { statut: 'EN_COURS' },
      include: {
        chambre: { select: { id: true, numero: true } },
        client: { select: { nom: true, prenom: true } },
      },
    });

    for (const reservation of reservations) {
      const dateDepart = reservation.dateDepart.toISOString().split('T')[0];
      const heureDepart = reservation.heureDepart ?? '12:00';

      const estExpiree =
        dateDepart < today ||
        (dateDepart === today && heureActuelle >= heureDepart);

      if (!estExpiree) continue;

      // Deduplication via JSON_EXTRACT (Prisma JSON path filter unreliable on MySQL/TiDB)
      const rows = await this.prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) AS cnt FROM notifications
        WHERE type = 'RESERVATION_EXPIREE'
          AND createdAt >= ${since24h}
          AND JSON_EXTRACT(data, '$.reservationId') = ${reservation.id}
      `;
      const dejaNotifiee = Number(rows[0]?.cnt) > 0;

      if (!dejaNotifiee) {
        this.notifications.notifierReservationExpiree({
          reservationId: reservation.id,
          numeroChambre: reservation.chambre.numero,
          clientNom: `${reservation.client.nom} ${reservation.client.prenom || ''}`.trim(),
          heureDepart,
        });
      }
    }
  }
}
