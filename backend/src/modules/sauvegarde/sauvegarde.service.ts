import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSauvegardeDto } from './dto/create-sauvegarde.dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { stat } from 'fs/promises';

const execAsync = promisify(exec);

@Injectable()
export class SauvegardeService {
  private readonly logger = new Logger(SauvegardeService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll() {
    return this.prisma.sauvegarde.findMany({
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateSauvegardeDto) {
    const chemin = `/backups/backup_${Date.now()}.sql`;

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
      await execAsync(`pg_dump ${databaseUrl} > ${chemin}`);

      const fileStats = await stat(chemin);

      return this.prisma.sauvegarde.update({
        where: { id: sauvegarde.id },
        data: {
          statut: 'REUSSIE',
          taille: fileStats.size,
        },
      });
    } catch (error) {
      this.logger.error(`Echec de la sauvegarde: ${error.message}`);

      return this.prisma.sauvegarde.update({
        where: { id: sauvegarde.id },
        data: { statut: 'ECHOUEE' },
      });
    }
  }

  async getLatest() {
    return this.prisma.sauvegarde.findFirst({
      where: { statut: 'REUSSIE' },
      orderBy: { date: 'desc' },
    });
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
