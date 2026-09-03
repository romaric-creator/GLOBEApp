import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncStatus } from '@prisma/client';
import * as mysql from 'mysql2/promise';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Cron('0 23 * * *')
  async syncScheduled() {
    this.logger.log('Sync automatique 23h00 déclenchée');
    await this.sync();
  }

  private parseConnectionUrl(url: string): { host: string; port: number; user: string; password: string; database: string } {
    const parsed = new URL(url.replace(/^mysql:\/\//, 'http://'));
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '').split('?')[0],
    };
  }

  private getRemoteConfigFromEnv(): { host: string; port: number; user: string; password: string; database: string } | null {
    const url = this.config.get<string>('REMOTE_DB_URL');
    if (url) return this.parseConnectionUrl(url);
    const host = this.config.get<string>('REMOTE_DB_HOST');
    const user = this.config.get<string>('REMOTE_DB_USER');
    const database = this.config.get<string>('REMOTE_DB_NAME');
    if (!host || !user || !database) return null;
    return {
      host,
      port: parseInt(this.config.get<string>('REMOTE_DB_PORT') ?? '3306', 10),
      user,
      password: this.config.get<string>('REMOTE_DB_PASSWORD') ?? '',
      database,
    };
  }

  private async getRemoteConfig(): Promise<{ host: string; port: number; user: string; password: string; database: string } | null> {
    const fromEnv = this.getRemoteConfigFromEnv();
    if (fromEnv) return fromEnv;
    const row = await this.prisma.appConfig.findUnique({ where: { key: 'REMOTE_DB_URL' } });
    if (!row?.value) return null;
    return this.parseConnectionUrl(row.value);
  }

  async saveRemoteConfig(url: string): Promise<void> {
    await this.prisma.appConfig.upsert({
      where: { key: 'REMOTE_DB_URL' },
      create: { key: 'REMOTE_DB_URL', value: url },
      update: { value: url },
    });
  }

  async getRemoteConfigUrl(): Promise<string | null> {
    const fromEnv = this.config.get<string>('REMOTE_DB_URL');
    if (fromEnv) return fromEnv;
    const row = await this.prisma.appConfig.findUnique({ where: { key: 'REMOTE_DB_URL' } });
    return row?.value ?? null;
  }

  async sync(): Promise<{ success: boolean; nbEnvois: number; erreur?: string }> {
    const remoteConfig = await this.getRemoteConfig();
    if (!remoteConfig) {
      return { success: false, nbEnvois: 0, erreur: 'Base de données distante non configurée' };
    }

    const log = await this.prisma.syncLog.create({ data: { statut: 'EN_COURS' } });

    let connection: mysql.Connection | null = null;
    try {
      connection = await mysql.createConnection({
        ...remoteConfig,
        ssl: { rejectUnauthorized: false },
        connectTimeout: 15000,
      });

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
          data: { statut: 'REUSSIE', nbEnvois: 0, details: 'Aucune donnée à synchroniser', completedAt: new Date() },
        });
        return { success: true, nbEnvois: 0 };
      }

      await this.upsertAll(connection, payload);
      await this.markSynced(payload);

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { statut: 'REUSSIE', nbEnvois, completedAt: new Date() },
      });

      this.logger.log(`Sync réussie — ${nbEnvois} enregistrements envoyés vers ${remoteConfig.host}/${remoteConfig.database}`);
      return { success: true, nbEnvois };
    } catch (err) {
      const erreur = err instanceof Error ? err.message : String(err);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { statut: 'ECHOUEE', erreur, completedAt: new Date() },
      });
      this.logger.error(`Sync échouée: ${erreur}`);
      return { success: false, nbEnvois: 0, erreur };
    } finally {
      if (connection) await connection.end().catch(() => {});
    }
  }

  private async upsertAll(
    conn: mysql.Connection,
    payload: Awaited<ReturnType<typeof this.collectPending>>,
  ) {
    for (const r of payload.reservations) {
      await conn.execute(
        `INSERT INTO reservations
           (id, dateArrivee, dateDepart, nbPersonnes, statut, montantTotal, notes, createdAt, chambreId, clientId, syncStatus, syncedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,'SYNCED',NOW())
         ON DUPLICATE KEY UPDATE
           statut=VALUES(statut), montantTotal=VALUES(montantTotal), notes=VALUES(notes), syncStatus='SYNCED', syncedAt=NOW()`,
        [r.id, r.dateArrivee, r.dateDepart, r.nbPersonnes, r.statut, r.montantTotal, r.notes ?? null, r.createdAt, r.chambreId, r.clientId] as any[],
      );
    }

    for (const f of payload.facturesSejour) {
      await conn.execute(
        `INSERT INTO factures_sejour
           (id, numero, montantNuitee, montantExtras, total, montantPaye, reste, payee, createdAt, reservationId, syncStatus, syncedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,'SYNCED',NOW())
         ON DUPLICATE KEY UPDATE
           montantPaye=VALUES(montantPaye), reste=VALUES(reste), payee=VALUES(payee), syncStatus='SYNCED', syncedAt=NOW()`,
        [f.id, f.numero, f.montantNuitee, f.montantExtras, f.total, f.montantPaye, f.reste, f.payee, f.createdAt, f.reservationId] as any[],
      );
    }

    for (const c of payload.commandes) {
      await conn.execute(
        `INSERT INTO commandes_table
           (id, numero, statut, total, notes, createdAt, completedAt, cancelledAt, serveurId, syncStatus, syncedAt)
         VALUES (?,?,?,?,?,?,?,?,?,'SYNCED',NOW())
         ON DUPLICATE KEY UPDATE
           statut=VALUES(statut), total=VALUES(total), completedAt=VALUES(completedAt), syncStatus='SYNCED', syncedAt=NOW()`,
        [c.id, c.numero, c.statut, c.total, c.notes ?? null, c.createdAt, c.completedAt ?? null, c.cancelledAt ?? null, c.serveurId] as any[],
      );
    }

    for (const p of payload.paiements) {
      await conn.execute(
        `INSERT INTO paiements
           (id, reference, montant, moyen, sourceType, statut, notes, createdAt, sessionId, userId, factureSejourId, commandeTableId, syncStatus, syncedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'SYNCED',NOW())
         ON DUPLICATE KEY UPDATE
           statut=VALUES(statut), syncStatus='SYNCED', syncedAt=NOW()`,
        [p.id, p.reference, p.montant, p.moyen, p.sourceType, p.statut, p.notes ?? null, p.createdAt, p.sessionId, p.userId, p.factureSejourId ?? null, p.commandeTableId ?? null] as any[],
      );
    }

    for (const d of payload.depenses) {
      await conn.execute(
        `INSERT INTO depenses
           (id, libelle, montant, centre, date, notes, createdAt, syncStatus, syncedAt)
         VALUES (?,?,?,?,?,?,?,'SYNCED',NOW())
         ON DUPLICATE KEY UPDATE
           libelle=VALUES(libelle), montant=VALUES(montant), notes=VALUES(notes), syncStatus='SYNCED', syncedAt=NOW()`,
        [d.id, d.libelle, d.montant, d.centre, d.date, d.notes ?? null, d.createdAt] as any[],
      );
    }
  }

  private async collectPending() {
    const [reservations, facturesSejour, commandes, paiements, depenses] = await Promise.all([
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
      this.prisma.paiement.findMany({ where: { syncStatus: SyncStatus.PENDING } }),
      this.prisma.depense.findMany({ where: { syncStatus: SyncStatus.PENDING } }),
    ]);
    return { reservations, facturesSejour, commandes, paiements, depenses };
  }

  private async markSynced(payload: Awaited<ReturnType<typeof this.collectPending>>) {
    const now = new Date();
    const ids = {
      reservations: payload.reservations.map((r) => r.id),
      facturesSejour: payload.facturesSejour.map((f) => f.id),
      commandes: payload.commandes.map((c) => c.id),
      paiements: payload.paiements.map((p) => p.id),
      depenses: payload.depenses.map((d) => d.id),
    };
    await Promise.all([
      ids.reservations.length && this.prisma.reservation.updateMany({ where: { id: { in: ids.reservations } }, data: { syncStatus: SyncStatus.SYNCED, syncedAt: now } }),
      ids.facturesSejour.length && this.prisma.factureSejour.updateMany({ where: { id: { in: ids.facturesSejour } }, data: { syncStatus: SyncStatus.SYNCED, syncedAt: now } }),
      ids.commandes.length && this.prisma.commandeTable.updateMany({ where: { id: { in: ids.commandes } }, data: { syncStatus: SyncStatus.SYNCED, syncedAt: now } }),
      ids.paiements.length && this.prisma.paiement.updateMany({ where: { id: { in: ids.paiements } }, data: { syncStatus: SyncStatus.SYNCED, syncedAt: now } }),
      ids.depenses.length && this.prisma.depense.updateMany({ where: { id: { in: ids.depenses } }, data: { syncStatus: SyncStatus.SYNCED, syncedAt: now } }),
    ]);
  }

  async getStatus() {
    const dernierLog = await this.prisma.syncLog.findFirst({ orderBy: { createdAt: 'desc' } });
    const pending = await Promise.all([
      this.prisma.reservation.count({ where: { syncStatus: SyncStatus.PENDING } }),
      this.prisma.factureSejour.count({ where: { syncStatus: SyncStatus.PENDING } }),
      this.prisma.commandeTable.count({ where: { syncStatus: SyncStatus.PENDING } }),
      this.prisma.paiement.count({ where: { syncStatus: SyncStatus.PENDING } }),
      this.prisma.depense.count({ where: { syncStatus: SyncStatus.PENDING } }),
    ]);
    return {
      dernierSync: dernierLog,
      nbEnAttente: pending.reduce((a, b) => a + b, 0),
      remoteConfigure: !!(await this.getRemoteConfig()),
    };
  }

  async getLogs(limit = 10) {
    return this.prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }

  async testConnection(
    creds?: { host: string; port: number; user: string; password: string; database: string } | { connectionUrl: string },
  ): Promise<{ ok: boolean; erreur?: string }> {
    const config = creds
      ? ('connectionUrl' in creds ? this.parseConnectionUrl(creds.connectionUrl) : creds)
      : await this.getRemoteConfig();
    if (!config) return { ok: false, erreur: 'Base de données distante non configurée' };
    let connection: mysql.Connection | null = null;
    try {
      connection = await mysql.createConnection({ ...config, ssl: { rejectUnauthorized: false }, connectTimeout: 10000 });
      await connection.execute('SELECT 1');
      return { ok: true };
    } catch (err) {
      return { ok: false, erreur: err instanceof Error ? err.message : String(err) };
    } finally {
      if (connection) await connection.end().catch(() => {});
    }
  }
}
