import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSauvegardeDto } from './dto/create-sauvegarde.dto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { stat, mkdir } from 'fs/promises';
import { URL } from 'url';
import { homedir } from 'os';
import { join } from 'path';

@Injectable()
export class SauvegardeService {
  private readonly logger = new Logger(SauvegardeService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll() {
    const sauvegardes = await this.prisma.sauvegarde.findMany({
      orderBy: { date: 'desc' },
    });
    return sauvegardes.map((s) => ({
      ...s,
      taille: s.taille ? Number(s.taille) : null,
    }));
  }

  private getBackupDir(): string {
    return this.configService.get<string>('BACKUP_DIR') || join(homedir(), 'globe-backups');
  }

  async create(dto: CreateSauvegardeDto) {
    const backupDir = this.getBackupDir();
    const filename = `backup_${Date.now()}.sql`;
    const chemin = join(backupDir, filename);

    const sauvegarde = await this.prisma.sauvegarde.create({
      data: {
        date: new Date(),
        chemin,
        type: dto.type,
        statut: 'EN_COURS',
      },
    });

    try {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw new Error('DATABASE_URL non configuree');
      }
      await mkdir(backupDir, { recursive: true });
      const execFileAsync = promisify(execFile);
      const dbUrl = new URL(databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '3306';
      const user = dbUrl.username;
      const password = dbUrl.password;
      const database = dbUrl.pathname.replace(/^\//, '');
      await execFileAsync('mysqldump', [
        `-h${host}`,
        `-P${port}`,
        `-u${user}`,
        `-p${password}`,
        '--skip-ssl',
        '--single-transaction',
        '--routines',
        '--result-file',
        chemin,
        database,
      ]);

      const fileStats = await stat(chemin);

      const updated = await this.prisma.sauvegarde.update({
        where: { id: sauvegarde.id },
        data: {
          statut: 'REUSSIE',
          taille: fileStats.size,
        },
      });
      return {
        ...updated,
        taille: updated.taille ? Number(updated.taille) : null,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Echec de la sauvegarde: ${msg}`);

      const updated = await this.prisma.sauvegarde.update({
        where: { id: sauvegarde.id },
        data: { statut: 'ECHOUEE' },
      });
      return { ...updated, taille: null };
    }
  }

  async getLatest() {
    const s = await this.prisma.sauvegarde.findFirst({
      where: { statut: 'REUSSIE' },
      orderBy: { date: 'desc' },
    });
    if (!s) return null;
    return { ...s, taille: s.taille ? Number(s.taille) : null };
  }

  async getStats() {
    const totalSauvegardes = await this.prisma.sauvegarde.count();

    const derniereSauvegarde = await this.prisma.sauvegarde.findFirst({
      where: { statut: 'REUSSIE' },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const tailleTotale = await this.prisma.sauvegarde.aggregate({
      where: { statut: 'REUSSIE' },
      _sum: { taille: true },
    });

    return {
      totalSauvegardes,
      derniereSauvegarde: derniereSauvegarde?.date || null,
      tailleTotale: Number(tailleTotale._sum.taille || 0),
    };
  }
}
