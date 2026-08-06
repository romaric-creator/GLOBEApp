import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto/create-table.dto';
import { CreateCommandeDto, AjouterLignesDto } from './dto/create-commande.dto';
import { CreateArticleMenuDto } from './dto/create-article-menu.dto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // Articles Menu
  // ========================

  async findAllArticles(categorie?: string, actif?: string) {
    const where: Record<string, unknown> = {};
    if (categorie) where.categorie = categorie;
    if (actif === 'true') where.actif = true;
    if (actif === 'false') where.actif = false;

    return this.prisma.articleMenu.findMany({
      where,
      orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
    });
  }

  async createArticle(dto: CreateArticleMenuDto) {
    return this.prisma.articleMenu.create({
      data: {
        nom: dto.nom,
        description: dto.description || null,
        categorie: dto.categorie || 'AUTRE',
        prix: dto.prix,
      },
    });
  }

  async updateArticle(id: string, dto: Partial<CreateArticleMenuDto>) {
    const article = await this.prisma.articleMenu.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article introuvable');
    return this.prisma.articleMenu.update({ where: { id }, data: dto });
  }

  async deleteArticle(id: string) {
    const article = await this.prisma.articleMenu.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article introuvable');
    return this.prisma.articleMenu.update({ where: { id }, data: { actif: false } });
  }

  // ========================
  // Tables
  // ========================

  async findAllTables() {
    return this.prisma.tableRestaurant.findMany({
      orderBy: { numero: 'asc' },
      include: {
        commandes: {
          where: { statut: { in: ['EN_ATTENTE', 'EN_PREPARATION', 'PRETE', 'SERVIE'] } },
          select: { id: true, numero: true, statut: true, total: true },
        },
      },
    });
  }

  async createTable(dto: CreateTableDto) {
    const existing = await this.prisma.tableRestaurant.findUnique({
      where: { numero: dto.numero },
    });
    if (existing) throw new ConflictException('Numero de table deja utilise');
    return this.prisma.tableRestaurant.create({
      data: { numero: dto.numero, capacite: dto.capacite, zone: dto.zone || null },
    });
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    const table = await this.prisma.tableRestaurant.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Table introuvable');
    return this.prisma.tableRestaurant.update({ where: { id }, data: dto });
  }

  async deleteTable(id: string) {
    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id },
      include: { commandes: { where: { statut: { notIn: ['PAYEE', 'ANNULEE'] } } } },
    });
    if (!table) throw new NotFoundException('Table introuvable');
    if (table.commandes.length > 0) {
      throw new BadRequestException('Impossible de supprimer une table avec des commandes en cours');
    }
    return this.prisma.tableRestaurant.delete({ where: { id } });
  }

  // ========================
  // Commandes
  // ========================

  async findAllCommandes(statut?: string) {
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;

    return this.prisma.commandeTable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: { include: { article: { select: { nom: true, categorie: true } } } },
      },
    });
  }

  async findOneCommande(id: string) {
    const commande = await this.prisma.commandeTable.findUnique({
      where: { id },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: { include: { article: { select: { nom: true, prix: true, id: true } } } },
      },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');
    return commande;
  }

  async createCommande(dto: CreateCommandeDto) {
    const articleIds = dto.lignes.map((l) => l.articleId);
    const articles = await this.prisma.articleMenu.findMany({
      where: { id: { in: articleIds }, actif: true },
    });

    if (articles.length !== articleIds.length) {
      throw new NotFoundException('Un ou plusieurs articles introuvables ou inactifs');
    }

    const articleMap = new Map(articles.map((a) => [a.id, a]));
    let total = 0;

    const lignesData = dto.lignes.map((l) => {
      const article = articleMap.get(l.articleId)!;
      const prixUnitaire = Number(article.prix);
      total += prixUnitaire * l.quantite;
      return {
        articleId: l.articleId,
        quantite: l.quantite,
        prixUnitaire,
        notes: l.notes || null,
      };
    });

    const numero = `CMD-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.commandeTable.create({
      data: {
        numero,
        tableId: dto.tableId || null,
        serveurId: dto.serveurId,
        notes: dto.notes || null,
        total,
        lignes: { create: lignesData },
      },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: { include: { article: { select: { nom: true, categorie: true } } } },
      },
    });
  }

  async ajouterLignes(commandeId: string, dto: AjouterLignesDto) {
    const commande = await this.findOneCommande(commandeId);
    if (commande.statut === 'PAYEE' || commande.statut === 'ANNULEE') {
      throw new BadRequestException("Impossible d'ajouter des lignes a une commande cloturee");
    }

    const articleIds = dto.lignes.map((l) => l.articleId);
    const articles = await this.prisma.articleMenu.findMany({
      where: { id: { in: articleIds }, actif: true },
    });
    if (articles.length !== articleIds.length) {
      throw new NotFoundException('Un ou plusieurs articles introuvables');
    }

    const articleMap = new Map(articles.map((a) => [a.id, a]));
    let ajout = 0;
    const lignesData = dto.lignes.map((l) => {
      const article = articleMap.get(l.articleId)!;
      const prixUnitaire = Number(article.prix);
      ajout += prixUnitaire * l.quantite;
      return { commandeId, articleId: l.articleId, quantite: l.quantite, prixUnitaire, notes: l.notes || null };
    });

    await this.prisma.ligneCommande.createMany({ data: lignesData });

    return this.prisma.commandeTable.update({
      where: { id: commandeId },
      data: { total: Number(commande.total) + ajout },
      include: {
        lignes: { include: { article: { select: { nom: true, categorie: true } } } },
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
      throw new BadRequestException(`Transition invalide: ${commande.statut} -> ${nouveauStatut}`);
    }

    return this.prisma.commandeTable.update({
      where: { id },
      data: { statut: nouveauStatut },
      include: {
        serveur: { select: { prenom: true, nom: true } },
        lignes: { include: { article: { select: { nom: true } } } },
      },
    });
  }

  // ========================
  // Stats
  // ========================

  async getStats() {
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
      commandesAujourdHui,
      commandesEnCours,
      caJour: Number(caJour._sum.total || 0),
    };
  }
}
