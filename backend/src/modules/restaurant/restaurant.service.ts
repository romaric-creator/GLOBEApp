import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommandeDto, AjouterLignesDto } from './dto/create-commande.dto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async findAllCommandes(statut?: string) {
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    return this.prisma.commandeTable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: {
          include: {
            produit: {
              select: {
                nom: true,
                unite: true,
                categorie: { select: { nom: true } },
              },
            },
          },
        },
        paiement: true,
      },
    });
  }

  async findOneCommande(id: string) {
    const commande = await this.prisma.commandeTable.findUnique({
      where: { id },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: {
          include: {
            produit: {
              select: { nom: true, prixVente: true, id: true, unite: true },
            },
          },
        },
        paiement: true,
      },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    return commande;
  }

  async createCommande(dto: CreateCommandeDto) {
    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.prisma.produit.findMany({
      where: { id: { in: produitIds }, actif: true },
    });
    if (produits.length !== new Set(produitIds).size) {
      const foundIds = new Set(produits.map((p) => p.id));
      const manquants = produitIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Produits introuvables ou inactifs: ${manquants.join(', ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-read stock inside transaction for consistency
      const freshProduits = await tx.produit.findMany({
        where: { id: { in: produitIds } },
      });
      const produitMap = new Map(freshProduits.map((p) => [p.id, p]));

      for (const ligne of dto.lignes) {
        const produit = produitMap.get(ligne.produitId)!;
        if (produit.stockActuel < ligne.quantite) {
          throw new BadRequestException(
            `Stock insuffisant pour "${produit.nom}" (stock: ${produit.stockActuel}, demande: ${ligne.quantite})`,
          );
        }
      }

      let total = 0;
      const lignesData = dto.lignes.map((l) => {
        const produit = produitMap.get(l.produitId)!;
        const prixUnitaire = Number(produit.prixVente);
        total += prixUnitaire * l.quantite;
        return {
          produitId: l.produitId,
          quantite: l.quantite,
          prixUnitaire,
          notes: l.notes || null,
        };
      });

      const annee = new Date().getFullYear();
      const lastCmd = await tx.commandeTable.findFirst({
        where: { numero: { startsWith: `CMD-${annee}-` } },
        orderBy: { numero: 'desc' },
      });
      const seq = lastCmd ? parseInt(lastCmd.numero.split('-')[2]) + 1 : 1;
      const numero = `CMD-${annee}-${String(seq).padStart(4, '0')}`;

      const commande = await tx.commandeTable.create({
        data: {
          numero,
          serveurId: dto.serveurId,
          notes: dto.notes || null,
          total,
          lignes: { create: lignesData },
        },
        include: {
          serveur: { select: { prenom: true, nom: true } },
          lignes: {
            include: {
              produit: {
                select: {
                  nom: true,
                  unite: true,
                  categorie: { select: { nom: true } },
                },
              },
            },
          },
        },
      });
      for (const ligne of dto.lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stockActuel: { decrement: ligne.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            type: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Commande restaurant ${numero}`,
            produitId: ligne.produitId,
          },
        });
      }
      return commande;
    });
  }

  async ajouterLignes(commandeId: string, dto: AjouterLignesDto) {
    const commande = await this.findOneCommande(commandeId);
    if (commande.statut === 'TERMINEE' || commande.statut === 'ANNULEE') {
      throw new BadRequestException(
        "Impossible d'ajouter des lignes a une commande cloturee",
      );
    }
    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.prisma.produit.findMany({
      where: { id: { in: produitIds }, actif: true },
    });
    if (produits.length !== new Set(produitIds).size)
      throw new NotFoundException('Un ou plusieurs produits introuvables');
    const produitMap = new Map(produits.map((p) => [p.id, p]));
    for (const ligne of dto.lignes) {
      const produit = produitMap.get(ligne.produitId)!;
      if (produit.stockActuel < ligne.quantite)
        throw new BadRequestException(
          `Stock insuffisant pour "${produit.nom}"`,
        );
    }
    let ajout = 0;
    const lignesData = dto.lignes.map((l) => {
      const produit = produitMap.get(l.produitId)!;
      const prixUnitaire = Number(produit.prixVente);
      ajout += prixUnitaire * l.quantite;
      return {
        commandeId,
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaire,
        notes: l.notes || null,
      };
    });
    return this.prisma.$transaction(async (tx) => {
      await tx.ligneCommande.createMany({ data: lignesData });
      for (const ligne of dto.lignes) {
        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { stockActuel: { decrement: ligne.quantite } },
        });
        await tx.mouvementStock.create({
          data: {
            type: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Ajout commande ${commandeId}`,
            produitId: ligne.produitId,
          },
        });
      }
      return tx.commandeTable.update({
        where: { id: commandeId },
        data: { total: Number(commande.total) + ajout },
        include: {
          lignes: {
            include: {
              produit: {
                select: {
                  nom: true,
                  unite: true,
                  categorie: { select: { nom: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  async changerStatut(id: string, nouveauStatut: 'TERMINEE' | 'ANNULEE') {
    const commande = await this.findOneCommande(id);
    if (commande.statut !== 'EN_PREPARATION') {
      throw new BadRequestException(
        `Seule une commande EN_PREPARATION peut changer de statut (statut actuel: ${commande.statut})`,
      );
    }
    if (nouveauStatut === 'ANNULEE') {
      return this.prisma.$transaction(async (tx) => {
        for (const ligne of commande.lignes) {
          await tx.produit.update({
            where: { id: ligne.produitId },
            data: { stockActuel: { increment: ligne.quantite } },
          });
          await tx.mouvementStock.create({
            data: {
              type: 'ENTREE',
              quantite: ligne.quantite,
              motif: `Annulation commande ${commande.numero}`,
              produitId: ligne.produitId,
            },
          });
        }
        return tx.commandeTable.update({
          where: { id },
          data: { statut: 'ANNULEE', cancelledAt: new Date() },
          include: {
            serveur: { select: { prenom: true, nom: true } },
            lignes: {
              include: { produit: { select: { nom: true, unite: true } } },
            },
          },
        });
      });
    }
    return this.prisma.commandeTable.update({
      where: { id },
      data: { statut: 'TERMINEE', completedAt: new Date() },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: {
          include: { produit: { select: { nom: true, unite: true } } },
        },
      },
    });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [commandesAujourdHui, commandesEnPreparation, caJour] =
      await Promise.all([
        this.prisma.commandeTable.count({
          where: { createdAt: { gte: today } },
        }),
        this.prisma.commandeTable.count({
          where: { statut: 'EN_PREPARATION' },
        }),
        this.prisma.commandeTable.aggregate({
          where: { createdAt: { gte: today }, statut: 'TERMINEE' },
          _sum: { total: true },
        }),
      ]);
    return {
      commandesAujourdHui,
      commandesEnPreparation,
      caJour: Number(caJour._sum.total || 0),
    };
  }
}
