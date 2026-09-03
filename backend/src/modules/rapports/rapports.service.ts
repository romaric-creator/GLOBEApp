import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RapportsService {
  constructor(private prisma: PrismaService) {}

  async getChiffreAffaires(dateDebut: string, dateFin: string) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    const [hotel, restaurant, piscine, salleFete] = await Promise.all([
      this.prisma.reservation.aggregate({
        _sum: { montantTotal: true },
        where: {
          statut: 'TERMINEE',
          dateArrivee: { gte: debut, lte: fin },
        },
      }),
      this.prisma.commandeTable.aggregate({
        _sum: { total: true },
        where: {
          statut: 'TERMINEE',
          createdAt: { gte: debut, lte: fin },
        },
      }),
      this.prisma.ticketPiscine.aggregate({
        _sum: { prix: true },
        where: {
          dateDebut: { gte: debut, lte: fin },
        },
      }),
      this.prisma.reservationSalle.aggregate({
        _sum: { montant: true },
        where: {
          statut: { in: ['CONFIRMEE', 'TERMINEE'] },
          dateEvent: { gte: debut, lte: fin },
        },
      }),
    ]);

    const h = Number(hotel._sum.montantTotal) || 0;
    const r = Number(restaurant._sum.total) || 0;
    const p = Number(piscine._sum.prix) || 0;
    const s = Number(salleFete._sum.montant) || 0;

    return {
      dateDebut,
      dateFin,
      hotel: h,
      restaurant: r,
      piscine: p,
      salle_fete: s,
      total: h + r + p + s,
    };
  }

  async getOccupation(dateDebut: string, dateFin: string) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    const [totalChambres, distinctChambres] = await Promise.all([
      this.prisma.chambre.count(),
      // findMany avec distinct pour compter les chambres uniques, pas le nombre de sejours
      this.prisma.reservation.findMany({
        distinct: ['chambreId'],
        where: {
          statut: { in: ['EN_COURS', 'CONFIRMEE', 'TERMINEE'] },
          dateArrivee: { lte: fin },
          dateDepart: { gte: debut },
        },
        select: { chambreId: true },
      }),
    ]);
    const chambresOccupees = distinctChambres.length;

    const tauxOccupation =
      totalChambres > 0
        ? Math.min(100, Math.round((chambresOccupees / totalChambres) * 100 * 100) / 100)
        : 0;

    return {
      dateDebut,
      dateFin,
      totalChambres,
      chambresOccupees,
      tauxOccupation,
    };
  }

  async getTopProduits(limit: number = 10) {
    const result = await this.prisma.ligneCommande.groupBy({
      by: ['produitId'],
      _sum: { quantite: true },
      orderBy: { _sum: { quantite: 'desc' } },
      take: limit,
    });

    const produits = await this.prisma.produit.findMany({
      where: { id: { in: result.map((r) => r.produitId) } },
      select: { id: true, nom: true, reference: true },
    });

    const produitsMap = new Map(produits.map((p) => [p.id, p]));

    return result.map((r) => ({
      produitId: r.produitId,
      nom: produitsMap.get(r.produitId)?.nom || '',
      reference: produitsMap.get(r.produitId)?.reference || '',
      quantiteVendue: r._sum.quantite || 0,
    }));
  }

  async getResumePersonnel() {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const demain = new Date(aujourdhui);
    demain.setDate(demain.getDate() + 1);

    const [effectifTotal, presentsAujourdhui, enConge] = await Promise.all([
      this.prisma.employe.count({ where: { actif: true } }),
      this.prisma.pointage.count({
        where: {
          date: { gte: aujourdhui, lt: demain },
          heureArrivee: { not: null },
        },
      }),
      this.prisma.conge.count({
        where: {
          statut: 'APPROUVE',
          dateDebut: { lte: aujourdhui },
          dateFin: { gte: aujourdhui },
        },
      }),
    ]);

    return {
      effectifTotal,
      presentsAujourdhui,
      enConge,
      absents: effectifTotal - presentsAujourdhui - enConge,
    };
  }

  async getCA7Jours() {
    const jours: {
      date: string;
      hotel: number;
      restaurant: number;
      total: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const fin = new Date(d);
      fin.setHours(23, 59, 59, 999);

      const [hotel, restaurant] = await Promise.all([
        this.prisma.reservation.aggregate({
          _sum: { montantTotal: true },
          where: { statut: 'TERMINEE', dateArrivee: { gte: d, lte: fin } },
        }),
        this.prisma.commandeTable.aggregate({
          _sum: { total: true },
          where: { statut: 'TERMINEE', createdAt: { gte: d, lte: fin } },
        }),
      ]);

      const h = Number(hotel._sum.montantTotal) || 0;
      const r = Number(restaurant._sum.total) || 0;
      jours.push({
        date: d.toISOString().slice(0, 10),
        hotel: h,
        restaurant: r,
        total: h + r,
      });
    }
    return jours;
  }

  async getCAParJour(dateDebut: string, dateFin: string) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return [];

    const jours: { date: string; hotel: number; restaurant: number; total: number }[] = [];
    const current = new Date(debut);
    current.setHours(0, 0, 0, 0);

    while (current <= fin) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const [hotel, restaurant] = await Promise.all([
        this.prisma.reservation.aggregate({
          _sum: { montantTotal: true },
          where: { statut: 'TERMINEE', dateArrivee: { gte: dayStart, lte: dayEnd } },
        }),
        this.prisma.commandeTable.aggregate({
          _sum: { total: true },
          where: { statut: 'TERMINEE', createdAt: { gte: dayStart, lte: dayEnd } },
        }),
      ]);

      const h = Number(hotel._sum.montantTotal) || 0;
      const r = Number(restaurant._sum.total) || 0;
      jours.push({ date: current.toISOString().slice(0, 10), hotel: h, restaurant: r, total: h + r });
      current.setDate(current.getDate() + 1);
    }
    return jours;
  }

  async getCAParMois(annee: number) {
    const mois: { date: string; hotel: number; restaurant: number; total: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const debut = new Date(annee, m, 1);
      const fin = new Date(annee, m + 1, 0, 23, 59, 59, 999);
      if (debut > new Date()) break;

      const [hotel, restaurant] = await Promise.all([
        this.prisma.reservation.aggregate({
          _sum: { montantTotal: true },
          where: { statut: 'TERMINEE', dateArrivee: { gte: debut, lte: fin } },
        }),
        this.prisma.commandeTable.aggregate({
          _sum: { total: true },
          where: { statut: 'TERMINEE', createdAt: { gte: debut, lte: fin } },
        }),
      ]);

      const h = Number(hotel._sum.montantTotal) || 0;
      const r = Number(restaurant._sum.total) || 0;
      mois.push({ date: debut.toISOString().slice(0, 10), hotel: h, restaurant: r, total: h + r });
    }
    return mois;
  }

  async getResumeMensuel(mois: number, annee: number) {
    const debut = new Date(annee, mois - 1, 1);
    const fin = new Date(annee, mois, 0, 23, 59, 59, 999);

    const debutISO = debut.toISOString();
    const finISO = fin.toISOString();

    const [ca, depenses, nbCommandes, nbReservations] = await Promise.all([
      this.getChiffreAffaires(debutISO, finISO),
      this.prisma.depense.aggregate({
        _sum: { montant: true },
        where: { date: { gte: debut, lte: fin } },
      }),
      this.prisma.commandeTable.count({
        where: {
          statut: 'TERMINEE',
          createdAt: { gte: debut, lte: fin },
        },
      }),
      this.prisma.reservation.count({
        where: {
          createdAt: { gte: debut, lte: fin },
        },
      }),
    ]);

    const totalDepenses = Number(depenses._sum.montant) || 0;
    const benefice = ca.total - totalDepenses;

    return {
      mois,
      annee,
      caTotal: ca.total,
      detailCA: {
        hotel: ca.hotel,
        restaurant: ca.restaurant,
        piscine: ca.piscine,
        salle_fete: ca.salle_fete,
      },
      depenses: totalDepenses,
      benefice,
      nbCommandes,
      nbReservations,
    };
  }
}
