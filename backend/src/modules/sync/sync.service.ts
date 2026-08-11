import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  @Cron('0 23 * * *')
  async syncScheduled() {
    this.logger.log('Sync automatique 23h00 déclenchée');
    await this.sync();
  }

  async sync(): Promise<{
    success: boolean;
    nbEnvois: number;
    erreur?: string;
  }> {
    const remoteUrl = this.config.get<string>('SYNC_REMOTE_URL');
    const apiKey = this.config.get<string>('SYNC_API_KEY');

    if (!remoteUrl) {
      return {
        success: false,
        nbEnvois: 0,
        erreur: 'SYNC_REMOTE_URL non configurée',
      };
    }

    const log = await this.prisma.syncLog.create({
      data: { statut: 'EN_COURS' },
    });

    try {
      const payload = await this.collectPending();
      const nbEnvois =
        payload.reservations.length +
        payload.facturesSejour.length +
        payload.commandes.length +
        payload.paiements.length +
        payload.depenses.length;

      if (nbEnvois === 0) {
        await this.prisma.syncLog.update({
          where: { id: log.id },
          data: {
            statut: 'REUSSIE',
            nbEnvois: 0,
            details: 'Aucune donnée à synchroniser',
            completedAt: new Date(),
          },
        });
        return { success: true, nbEnvois: 0 };
      }

      await firstValueFrom(
        this.httpService.post(`${remoteUrl}/api/sync/receive`, payload, {
          headers: { 'x-sync-key': apiKey ?? '' },
          timeout: 30000,
        }),
      );

      await this.markSynced(payload);

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { statut: 'REUSSIE', nbEnvois, completedAt: new Date() },
      });

      this.logger.log(`Sync réussie — ${nbEnvois} enregistrements envoyés`);
      return { success: true, nbEnvois };
    } catch (err) {
      const erreur = err instanceof Error ? err.message : String(err);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { statut: 'ECHOUEE', erreur, completedAt: new Date() },
      });
      this.logger.error(`Sync échouée: ${erreur}`);
      return { success: false, nbEnvois: 0, erreur };
    }
  }

  private async collectPending() {
    const [reservations, facturesSejour, commandes, paiements, depenses] =
      await Promise.all([
        this.prisma.reservation.findMany({
          where: { syncStatus: SyncStatus.PENDING },
          include: { chambre: true, client: true },
        }),
        this.prisma.factureSejour.findMany({
          where: { syncStatus: SyncStatus.PENDING },
          include: { reservation: true, paiement: true },
        }),
        this.prisma.commandeTable.findMany({
          where: { syncStatus: SyncStatus.PENDING },
          include: { lignes: { include: { produit: true } } },
        }),
        this.prisma.paiement.findMany({
          where: { syncStatus: SyncStatus.PENDING },
        }),
        this.prisma.depense.findMany({
          where: { syncStatus: SyncStatus.PENDING },
        }),
      ]);

    return { reservations, facturesSejour, commandes, paiements, depenses };
  }

  private async markSynced(
    payload: Awaited<ReturnType<typeof this.collectPending>>,
  ) {
    const now = new Date();

    const ids = {
      reservations: payload.reservations.map((r) => r.id),
      facturesSejour: payload.facturesSejour.map((f) => f.id),
      commandes: payload.commandes.map((c) => c.id),
      paiements: payload.paiements.map((p) => p.id),
      depenses: payload.depenses.map((d) => d.id),
    };

    await Promise.all([
      ids.reservations.length &&
        this.prisma.reservation.updateMany({
          where: { id: { in: ids.reservations } },
          data: { syncStatus: SyncStatus.SYNCED, syncedAt: now },
        }),
      ids.facturesSejour.length &&
        this.prisma.factureSejour.updateMany({
          where: { id: { in: ids.facturesSejour } },
          data: { syncStatus: SyncStatus.SYNCED, syncedAt: now },
        }),
      ids.commandes.length &&
        this.prisma.commandeTable.updateMany({
          where: { id: { in: ids.commandes } },
          data: { syncStatus: SyncStatus.SYNCED, syncedAt: now },
        }),
      ids.paiements.length &&
        this.prisma.paiement.updateMany({
          where: { id: { in: ids.paiements } },
          data: { syncStatus: SyncStatus.SYNCED, syncedAt: now },
        }),
      ids.depenses.length &&
        this.prisma.depense.updateMany({
          where: { id: { in: ids.depenses } },
          data: { syncStatus: SyncStatus.SYNCED, syncedAt: now },
        }),
    ]);
  }

  async getStatus() {
    const dernierLog = await this.prisma.syncLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const pending = await Promise.all([
      this.prisma.reservation.count({
        where: { syncStatus: SyncStatus.PENDING },
      }),
      this.prisma.factureSejour.count({
        where: { syncStatus: SyncStatus.PENDING },
      }),
      this.prisma.commandeTable.count({
        where: { syncStatus: SyncStatus.PENDING },
      }),
      this.prisma.paiement.count({ where: { syncStatus: SyncStatus.PENDING } }),
      this.prisma.depense.count({ where: { syncStatus: SyncStatus.PENDING } }),
    ]);

    return {
      dernierSync: dernierLog,
      nbEnAttente: pending.reduce((a, b) => a + b, 0),
      remoteConfigure: !!this.config.get('SYNC_REMOTE_URL'),
    };
  }

  async getLogs(limit = 10) {
    return this.prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
