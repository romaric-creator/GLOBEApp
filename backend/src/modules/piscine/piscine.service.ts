import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutPiscineDto, CreateTicketPiscineDto } from './dto/create-ticket.dto';
import { CreateAbonnementDto } from './dto/create-abonnement.dto';
import {
  CreateAccessoireDto,
  CreateTransactionDto,
} from './dto/create-accessoire.dto';

@Injectable()
export class PiscineService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // Tickets Piscine
  // ========================

  async findAllTickets(type?: string, utilise?: string) {
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (utilise === 'true') where.utilise = true;
    if (utilise === 'false') where.utilise = false;

    return this.prisma.ticketPiscine.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { nom: true, prenom: true } } },
    });
  }

  private async generateTicketCode(): Promise<string> {
    const last = await this.prisma.ticketPiscine.findFirst({
      where: { code: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    const lastNum = last?.code ? parseInt(last.code.replace('PSC-', '')) || 0 : 0;
    return `PSC-${String(lastNum + 1).padStart(4, '0')}`;
  }

  async createTicket(dto: CreateTicketPiscineDto) {
    const dateDebut = new Date(dto.dateDebut);
    let dateFin: Date | null = null;

    if (dto.dateFin) {
      dateFin = new Date(dto.dateFin);
    } else if (String(dto.type) === 'JOURNALIER') {
      // Fin de journée en heure locale (pas minuit UTC)
      const [y, m, d] = dto.dateDebut.split('-').map(Number);
      dateFin = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else if (String(dto.type) === 'ABONNEMENT_MENSUEL') {
      dateFin = new Date(dateDebut);
      dateFin.setMonth(dateFin.getMonth() + 1);
    } else if (String(dto.type) === 'ABONNEMENT_ANNUEL') {
      dateFin = new Date(dateDebut);
      dateFin.setFullYear(dateFin.getFullYear() + 1);
    }

    const code = await this.generateTicketCode();

    return this.prisma.ticketPiscine.create({
      data: {
        code,
        type: dto.type,
        prix: dto.prix,
        dateDebut,
        dateFin,
        clientId: dto.clientId || null,
        emplacementNumero: dto.emplacementNumero || null,
      },
      include: { client: { select: { nom: true, prenom: true } } },
    });
  }

  async checkoutPiscine(dto: CheckoutPiscineDto) {
    const dateDebut = new Date(dto.dateDebut);
    let dateFin: Date | null = null;

    if (dto.dateFin) {
      dateFin = new Date(dto.dateFin);
    } else if (String(dto.type) === 'JOURNALIER') {
      const [y, m, d] = dto.dateDebut.split('-').map(Number);
      dateFin = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else if (String(dto.type) === 'ABONNEMENT_MENSUEL') {
      dateFin = new Date(dateDebut);
      dateFin.setMonth(dateFin.getMonth() + 1);
    } else if (String(dto.type) === 'ABONNEMENT_ANNUEL') {
      dateFin = new Date(dateDebut);
      dateFin.setFullYear(dateFin.getFullYear() + 1);
    }

    const code = await this.generateTicketCode();
    const accessoires = dto.accessoires || [];

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticketPiscine.create({
        data: {
          code,
          type: dto.type,
          prix: dto.prix,
          dateDebut,
          dateFin,
          clientId: dto.clientId || null,
        },
      });

      for (const acc of accessoires) {
        const accessoire = await tx.accessoirePiscine.findUnique({ where: { id: acc.accessoireId } });
        if (!accessoire) throw new NotFoundException(`Accessoire introuvable: ${acc.accessoireId}`);
        if (accessoire.stock < acc.quantite) {
          throw new BadRequestException(`Stock insuffisant pour "${accessoire.nom}"`);
        }

        const prixUnit = acc.type === 'LOCATION'
          ? Number(accessoire.prixLocation ?? accessoire.prixVente)
          : Number(accessoire.prixVente);

        await tx.accessoirePiscine.update({
          where: { id: acc.accessoireId },
          data: { stock: { decrement: acc.quantite } },
        });

        await tx.transactionAccessoire.create({
          data: {
            type: acc.type,
            quantite: acc.quantite,
            prixUnit,
            total: acc.quantite * prixUnit,
            accessoireId: acc.accessoireId,
            clientId: dto.clientId || null,
            ticketPiscineId: ticket.id,
          },
        });
      }

      return tx.ticketPiscine.findUnique({
        where: { id: ticket.id },
        include: {
          client: { select: { nom: true, prenom: true } },
          transactions: { include: { accessoire: { select: { nom: true } } } },
        },
      });
    });
  }

  async utiliserTicket(id: string) {
    const ticket = await this.prisma.ticketPiscine.findUnique({
      where: { id },
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    if (ticket.utilise) {
      throw new BadRequestException('Ce ticket a deja ete utilise');
    }

    const now = new Date();
    if (ticket.dateFin && now > ticket.dateFin) {
      throw new BadRequestException('Ce ticket est expire');
    }

    return this.prisma.ticketPiscine.update({
      where: { id },
      data: { utilise: true },
    });
  }

  // ========================
  // Abonnements Loisirs
  // ========================

  async findAllAbonnements(actif?: string) {
    const where: Record<string, unknown> = {};
    if (actif === 'true') where.actif = true;
    if (actif === 'false') where.actif = false;

    return this.prisma.abonnementLoisir.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { nom: true, prenom: true, telephone: true } },
      },
    });
  }

  private async expireAbonnements() {
    await this.prisma.abonnementLoisir.updateMany({
      where: { actif: true, dateFin: { lt: new Date() } },
      data: { actif: false },
    });
  }

  async createAbonnement(dto: CreateAbonnementDto) {
    const debut = new Date(dto.dateDebut);
    const fin = new Date(dto.dateFin);
    if (fin <= debut) {
      throw new BadRequestException(
        'La date de fin doit etre apres la date de debut',
      );
    }

    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) throw new NotFoundException('Client introuvable');

    return this.prisma.abonnementLoisir.create({
      data: {
        type: dto.type,
        dateDebut: debut,
        dateFin: fin,
        prix: dto.prix,
        clientId: dto.clientId,
      },
      include: { client: { select: { nom: true, prenom: true } } },
    });
  }

  async resilierAbonnement(id: string) {
    const abo = await this.prisma.abonnementLoisir.findUnique({
      where: { id },
    });
    if (!abo) throw new NotFoundException('Abonnement introuvable');
    if (!abo.actif) {
      throw new BadRequestException('Abonnement deja resilie');
    }

    return this.prisma.abonnementLoisir.update({
      where: { id },
      data: { actif: false },
    });
  }

  // ========================
  // Accessoires
  // ========================

  async findAllAccessoires(actif?: string) {
    const where: Record<string, unknown> = {};
    if (actif === 'true') where.actif = true;
    if (actif === 'false') where.actif = false;

    return this.prisma.accessoirePiscine.findMany({
      where,
      orderBy: { nom: 'asc' },
    });
  }

  async createAccessoire(dto: CreateAccessoireDto) {
    return this.prisma.accessoirePiscine.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        type: dto.type || 'VENTE',
        prixVente: dto.prixVente,
        prixLocation: dto.prixLocation,
        stock: dto.stock || 0,
      },
    });
  }

  async updateAccessoire(id: string, dto: Partial<CreateAccessoireDto>) {
    const acc = await this.prisma.accessoirePiscine.findUnique({
      where: { id },
    });
    if (!acc) throw new NotFoundException('Accessoire introuvable');
    return this.prisma.accessoirePiscine.update({ where: { id }, data: dto });
  }

  async deleteAccessoire(id: string) {
    const acc = await this.prisma.accessoirePiscine.findUnique({
      where: { id },
    });
    if (!acc) throw new NotFoundException('Accessoire introuvable');
    return this.prisma.accessoirePiscine.update({
      where: { id },
      data: { actif: false },
    });
  }

  async createTransaction(dto: CreateTransactionDto) {
    const acc = await this.prisma.accessoirePiscine.findUnique({
      where: { id: dto.accessoireId },
    });
    if (!acc) throw new NotFoundException('Accessoire introuvable');

    if (dto.type !== 'RETOUR' && acc.stock < dto.quantite) {
      throw new BadRequestException('Stock insuffisant');
    }

    // Utiliser le prix réel de l'accessoire (pas le prix envoyé par le client)
    const prixUnit =
      dto.type === 'LOCATION'
        ? Number(acc.prixLocation ?? acc.prixVente)
        : Number(acc.prixVente);

    const total = dto.quantite * prixUnit;
    const stockDelta = dto.type === 'RETOUR' ? dto.quantite : -dto.quantite;

    return this.prisma.$transaction(async (tx) => {
      await tx.accessoirePiscine.update({
        where: { id: dto.accessoireId },
        data: { stock: { increment: stockDelta } },
      });
      return tx.transactionAccessoire.create({
        data: {
          type: dto.type,
          quantite: dto.quantite,
          prixUnit,
          total,
          notes: dto.notes,
          accessoireId: dto.accessoireId,
          clientId: dto.clientId || null,
          ticketPiscineId: dto.ticketPiscineId || null,
        },
        include: {
          accessoire: { select: { nom: true } },
          client: { select: { nom: true, prenom: true } },
        },
      });
    });
  }

  async getTransactions(accessoireId?: string) {
    return this.prisma.transactionAccessoire.findMany({
      where: accessoireId ? { accessoireId } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        accessoire: { select: { nom: true } },
        client: { select: { nom: true, prenom: true } },
      },
    });
  }

  // ========================
  // Stats
  // ========================

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ticketsAujourdHui = await this.prisma.ticketPiscine.count({
      where: { createdAt: { gte: today } },
    });

    const abonnementsActifs = await this.prisma.abonnementLoisir.count({
      where: { actif: true },
    });

    const caJour = await this.prisma.ticketPiscine.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { prix: true },
    });

    const totalTickets = await this.prisma.ticketPiscine.count();

    return {
      ticketsAujourdHui,
      abonnementsActifs,
      caJour: Number(caJour._sum.prix || 0),
      totalTickets,
    };
  }
}
