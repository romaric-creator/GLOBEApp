import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OuvrirCaisseDto, CloturerCaisseDto } from './dto/cloture-caisse.dto';

@Injectable()
export class CaisseService {
  constructor(private prisma: PrismaService) {}

  async ouvrir(dto: OuvrirCaisseDto, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.clotureCaisse.findFirst({
      where: { userId, date: { gte: today } },
    });
    if (existing) throw new BadRequestException('Caisse deja ouverte aujourd\'hui');

    return this.prisma.clotureCaisse.create({
      data: {
        montantOuverture: dto.montantOuverture,
        montantCloture: 0,
        ecart: 0,
        userId,
      },
    });
  }

  async cloturer(dto: CloturerCaisseDto, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const caisse = await this.prisma.clotureCaisse.findFirst({
      where: { userId, date: { gte: today } },
      orderBy: { date: 'desc' },
    });
    if (!caisse) throw new BadRequestException('Aucune caisse ouverte aujourd\'hui');
    if (Number(caisse.montantCloture) > 0) throw new BadRequestException('Caisse deja cloturee');

    const ventesJour = await this.prisma.vente.aggregate({
      where: {
        userId,
        date: { gte: today },
        statut: 'VALIDEE',
        modePaiement: { in: ['ESPECES', 'MIXTE'] },
      },
      _sum: { total: true },
    });

    const totalAttendu = Number(caisse.montantOuverture) + Number(ventesJour._sum.total || 0);
    const ecart = dto.montantCloture - totalAttendu;

    return this.prisma.clotureCaisse.update({
      where: { id: caisse.id },
      data: {
        montantCloture: dto.montantCloture,
        ecart,
      },
    });
  }

  async getEtatCaisse(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const caisse = await this.prisma.clotureCaisse.findFirst({
      where: { userId, date: { gte: today } },
      orderBy: { date: 'desc' },
    });

    const ventesJour = await this.prisma.vente.aggregate({
      where: {
        userId,
        date: { gte: today },
        statut: 'VALIDEE',
      },
      _sum: { total: true },
      _count: true,
    });

    const ventesParMode = await this.prisma.vente.groupBy({
      by: ['modePaiement'],
      where: { userId, date: { gte: today }, statut: 'VALIDEE' },
      _sum: { total: true },
      _count: true,
    });

    return {
      caisseOuverte: !!caisse && Number(caisse.montantCloture) === 0,
      montantOuverture: caisse ? Number(caisse.montantOuverture) : 0,
      totalVentes: Number(ventesJour._sum.total || 0),
      nbVentes: ventesJour._count,
      ventesParMode: ventesParMode.map((v) => ({
        mode: v.modePaiement,
        total: Number(v._sum.total || 0),
        count: v._count,
      })),
    };
  }

  async getHistorique(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.clotureCaisse.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { user: { select: { nom: true, prenom: true } } },
      }),
      this.prisma.clotureCaisse.count(),
    ]);
    return { data, total, page, limit };
  }
}
