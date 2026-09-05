import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient, SyncStatus } from '@prisma/client';
import * as mysql from 'mysql2/promise';
import { spawnSync } from 'child_process';
import { join } from 'path';

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
    try {
      const row = await this.prisma.appConfig.findUnique({ where: { key: 'REMOTE_DB_URL' } });
      if (!row?.value) return null;
      return this.parseConnectionUrl(row.value);
    } catch { return null; }
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
    try {
      const row = await this.prisma.appConfig.findUnique({ where: { key: 'REMOTE_DB_URL' } });
      return row?.value ?? null;
    } catch { return null; }
  }

  async sync(): Promise<{ success: boolean; nbEnvois: number; erreur?: string }> {
    const remoteConfig = await this.getRemoteConfig();
    if (!remoteConfig) {
      return { success: false, nbEnvois: 0, erreur: 'Base de données distante non configurée' };
    }

    const log = await this.prisma.syncLog.create({ data: { statut: 'EN_COURS' } });

    let connection: mysql.Connection | null = null;
    try {
      connection = await Promise.race([
        mysql.createConnection({ ...remoteConfig, ssl: { rejectUnauthorized: false }, connectTimeout: 10000 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connexion distante timeout (10s)')), 12000)),
      ]);

      await this.initRemoteSchema(connection);

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
      const erreur = (err instanceof Error ? err.message : String(err)).substring(0, 2000);
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

  private async initRemoteSchema(conn: mysql.Connection): Promise<void> {
    const tables: { name: string; sql: string }[] = [
      {
        name: 'reservations',
        sql: `CREATE TABLE IF NOT EXISTS \`reservations\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`typeReservation\` VARCHAR(20) NOT NULL DEFAULT 'NUIT',
          \`dateArrivee\` DATE NOT NULL,
          \`dateDepart\` DATE NOT NULL,
          \`heureArrivee\` VARCHAR(5),
          \`heureDepart\` VARCHAR(5),
          \`nbPersonnes\` INT NOT NULL DEFAULT 1,
          \`statut\` VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
          \`montantTotal\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`notes\` TEXT,
          \`typeDocumentClient\` VARCHAR(30),
          \`numeroDocumentClient\` VARCHAR(100),
          \`nationaliteClient\` VARCHAR(100),
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`chambreId\` VARCHAR(36) NOT NULL,
          \`clientId\` VARCHAR(36) NOT NULL,
          PRIMARY KEY (\`id\`)
        )`,
      },
      {
        name: 'factures_sejour',
        sql: `CREATE TABLE IF NOT EXISTS \`factures_sejour\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`numero\` VARCHAR(100) NOT NULL,
          \`montantNuitee\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`montantExtras\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`total\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`montantPaye\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`reste\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`payee\` TINYINT(1) NOT NULL DEFAULT 0,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`reservationId\` VARCHAR(36) NOT NULL,
          PRIMARY KEY (\`id\`)
        )`,
      },
      {
        name: 'commandes_table',
        sql: `CREATE TABLE IF NOT EXISTS \`commandes_table\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`numero\` VARCHAR(100) NOT NULL,
          \`statut\` VARCHAR(20) NOT NULL DEFAULT 'EN_PREPARATION',
          \`total\` DECIMAL(10,2) NOT NULL DEFAULT 0,
          \`notes\` TEXT,
          \`chambreNumero\` VARCHAR(10),
          \`clientNom\` VARCHAR(100),
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`completedAt\` DATETIME,
          \`cancelledAt\` DATETIME,
          \`serveurId\` VARCHAR(36),
          PRIMARY KEY (\`id\`)
        )`,
      },
      {
        name: 'paiements',
        sql: `CREATE TABLE IF NOT EXISTS \`paiements\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`reference\` VARCHAR(200) NOT NULL,
          \`montant\` DECIMAL(10,2) NOT NULL,
          \`moyen\` VARCHAR(20) NOT NULL DEFAULT 'ESPECES',
          \`sourceType\` VARCHAR(20),
          \`statut\` VARCHAR(20) NOT NULL DEFAULT 'ENCAISSE',
          \`notes\` TEXT,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`sessionId\` VARCHAR(36),
          \`userId\` VARCHAR(36),
          \`factureSejourId\` VARCHAR(36),
          \`commandeTableId\` VARCHAR(36),
          PRIMARY KEY (\`id\`)
        )`,
      },
      {
        name: 'depenses',
        sql: `CREATE TABLE IF NOT EXISTS \`depenses\` (
          \`id\` VARCHAR(36) NOT NULL,
          \`libelle\` VARCHAR(255) NOT NULL,
          \`montant\` DECIMAL(12,2) NOT NULL,
          \`centre\` VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
          \`date\` DATETIME NOT NULL,
          \`notes\` TEXT,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        )`,
      },
    ];

    for (const table of tables) {
      try {
        await conn.query(table.sql);
      } catch (err) {
        this.logger.error(`initRemoteSchema: failed to create table ${table.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async upsertAll(
    conn: mysql.Connection,
    payload: Awaited<ReturnType<typeof this.collectPending>>,
  ) {
    for (const r of payload.reservations) {
      await conn.query(
        `INSERT INTO reservations
           (id, typeReservation, dateArrivee, dateDepart, heureArrivee, heureDepart, nbPersonnes, statut, montantTotal, notes, typeDocumentClient, numeroDocumentClient, nationaliteClient, createdAt, chambreId, clientId)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           statut=VALUES(statut), montantTotal=VALUES(montantTotal), notes=VALUES(notes)`,
        [r.id, r.typeReservation, r.dateArrivee, r.dateDepart, r.heureArrivee ?? null, r.heureDepart ?? null, r.nbPersonnes, r.statut, r.montantTotal, r.notes ?? null, r.typeDocumentClient ?? null, r.numeroDocumentClient ?? null, r.nationaliteClient ?? null, r.createdAt, r.chambreId, r.clientId] as any[],
      );
    }

    for (const f of payload.facturesSejour) {
      await conn.query(
        `INSERT INTO factures_sejour
           (id, numero, montantNuitee, montantExtras, total, montantPaye, reste, payee, createdAt, reservationId)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           montantPaye=VALUES(montantPaye), reste=VALUES(reste), payee=VALUES(payee)`,
        [f.id, f.numero, f.montantNuitee, f.montantExtras, f.total, f.montantPaye, f.reste, f.payee, f.createdAt, f.reservationId] as any[],
      );
    }

    for (const c of payload.commandes) {
      await conn.query(
        `INSERT INTO commandes_table
           (id, numero, statut, total, notes, chambreNumero, clientNom, createdAt, completedAt, cancelledAt, serveurId)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           statut=VALUES(statut), total=VALUES(total), completedAt=VALUES(completedAt)`,
        [c.id, c.numero, c.statut, c.total, c.notes ?? null, c.chambreNumero ?? null, c.clientNom ?? null, c.createdAt, c.completedAt ?? null, c.cancelledAt ?? null, c.serveurId] as any[],
      );
    }

    for (const p of payload.paiements) {
      await conn.query(
        `INSERT INTO paiements
           (id, reference, montant, moyen, sourceType, statut, notes, createdAt, sessionId, userId, factureSejourId, commandeTableId)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           statut=VALUES(statut)`,
        [p.id, p.reference, p.montant, p.moyen, p.sourceType, p.statut, p.notes ?? null, p.createdAt, p.sessionId, p.userId, p.factureSejourId ?? null, p.commandeTableId ?? null] as any[],
      );
    }

    for (const d of payload.depenses) {
      await conn.query(
        `INSERT INTO depenses
           (id, libelle, montant, centre, \`date\`, notes, createdAt)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           libelle=VALUES(libelle), montant=VALUES(montant), notes=VALUES(notes)`,
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
      connection = await Promise.race([
        mysql.createConnection({ ...config, ssl: { rejectUnauthorized: false }, connectTimeout: 8000 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connexion timeout (10s)')), 10000)),
      ]);
      await connection.query('SELECT 1');
      return { ok: true };
    } catch (err) {
      return { ok: false, erreur: err instanceof Error ? err.message : String(err) };
    } finally {
      if (connection) await connection.end().catch(() => {});
    }
  }

  async pushSchemaToRemote(): Promise<{ ok: boolean; message: string }> {
    const url = await this.getRemoteConfigUrl();
    if (!url) return { ok: false, message: 'Base de données distante non configurée' };

    // TiDB Cloud requires SSL. Strip mysql2-style ssl param and use Prisma's SSL format.
    const prismaUrl = `${url.split('?')[0]}?sslaccept=accept_invalid_certs`;

    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const result = spawnSync(
      'npx',
      ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate', `--schema=${schemaPath}`],
      {
        env: { ...process.env, DATABASE_URL: prismaUrl },
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 120_000,
      },
    );

    if (result.error || result.status !== 0) {
      const msg = result.stderr || result.error?.message || 'Erreur inconnue';
      this.logger.error(`pushSchemaToRemote failed: ${msg}`);
      return { ok: false, message: msg };
    }
    this.logger.log('pushSchemaToRemote: success');
    return { ok: true, message: result.stdout || 'Schéma appliqué avec succès' };
  }

  async backupFull(): Promise<{ ok: boolean; nbEnvois: number; erreur?: string }> {
    // pushSchemaToRemote is skipped here: backupAll() uses FOREIGN_KEY_CHECKS=0 and
    // handles a full reset atomically. Schema must be initialised manually on first use.
    return this.backupAll();
  }

  async backupAll(): Promise<{ ok: boolean; nbEnvois: number; erreur?: string }> {
    const url = await this.getRemoteConfigUrl();
    if (!url) return { ok: false, nbEnvois: 0, erreur: 'Base de données distante non configurée' };

    const sslUrl = url.includes('?')
      ? url + '&connect_timeout=10&pool_timeout=10'
      : `${url}?sslaccept=accept_invalid_certs&connect_timeout=10&pool_timeout=10`;
    const log = await this.prisma.syncLog.create({ data: { statut: 'EN_COURS' } });
    const remote = new PrismaClient({ datasources: { db: { url: sslUrl } } });

    try {
      // 1. Fetch all local data upfront — outside the transaction
      const [
        roles, permissions, rolePermissions, categories, categoriesCompta,
        fournisseurs, caisses, typesReservationSalle, clients, chambres,
        users, produits, comptes, employes, sessions, sessionsCaisse,
        bonsCommande, accessoiresPiscine, reservations, commandesTables,
        ticketsPiscine, abonnementsLoisir, reservationsSalle, pointages,
        conges, mouvementsStock, lignesBonCommande, facturesSejour,
        lignesCommande, paiementsTranche, paiements, mouvementsCaisse,
        ecritures, clotures, depenses, transactionsAccessoire,
        logsConnexion, notifications,
      ] = await Promise.all([
        this.prisma.role.findMany(),
        this.prisma.permission.findMany(),
        this.prisma.rolePermission.findMany(),
        this.prisma.categorie.findMany(),
        this.prisma.categorieCompta.findMany(),
        this.prisma.fournisseur.findMany(),
        this.prisma.caisse.findMany(),
        this.prisma.typeReservationSalle.findMany(),
        this.prisma.client.findMany(),
        this.prisma.chambre.findMany(),
        this.prisma.user.findMany(),
        this.prisma.produit.findMany(),
        this.prisma.compte.findMany(),
        this.prisma.employe.findMany(),
        this.prisma.session.findMany(),
        this.prisma.sessionCaisse.findMany(),
        this.prisma.bonCommande.findMany(),
        this.prisma.accessoirePiscine.findMany(),
        this.prisma.reservation.findMany(),
        this.prisma.commandeTable.findMany(),
        this.prisma.ticketPiscine.findMany(),
        this.prisma.abonnementLoisir.findMany(),
        this.prisma.reservationSalle.findMany(),
        this.prisma.pointage.findMany(),
        this.prisma.conge.findMany(),
        this.prisma.mouvementStock.findMany(),
        this.prisma.ligneBonCommande.findMany(),
        this.prisma.factureSejour.findMany(),
        this.prisma.ligneCommande.findMany(),
        this.prisma.paiementTranche.findMany(),
        this.prisma.paiement.findMany(),
        this.prisma.mouvementCaisse.findMany(),
        this.prisma.ecriture.findMany(),
        this.prisma.cloture.findMany(),
        this.prisma.depense.findMany(),
        this.prisma.transactionAccessoire.findMany(),
        this.prisma.logConnexion.findMany(),
        this.prisma.notification.findMany(),
      ]);

      // 2. Full reset + insert in a single transaction — atomic: rollback on any error
      let total = 0;
      await remote.$transaction(async (tx) => {
        await tx.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

        // Delete in reverse dependency order (leaf tables first)
        await tx.notification.deleteMany({});
        await tx.logConnexion.deleteMany({});
        await tx.transactionAccessoire.deleteMany({});
        await tx.depense.deleteMany({});
        await tx.cloture.deleteMany({});
        await tx.ecriture.deleteMany({});
        await tx.mouvementCaisse.deleteMany({});
        await tx.paiement.deleteMany({});
        await tx.paiementTranche.deleteMany({});
        await tx.ligneCommande.deleteMany({});
        await tx.factureSejour.deleteMany({});
        await tx.ligneBonCommande.deleteMany({});
        await tx.mouvementStock.deleteMany({});
        await tx.conge.deleteMany({});
        await tx.pointage.deleteMany({});
        await tx.reservationSalle.deleteMany({});
        await tx.abonnementLoisir.deleteMany({});
        await tx.ticketPiscine.deleteMany({});
        await tx.commandeTable.deleteMany({});
        await tx.reservation.deleteMany({});
        await tx.accessoirePiscine.deleteMany({});
        await tx.bonCommande.deleteMany({});
        await tx.sessionCaisse.deleteMany({});
        await tx.session.deleteMany({});
        await tx.employe.deleteMany({});
        await tx.compte.deleteMany({});
        await tx.produit.deleteMany({});
        await tx.user.deleteMany({});
        await tx.chambre.deleteMany({});
        await tx.client.deleteMany({});
        await tx.typeReservationSalle.deleteMany({});
        await tx.caisse.deleteMany({});
        await tx.fournisseur.deleteMany({});
        await tx.categorieCompta.deleteMany({});
        await tx.categorie.deleteMany({});
        await tx.rolePermission.deleteMany({});
        await tx.permission.deleteMany({});
        await tx.role.deleteMany({});

        // Insert in forward dependency order (parent tables first)
        const ins = async (data: any[], fn: (d: any[]) => Promise<{ count: number }>) => {
          if (!data.length) return;
          const r = await fn(data);
          total += r.count;
        };

        await ins(roles,                  (d) => tx.role.createMany({ data: d }));
        await ins(permissions,            (d) => tx.permission.createMany({ data: d }));
        await ins(rolePermissions,        (d) => tx.rolePermission.createMany({ data: d }));
        await ins(categories,             (d) => tx.categorie.createMany({ data: d }));
        await ins(categoriesCompta,       (d) => tx.categorieCompta.createMany({ data: d }));
        await ins(fournisseurs,           (d) => tx.fournisseur.createMany({ data: d }));
        await ins(caisses,                (d) => tx.caisse.createMany({ data: d }));
        await ins(typesReservationSalle,  (d) => tx.typeReservationSalle.createMany({ data: d }));
        await ins(clients,                (d) => tx.client.createMany({ data: d }));
        await ins(chambres,               (d) => tx.chambre.createMany({ data: d }));
        await ins(users,                  (d) => tx.user.createMany({ data: d }));
        await ins(produits,               (d) => tx.produit.createMany({ data: d }));
        await ins(comptes,                (d) => tx.compte.createMany({ data: d }));
        await ins(employes,               (d) => tx.employe.createMany({ data: d }));
        await ins(sessions,               (d) => tx.session.createMany({ data: d }));
        await ins(sessionsCaisse,         (d) => tx.sessionCaisse.createMany({ data: d }));
        await ins(bonsCommande,           (d) => tx.bonCommande.createMany({ data: d }));
        await ins(accessoiresPiscine,     (d) => tx.accessoirePiscine.createMany({ data: d }));
        await ins(reservations,           (d) => tx.reservation.createMany({ data: d }));
        await ins(commandesTables,        (d) => tx.commandeTable.createMany({ data: d }));
        await ins(ticketsPiscine,         (d) => tx.ticketPiscine.createMany({ data: d }));
        await ins(abonnementsLoisir,      (d) => tx.abonnementLoisir.createMany({ data: d }));
        await ins(reservationsSalle,      (d) => tx.reservationSalle.createMany({ data: d }));
        await ins(pointages,              (d) => tx.pointage.createMany({ data: d }));
        await ins(conges,                 (d) => tx.conge.createMany({ data: d }));
        await ins(mouvementsStock,        (d) => tx.mouvementStock.createMany({ data: d }));
        await ins(lignesBonCommande,      (d) => tx.ligneBonCommande.createMany({ data: d }));
        await ins(facturesSejour,         (d) => tx.factureSejour.createMany({ data: d }));
        await ins(lignesCommande,         (d) => tx.ligneCommande.createMany({ data: d }));
        await ins(paiementsTranche,       (d) => tx.paiementTranche.createMany({ data: d }));
        await ins(paiements,              (d) => tx.paiement.createMany({ data: d }));
        await ins(mouvementsCaisse,       (d) => tx.mouvementCaisse.createMany({ data: d }));
        await ins(ecritures,              (d) => tx.ecriture.createMany({ data: d }));
        await ins(clotures,               (d) => tx.cloture.createMany({ data: d }));
        await ins(depenses,               (d) => tx.depense.createMany({ data: d }));
        await ins(transactionsAccessoire, (d) => tx.transactionAccessoire.createMany({ data: d }));
        await ins(logsConnexion,          (d) => tx.logConnexion.createMany({ data: d }));
        await ins(notifications,          (d) => tx.notification.createMany({ data: d }));

        await tx.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
      }, { maxWait: 60_000, timeout: 300_000 });

      this.logger.log(`backupAll: transaction committed — ${total} records`);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { statut: 'REUSSIE', nbEnvois: total, completedAt: new Date() },
      });
      return { ok: true, nbEnvois: total };
    } catch (err) {
      const erreur = (err instanceof Error ? err.message : String(err)).substring(0, 2000);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { statut: 'ECHOUEE', erreur, completedAt: new Date() },
      });
      this.logger.error(`backupAll failed: ${erreur}`);
      return { ok: false, nbEnvois: 0, erreur };
    } finally {
      await remote.$disconnect();
    }
  }
}
