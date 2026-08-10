import { Injectable } from '@nestjs/common';
import { CentreDepense } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepenseDto } from './dto/create-depense.dto';

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

@Injectable()
export class ComptabiliteService {
  constructor(private prisma: PrismaService) {}

  // ─── Dépenses ──────────────────────────────────────────────

  async getDepenses(dateDebut?: string, dateFin?: string, centre?: string) {
    const where: Record<string, unknown> = {};
    if (dateDebut || dateFin) {
      where.date = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: endOfDay(new Date(dateFin)) } : {}),
      };
    }
    if (centre) where.centre = centre;

    return this.prisma.depense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async createDepense(dto: CreateDepenseDto) {
    return this.prisma.depense.create({
      data: {
        libelle: dto.libelle,
        montant: dto.montant,
        centre: (dto.centre as CentreDepense) ?? CentreDepense.GENERAL,
        date: dto.date ? new Date(dto.date) : new Date(),
        notes: dto.notes,
      },
    });
  }

  async deleteDepense(id: string) {
    return this.prisma.depense.delete({ where: { id } });
  }

  // ─── Recettes par source ───────────────────────────────────

  private async getRecettesHotel(debut: Date, fin: Date) {
    const result = await this.prisma.paiement.aggregate({
      _sum: { montant: true },
      where: {
        sourceType: 'HOTEL_INVOICE',
        statut: 'ENCAISSE',
        createdAt: { gte: debut, lte: fin },
      },
    });
    return Number(result._sum.montant ?? 0);
  }

  private async getRecettesRestaurant(debut: Date, fin: Date) {
    const result = await this.prisma.paiement.aggregate({
      _sum: { montant: true },
      where: {
        sourceType: 'RESTAURANT_ORDER',
        statut: 'ENCAISSE',
        createdAt: { gte: debut, lte: fin },
      },
    });
    return Number(result._sum.montant ?? 0);
  }

  private async getRecettesPiscine(debut: Date, fin: Date) {
    const [tickets, abonnements, accessoires] = await Promise.all([
      this.prisma.ticketPiscine.aggregate({
        _sum: { prix: true },
        where: { createdAt: { gte: debut, lte: fin } },
      }),
      this.prisma.abonnementLoisir.aggregate({
        _sum: { prix: true },
        where: { createdAt: { gte: debut, lte: fin } },
      }),
      this.prisma.transactionAccessoire.aggregate({
        _sum: { total: true },
        where: {
          type: { in: ['VENTE', 'LOCATION'] },
          createdAt: { gte: debut, lte: fin },
        },
      }),
    ]);
    return (
      Number(tickets._sum.prix ?? 0) +
      Number(abonnements._sum.prix ?? 0) +
      Number(accessoires._sum.total ?? 0)
    );
  }

  private async getRecettesSalle(debut: Date, fin: Date) {
    const result = await this.prisma.reservationSalle.aggregate({
      _sum: { montant: true },
      where: {
        statut: 'TERMINEE',
        dateEvent: { gte: debut, lte: fin },
      },
    });
    return Number(result._sum.montant ?? 0);
  }

  // ─── Vue d'ensemble ────────────────────────────────────────

  async getTableauBord(mois?: string) {
    const ref = mois ? new Date(mois + '-01') : new Date();
    const debut = startOfMonth(ref);
    const fin = endOfMonth(ref);

    const [hotel, restaurant, piscine, salle, depenses] = await Promise.all([
      this.getRecettesHotel(debut, fin),
      this.getRecettesRestaurant(debut, fin),
      this.getRecettesPiscine(debut, fin),
      this.getRecettesSalle(debut, fin),
      this.prisma.depense.groupBy({
        by: ['centre'],
        _sum: { montant: true },
        where: { date: { gte: debut, lte: fin } },
      }),
    ]);

    const totalRecettes = hotel + restaurant + piscine + salle;

    const depensesParCentre: Record<string, number> = {
      HOTEL: 0,
      RESTAURANT: 0,
      PISCINE: 0,
      SALLE_FETE: 0,
      GENERAL: 0,
    };
    let totalDepenses = 0;
    for (const d of depenses) {
      const montant = Number(d._sum.montant ?? 0);
      depensesParCentre[d.centre] = montant;
      totalDepenses += montant;
    }

    return {
      periode: { debut: debut.toISOString(), fin: fin.toISOString() },
      recettes: { hotel, restaurant, piscine, salle, total: totalRecettes },
      depenses: { ...depensesParCentre, total: totalDepenses },
      resultat: totalRecettes - totalDepenses,
    };
  }

  // ─── Historique mensuel (12 derniers mois) ─────────────────

  async getHistoriqueMensuel() {
    const now = new Date();
    const mois: {
      label: string;
      recettes: number;
      depenses: number;
      resultat: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const debut = startOfMonth(ref);
      const fin = endOfMonth(ref);
      const label = ref.toLocaleDateString('fr-FR', {
        month: 'short',
        year: '2-digit',
      });

      const [hotel, restaurant, piscine, salle, depTotal] = await Promise.all([
        this.getRecettesHotel(debut, fin),
        this.getRecettesRestaurant(debut, fin),
        this.getRecettesPiscine(debut, fin),
        this.getRecettesSalle(debut, fin),
        this.prisma.depense.aggregate({
          _sum: { montant: true },
          where: { date: { gte: debut, lte: fin } },
        }),
      ]);

      const recettes = hotel + restaurant + piscine + salle;
      const depenses = Number(depTotal._sum.montant ?? 0);

      mois.push({ label, recettes, depenses, resultat: recettes - depenses });
    }

    return mois;
  }

  // ─── Trésorerie consolidée ─────────────────────────────────

  async getTresorerie() {
    const sessions = await this.prisma.sessionCaisse.findMany({
      where: { statut: 'OUVERTE' },
      include: {
        caisse: true,
        paiements: {
          where: { statut: 'ENCAISSE' },
          select: { montant: true },
        },
      },
    });

    const caisses = sessions.map((s) => ({
      nom: s.caisse.nom,
      type: s.caisse.type,
      fondInitial: Number(s.fondInitial),
      totalEncaisse: s.paiements.reduce((sum, p) => sum + Number(p.montant), 0),
      total:
        Number(s.fondInitial) +
        s.paiements.reduce((sum, p) => sum + Number(p.montant), 0),
    }));

    const totalTresorerie = caisses.reduce((sum, c) => sum + c.total, 0);

    return { caisses, total: totalTresorerie };
  }

  // ─── Détail recettes sur une période ──────────────────────

  async getRecettesDetail(dateDebut?: string, dateFin?: string) {
    const debut = dateDebut ? new Date(dateDebut) : startOfMonth(new Date());
    const fin = dateFin ? endOfDay(new Date(dateFin)) : endOfMonth(new Date());

    const [hotel, restaurant, piscine, salle] = await Promise.all([
      this.prisma.paiement.findMany({
        where: {
          sourceType: 'HOTEL_INVOICE',
          statut: 'ENCAISSE',
          createdAt: { gte: debut, lte: fin },
        },
        include: {
          factureSejour: {
            include: {
              reservation: { include: { client: true, chambre: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paiement.findMany({
        where: {
          sourceType: 'RESTAURANT_ORDER',
          statut: 'ENCAISSE',
          createdAt: { gte: debut, lte: fin },
        },
        include: { commandeTable: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticketPiscine.findMany({
        where: { createdAt: { gte: debut, lte: fin } },
        include: { client: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reservationSalle.findMany({
        where: { statut: 'TERMINEE', dateEvent: { gte: debut, lte: fin } },
        include: { client: true, type: true },
        orderBy: { dateEvent: 'desc' },
      }),
    ]);

    return { hotel, restaurant, piscine, salle };
  }
}
