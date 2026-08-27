import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

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

      if (estExpiree) {
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
