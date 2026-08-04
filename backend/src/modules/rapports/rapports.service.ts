import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RapportsService {
  constructor(private prisma: PrismaService) {}

  async getChiffreAffaires(dateDebut: string, dateFin: string) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    const [ventes, hotel, restaurant, piscine, salleFete] = await Promise.all([
      this.prisma.vente.aggregate({
        _sum: { total: true },
        where: {
          statut: { not: 'ANNULEE' },
          date: { gte: debut, lte: fin },
        },
      }),
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
          statut: 'PAYEE',
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

    return {
      dateDebut,
      dateFin,
      ventes: Number(ventes._sum.total) || 0,
      hotel: Number(hotel._sum.montantTotal) || 0,
      restaurant: Number(restaurant._sum.total) || 0,
      piscine: Number(piscine._sum.prix) || 0,
      salle_fete: Number(salleFete._sum.montant) || 0,
      total:
        (Number(ventes._sum.total) || 0) +
        (Number(hotel._sum.montantTotal) || 0) +
        (Number(restaurant._sum.total) || 0) +
        (Number(piscine._sum.prix) || 0) +
        (Number(salleFete._sum.montant) || 0),
    };
  }

  async getOccupation(dateDebut: string, dateFin: string) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    const [totalChambres, chambresOccupees] = await Promise.all([
      this.prisma.chambre.count(),
      this.prisma.reservation.count({
        where: {
          statut: { in: ['EN_COURS', 'CONFIRMEE', 'TERMINEE'] },
          dateArrivee: { lte: fin },
          dateDepart: { gte: debut },
        },
      }),
    ]);

    const tauxOccupation =
      totalChambres > 0
        ? Math.round((chambresOccupees / totalChambres) * 100 * 100) / 100
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
    const result = await this.prisma.ligneVente.groupBy({
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

  async getResumeMensuel(mois: number, annee: number) {
    const debut = new Date(annee, mois - 1, 1);
    const fin = new Date(annee, mois, 0, 23, 59, 59, 999);

    const debutISO = debut.toISOString();
    const finISO = fin.toISOString();

    const [ca, depenses, nbVentes, nbReservations] = await Promise.all([
      this.getChiffreAffaires(debutISO, finISO),
      this.prisma.ecriture.aggregate({
        _sum: { montant: true },
        where: {
          date: { gte: debut, lte: fin },
          categorieCompta: { type: 'DEPENSE' },
        },
      }),
      this.prisma.vente.count({
        where: {
          statut: { not: 'ANNULEE' },
          date: { gte: debut, lte: fin },
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
        ventes: ca.ventes,
        hotel: ca.hotel,
        restaurant: ca.restaurant,
        piscine: ca.piscine,
        salle_fete: ca.salle_fete,
      },
      depenses: totalDepenses,
      benefice,
      nbVentes,
      nbReservations,
    };
  }
}
