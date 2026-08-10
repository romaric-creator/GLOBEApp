/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
// @ts-nocheck
// Module ventes desactive dans CDC v2.0 - conserve pour reference
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVenteDto, ModePaiementDto } from './dto/create-vente.dto';
import { CreateAvoirDto } from './dto/create-avoir.dto';

@Injectable()
export class VentesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVenteDto, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const caisse = await this.prisma.clotureCaisse.findFirst({
      where: { userId, date: { gte: today } },
      orderBy: { date: 'desc' },
    });
    if (!caisse || Number(caisse.montantCloture) > 0) {
      throw new BadRequestException(
        'La caisse doit etre ouverte pour enregistrer une vente',
      );
    }

    const quantitesParProduit = new Map<string, number>();
    for (const ligne of dto.lignes) {
      quantitesParProduit.set(
        ligne.produitId,
        (quantitesParProduit.get(ligne.produitId) || 0) + ligne.quantite,
      );
    }

    const lignes = await Promise.all(
      dto.lignes.map(async (ligne) => {
        const produit = await this.prisma.produit.findUnique({
          where: { id: ligne.produitId },
        });
        if (!produit)
          throw new BadRequestException(
            `Produit ${ligne.produitId} introuvable`,
          );
        const totalNeeded =
          quantitesParProduit.get(ligne.produitId) || ligne.quantite;
        if (produit.stockActuel < totalNeeded) {
          throw new BadRequestException(
            `Stock insuffisant pour ${produit.nom} (dispo: ${produit.stockActuel}, demande: ${totalNeeded})`,
          );
        }
        const remise = ligne.remise || 0;
        const totalLigne = ligne.quantite * ligne.prixUnitaire - remise;
        return { ...ligne, remise, totalLigne, produit };
      }),
    );

    const sousTotal = lignes.reduce((sum, l) => sum + l.totalLigne, 0);
    const remiseGlobale = dto.remise || 0;
    const total = sousTotal - remiseGlobale;

    const vente = await this.prisma.$transaction(async (tx) => {
      const numero = await this.generateNumero(tx);
      const v = await tx.vente.create({
        data: {
          numero,
          sousTotal,
          remise: remiseGlobale,
          taxe: 0,
          total,
          modePaiement: dto.modePaiement,
          statut: 'VALIDEE',
          userId,
          clientId: dto.clientId || null,
          lignes: {
            create: lignes.map((l) => ({
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              remise: l.remise,
              totalLigne: l.totalLigne,
              produitId: l.produitId,
            })),
          },
        },
        include: { lignes: { include: { produit: true } }, client: true },
      });

      for (const ligne of lignes) {
        const stockResult = await tx.$queryRawUnsafe(
          'SELECT "stockActuel" FROM produits WHERE id = $1 FOR UPDATE',
          ligne.produitId,
        );
        const stockActuel = Number(stockResult[0]?.stockActuel ?? 0);

        if (stockActuel < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour ${ligne.produit.nom} (dispo: ${stockActuel})`,
          );
        }

        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stockActuel: { decrement: ligne.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            type: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Vente ${numero}`,
            produitId: ligne.produitId,
          },
        });
      }

      if (dto.modePaiement === ModePaiementDto.CREDIT && dto.clientId) {
        await tx.client.update({
          where: { id: dto.clientId },
          data: { soldeCreance: { increment: total } },
        });
        await tx.creance.create({
          data: {
            montant: total,
            dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            clientId: dto.clientId,
            venteId: v.id,
          },
        });
      }

      return v;
    });

    return vente;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vente.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          lignes: { include: { produit: true } },
          client: true,
          user: true,
        },
      }),
      this.prisma.vente.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const vente = await this.prisma.vente.findUnique({
      where: { id },
      include: {
        lignes: { include: { produit: true } },
        client: true,
        user: true,
        ticket: true,
        avoir: true,
        creances: true,
      },
    });
    if (!vente) throw new NotFoundException('Vente introuvable');
    return vente;
  }

  async annuler(id: string) {
    const vente = await this.prisma.vente.findUnique({
      where: { id },
      include: { lignes: true, creances: true, client: true },
    });
    if (!vente) throw new NotFoundException('Vente introuvable');
    if (vente.statut !== 'VALIDEE')
      throw new BadRequestException(
        'Seule une vente validee peut etre annulee',
      );

    return this.prisma.$transaction(async (tx) => {
      for (const ligne of vente.lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stockActuel: { increment: ligne.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            type: 'ENTREE',
            quantite: ligne.quantite,
            motif: `Annulation vente ${vente.numero}`,
            produitId: ligne.produitId,
          },
        });
      }

      if (vente.modePaiement === 'CREDIT' && vente.clientId) {
        await tx.creance.updateMany({
          where: { venteId: id },
          data: { statut: 'ANNULEE' },
        });
        await tx.client.update({
          where: { id: vente.clientId },
          data: { soldeCreance: { decrement: Number(vente.total) } },
        });
      }

      return tx.vente.update({
        where: { id },
        data: { statut: 'ANNULEE' },
        include: { lignes: { include: { produit: true } }, client: true },
      });
    });
  }

  async createAvoir(dto: CreateAvoirDto) {
    const vente = await this.prisma.vente.findUnique({
      where: { id: dto.venteId },
    });
    if (!vente) throw new NotFoundException('Vente introuvable');
    if (vente.statut !== 'VALIDEE')
      throw new BadRequestException(
        'Avoir possible uniquement sur vente validee',
      );
    if (dto.montant > Number(vente.total))
      throw new BadRequestException('Montant avoir superieur au total vente');

    return this.prisma.$transaction(async (tx) => {
      const avoir = await tx.avoir.create({
        data: {
          motif: dto.motif,
          montant: dto.montant,
          venteId: dto.venteId,
        },
      });

      await tx.vente.update({
        where: { id: dto.venteId },
        data: { statut: 'REMBOURSEE' },
      });

      return avoir;
    });
  }

  async genererTicket(venteId: string) {
    const vente = await this.prisma.vente.findUnique({
      where: { id: venteId },
      include: { lignes: { include: { produit: true } }, client: true },
    });
    if (!vente) throw new NotFoundException('Vente introuvable');

    const lignesTexte = vente.lignes
      .map(
        (l) => `${l.quantite}x ${l.produit.nom}: ${Number(l.totalLigne)} FCFA`,
      )
      .join('\n');

    const contenu = [
      'RESIDENCE GLOBE',
      '================================',
      `N°: ${vente.numero}`,
      `Date: ${vente.date.toLocaleDateString('fr-FR')}`,
      vente.client
        ? `Client: ${vente.client.nom} ${vente.client.prenom || ''}`
        : '',
      '--------------------------------',
      lignesTexte,
      '--------------------------------',
      `Sous-total: ${Number(vente.sousTotal)} FCFA`,
      Number(vente.remise) > 0 ? `Remise: -${Number(vente.remise)} FCFA` : '',
      `TOTAL: ${Number(vente.total)} FCFA`,
      `Paiement: ${vente.modePaiement}`,
      '================================',
      'Merci de votre visite!',
    ]
      .filter(Boolean)
      .join('\n');

    const numeroTicket = `TKT-${vente.numero.replace('VNT-', '')}`;

    return this.prisma.ticket.upsert({
      where: { venteId },
      update: { contenu, imprime: true },
      create: { numeroTicket, contenu, imprime: true, venteId },
    });
  }

  async getCreances(clientId?: string) {
    const where = clientId
      ? {
          clientId,
          statut: { in: ['EN_COURS' as const, 'EN_RETARD' as const] },
        }
      : { statut: { in: ['EN_COURS' as const, 'EN_RETARD' as const] } };
    return this.prisma.creance.findMany({
      where,
      include: { client: true, vente: true },
      orderBy: { dateEcheance: 'asc' },
    });
  }

  async payerCreance(id: string) {
    const creance = await this.prisma.creance.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!creance) throw new NotFoundException('Creance introuvable');
    if (creance.statut === 'PAYEE') {
      throw new BadRequestException('Cette creance est deja payee');
    }
    if (creance.statut === 'ANNULEE') {
      throw new BadRequestException('Cette creance est annulee');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.creance.update({
        where: { id },
        data: { statut: 'PAYEE' },
      });

      await tx.client.update({
        where: { id: creance.clientId },
        data: { soldeCreance: { decrement: Number(creance.montant) } },
      });

      return { message: 'Creance payee' };
    });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [, totalJour, ventesCount] = await Promise.all([
      this.prisma.vente.findMany({
        where: { date: { gte: today }, statut: 'VALIDEE' },
        include: { lignes: true },
      }),
      this.prisma.vente.aggregate({
        where: { date: { gte: today }, statut: 'VALIDEE' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.vente.count({ where: { statut: 'VALIDEE' } }),
    ]);

    return {
      ventesAujourdHui: totalJour._count,
      totalAujourdHui: Number(totalJour._sum.total || 0),
      ventesTotal: ventesCount,
    };
  }

  private async generateNumero(tx?: {
    vente: { findFirst: typeof this.prisma.vente.findFirst };
  }): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const last = await client.vente.findFirst({
      where: { numero: { startsWith: `VNT-${year}` } },
      orderBy: { numero: 'desc' },
    });
    const seq = last ? parseInt(last.numero.split('-')[2]) + 1 : 1;
    return `VNT-${year}-${String(seq).padStart(4, '0')}`;
  }
}
