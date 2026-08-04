import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto/create-table.dto';
import { CreateCommandeDto, AjouterLignesDto } from './dto/create-commande.dto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // Tables
  // ========================

  async findAllTables() {
    return this.prisma.tableRestaurant.findMany({
      orderBy: { numero: 'asc' },
      include: {
        commandes: {
          where: {
            statut: { in: ['EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE'] },
          },
          select: { id: true, numero: true, statut: true, total: true },
        },
      },
    });
  }

  async findOneTable(id: string) {
    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id },
      include: {
        commandes: {
          where: { statut: { notIn: ['PAYEE', 'ANNULEE'] } },
          include: {
            lignes: { include: { produit: { select: { nom: true } } } },
            serveur: { select: { prenom: true, nom: true } },
          },
        },
      },
    });
    if (!table) throw new NotFoundException('Table introuvable');
    return table;
  }

  async createTable(dto: CreateTableDto) {
    const existing = await this.prisma.tableRestaurant.findUnique({
      where: { numero: dto.numero },
    });
    if (existing) throw new ConflictException('Numero de table deja utilise');

    return this.prisma.tableRestaurant.create({
      data: {
        numero: dto.numero,
        capacite: dto.capacite,
        zone: dto.zone || null,
      },
    });
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    await this.findOneTable(id);
    return this.prisma.tableRestaurant.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTable(id: string) {
    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id },
      include: {
        commandes: {
          where: { statut: { notIn: ['PAYEE', 'ANNULEE'] } },
        },
      },
    });
    if (!table) throw new NotFoundException('Table introuvable');
    if (table.commandes.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une table avec des commandes en cours',
      );
    }
    return this.prisma.tableRestaurant.delete({ where: { id } });
  }

  // ========================
  // Commandes
  // ========================

  async findAllCommandes(statut?: string, tableId?: string) {
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;
    if (tableId) where.tableId = tableId;

    return this.prisma.commandeTable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        table: { select: { numero: true, zone: true } },
        serveur: { select: { prenom: true, nom: true } },
        lignes: {
          include: { produit: { select: { nom: true, reference: true } } },
        },
      },
    });
  }

  async findOneCommande(id: string) {
    const commande = await this.prisma.commandeTable.findUnique({
      where: { id },
      include: {
        table: true,
        serveur: { select: { prenom: true, nom: true } },
        lignes: {
          include: { produit: { select: { nom: true, prixVente: true } } },
        },
      },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    return commande;
  }

  async createCommande(dto: CreateCommandeDto) {
    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id: dto.tableId },
    });
    if (!table) throw new NotFoundException('Table introuvable');

    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.prisma.produit.findMany({
      where: { id: { in: produitIds } },
    });

    if (produits.length !== produitIds.length) {
      throw new NotFoundException('Un ou plusieurs produits introuvables');
    }

    const produitMap = new Map(produits.map((p) => [p.id, p]));
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

    const numero = `CMD-${Date.now().toString(36).toUpperCase()}`;

    const commande = await this.prisma.commandeTable.create({
      data: {
        numero,
        tableId: dto.tableId,
        serveurId: dto.serveurId,
        notes: dto.notes || null,
        total,
        lignes: { create: lignesData },
      },
      include: {
        table: { select: { numero: true, zone: true } },
        serveur: { select: { prenom: true, nom: true } },
        lignes: { include: { produit: { select: { nom: true } } } },
      },
    });

    await this.prisma.tableRestaurant.update({
      where: { id: dto.tableId },
      data: { statut: 'OCCUPEE' },
    });

    return commande;
  }

  async ajouterLignes(commandeId: string, dto: AjouterLignesDto) {
    const commande = await this.findOneCommande(commandeId);
    if (commande.statut === 'PAYEE' || commande.statut === 'ANNULEE') {
      throw new BadRequestException(
        "Impossible d'ajouter des lignes a une commande cloturee",
      );
    }

    const produitIds = dto.lignes.map((l) => l.produitId);
    const produits = await this.prisma.produit.findMany({
      where: { id: { in: produitIds } },
    });
    const produitMap = new Map(produits.map((p) => [p.id, p]));

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

    await this.prisma.ligneCommande.createMany({ data: lignesData });

    return this.prisma.commandeTable.update({
      where: { id: commandeId },
      data: { total: Number(commande.total) + ajout },
      include: {
        lignes: { include: { produit: { select: { nom: true } } } },
      },
    });
  }

  async changerStatut(
    id: string,
    nouveauStatut: 'EN_PREPARATION' | 'PRETE' | 'SERVIE' | 'PAYEE' | 'ANNULEE',
  ) {
    const commande = await this.findOneCommande(id);

    const transitions: Record<string, string[]> = {
      EN_ATTENTE: ['EN_PREPARATION', 'ANNULEE'],
      EN_PREPARATION: ['PRETE', 'ANNULEE'],
      PRETE: ['SERVIE'],
      SERVIE: ['PAYEE'],
    };

    const permis = transitions[commande.statut] || [];
    if (!permis.includes(nouveauStatut)) {
      throw new BadRequestException(
        `Transition invalide: ${commande.statut} -> ${nouveauStatut}`,
      );
    }

    const updated = await this.prisma.commandeTable.update({
      where: { id },
      data: { statut: nouveauStatut },
      include: {
        table: { select: { id: true, numero: true } },
        serveur: { select: { prenom: true, nom: true } },
      },
    });

    if (nouveauStatut === 'PAYEE' || nouveauStatut === 'ANNULEE') {
      const autresCommandes = await this.prisma.commandeTable.count({
        where: {
          tableId: commande.table.id,
          statut: { notIn: ['PAYEE', 'ANNULEE'] },
          id: { not: id },
        },
      });
      if (autresCommandes === 0) {
        await this.prisma.tableRestaurant.update({
          where: { id: commande.table.id },
          data: { statut: 'LIBRE' },
        });
      }
    }

    return updated;
  }

  // ========================
  // Stats
  // ========================

  async getStats() {
    const tables = await this.prisma.tableRestaurant.findMany();
    const totalTables = tables.length;
    const tablesOccupees = tables.filter((t) => t.statut === 'OCCUPEE').length;
    const tablesLibres = tables.filter((t) => t.statut === 'LIBRE').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commandesAujourdHui = await this.prisma.commandeTable.count({
      where: { createdAt: { gte: today } },
    });

    const commandesEnCours = await this.prisma.commandeTable.count({
      where: { statut: { notIn: ['PAYEE', 'ANNULEE'] } },
    });

    const caJour = await this.prisma.commandeTable.aggregate({
      where: { createdAt: { gte: today }, statut: 'PAYEE' },
      _sum: { total: true },
    });

    return {
      totalTables,
      tablesOccupees,
      tablesLibres,
      commandesAujourdHui,
      commandesEnCours,
      caJour: Number(caJour._sum.total || 0),
    };
  }
}
