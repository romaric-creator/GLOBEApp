import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompteDto } from './dto/create-compte.dto';
import { CreateEcritureDto } from './dto/create-ecriture.dto';
import { CreateCategorieComptaDto } from './dto/create-categorie-compta.dto';

@Injectable()
export class ComptabiliteService {
  constructor(private prisma: PrismaService) {}

  async findAllComptes() {
    return this.prisma.compte.findMany({
      orderBy: { nom: 'asc' },
    });
  }

  async createCompte(dto: CreateCompteDto) {
    return this.prisma.compte.create({
      data: {
        nom: dto.nom,
        type: dto.type,
      },
    });
  }

  async findAllEcritures(dateDebut?: string, dateFin?: string) {
    const where: any = {};

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) where.date.gte = new Date(dateDebut);
      if (dateFin) where.date.lte = new Date(dateFin);
    }

    return this.prisma.ecriture.findMany({
      where,
      include: {
        compteDebit: true,
        compteCredit: true,
        categorieCompta: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async createEcriture(dto: CreateEcritureDto) {
    if (dto.compteDebitId === dto.compteCreditId) {
      throw new BadRequestException('Le compte debit et credit doivent etre differents');
    }

    if (dto.montant <= 0) {
      throw new BadRequestException('Le montant doit etre positif');
    }

    return this.prisma.$transaction(async (tx) => {
      const compteDebit = await tx.compte.findUnique({ where: { id: dto.compteDebitId } });
      const compteCredit = await tx.compte.findUnique({ where: { id: dto.compteCreditId } });

      if (!compteDebit) throw new NotFoundException(`Compte debit ${dto.compteDebitId} introuvable`);
      if (!compteCredit) throw new NotFoundException(`Compte credit ${dto.compteCreditId} introuvable`);

      const ecriture = await tx.ecriture.create({
        data: {
          montant: dto.montant,
          libelle: dto.libelle,
          compteDebitId: dto.compteDebitId,
          compteCreditId: dto.compteCreditId,
          categorieComptaId: dto.categorieComptaId,
        },
        include: {
          compteDebit: true,
          compteCredit: true,
          categorieCompta: true,
        },
      });

      // En comptabilite: debit augmente ACTIF/CHARGE, diminue PASSIF/PRODUIT
      const debitSign = (compteDebit.type === 'ACTIF' || compteDebit.type === 'CHARGE') ? 1 : -1;
      await tx.compte.update({
        where: { id: dto.compteDebitId },
        data: { solde: { increment: dto.montant * debitSign } },
      });

      // En comptabilite: credit augmente PASSIF/PRODUIT, diminue ACTIF/CHARGE
      const creditSign = (compteCredit.type === 'PASSIF' || compteCredit.type === 'PRODUIT') ? 1 : -1;
      await tx.compte.update({
        where: { id: dto.compteCreditId },
        data: { solde: { increment: dto.montant * creditSign } },
      });

      return ecriture;
    });
  }

  async findAllCategories() {
    return this.prisma.categorieCompta.findMany({
      orderBy: { nom: 'asc' },
    });
  }

  async createCategorie(dto: CreateCategorieComptaDto) {
    return this.prisma.categorieCompta.create({
      data: {
        nom: dto.nom,
        type: dto.type,
      },
    });
  }

  async getStats() {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const ecrituresMois = await this.prisma.ecriture.findMany({
      where: {
        date: { gte: debutMois, lte: finMois },
      },
      include: { categorieCompta: true },
    });

    let totalRecettes = 0;
    let totalDepenses = 0;

    for (const ecriture of ecrituresMois) {
      const montant = Number(ecriture.montant);
      if (ecriture.categorieCompta.type === 'RECETTE') {
        totalRecettes += montant;
      } else if (ecriture.categorieCompta.type === 'DEPENSE') {
        totalDepenses += montant;
      }
    }

    const comptes = await this.prisma.compte.findMany();
    const soldeGeneral = comptes.reduce(
      (sum, compte) => sum + Number(compte.solde),
      0,
    );

    const nbEcritures = await this.prisma.ecriture.count({
      where: {
        date: { gte: debutMois, lte: finMois },
      },
    });

    return {
      totalRecettes,
      totalDepenses,
      soldeGeneral,
      nbEcritures,
    };
  }

  async cloturerPeriode(periode: string) {
    return this.prisma.cloture.create({
      data: {
        periode,
        valide: true,
      },
    });
  }
}
