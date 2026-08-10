import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { CreateMouvementDto } from './dto/create-mouvement.dto';

@Injectable()
export class ProduitsService {
  constructor(private prisma: PrismaService) {}

  // --- Categories ---

  findAllCategories() {
    return this.prisma.categorie.findMany({
      include: { enfants: true, _count: { select: { produits: true } } },
    });
  }

  createCategorie(dto: CreateCategorieDto) {
    return this.prisma.categorie.create({ data: dto });
  }

  async updateCategorie(id: string, dto: Partial<CreateCategorieDto>) {
    await this.findCategorie(id);
    return this.prisma.categorie.update({ where: { id }, data: dto });
  }

  async deleteCategorie(id: string) {
    const cat = await this.prisma.categorie.findUnique({
      where: { id },
      include: { _count: { select: { produits: true } } },
    });
    if (!cat) throw new NotFoundException('Categorie introuvable');
    if (cat._count.produits > 0)
      throw new BadRequestException('Categorie contient des produits');
    return this.prisma.categorie.delete({ where: { id } });
  }

  private async findCategorie(id: string) {
    const cat = await this.prisma.categorie.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categorie introuvable');
    return cat;
  }

  // --- Produits ---

  findAllProduits() {
    return this.prisma.produit.findMany({
      include: { categorie: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneProduit(id: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id },
      include: {
        categorie: true,
        mouvementsStock: { orderBy: { date: 'desc' }, take: 20 },
      },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');
    return produit;
  }

  createProduit(dto: CreateProduitDto) {
    return this.prisma.produit.create({
      data: dto,
      include: { categorie: true },
    });
  }

  async updateProduit(id: string, dto: UpdateProduitDto) {
    await this.findOneProduit(id);
    return this.prisma.produit.update({
      where: { id },
      data: dto,
      include: { categorie: true },
    });
  }

  async deleteProduit(id: string) {
    await this.findOneProduit(id);
    return this.prisma.produit.update({
      where: { id },
      data: { actif: false },
    });
  }

  // --- Mouvements de stock ---

  async createMouvement(dto: CreateMouvementDto) {
    const produit = await this.prisma.produit.findUnique({
      where: { id: dto.produitId },
    });
    if (!produit) throw new NotFoundException('Produit introuvable');

    if ((dto.type === 'ENTREE' || dto.type === 'SORTIE') && dto.quantite <= 0) {
      throw new BadRequestException('La quantite doit etre positive pour une entree ou sortie');
    }
    if (dto.type === 'INVENTAIRE' && dto.quantite < 0) {
      throw new BadRequestException('La quantite de stock ne peut pas etre negative');
    }
    if (dto.type === 'SORTIE' && produit.stockActuel < dto.quantite) {
      throw new BadRequestException('Stock insuffisant');
    }

    const stockUpdate =
      dto.type === 'ENTREE'
        ? { increment: dto.quantite }
        : dto.type === 'SORTIE'
          ? { decrement: dto.quantite }
          : dto.type === 'AJUSTEMENT'
            ? dto.quantite >= 0
              ? { increment: dto.quantite }
              : { decrement: Math.abs(dto.quantite) }
            : undefined;

    const [mouvement] = await this.prisma.$transaction([
      this.prisma.mouvementStock.create({ data: dto }),
      ...(stockUpdate
        ? [
            this.prisma.produit.update({
              where: { id: dto.produitId },
              data: { stockActuel: stockUpdate },
            }),
          ]
        : [
            this.prisma.produit.update({
              where: { id: dto.produitId },
              data: { stockActuel: dto.quantite },
            }),
          ]),
    ]);

    return mouvement;
  }

  findMouvements(produitId?: string) {
    return this.prisma.mouvementStock.findMany({
      where: produitId ? { produitId } : undefined,
      include: { produit: { select: { nom: true, reference: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  // --- Alertes stock ---

  findProduitsEnAlerte() {
    return this.prisma.$queryRaw`
      SELECT id, nom, reference, "stockActuel", "seuilAlerte"
      FROM produits
      WHERE "stockActuel" <= "seuilAlerte" AND actif = true
      ORDER BY "stockActuel" ASC
    `;
  }
}
