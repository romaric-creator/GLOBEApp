import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChambreDto, UpdateChambreDto } from './dto/create-chambre.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class HotelService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // Chambres
  // ========================

  async findAllChambres() {
    return this.prisma.chambre.findMany({
      orderBy: { numero: 'asc' },
    });
  }

  async findOneChambre(id: string) {
    const chambre = await this.prisma.chambre.findUnique({
      where: { id },
      include: {
        reservations: {
          where: { statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] } },
          include: {
            client: { select: { nom: true, prenom: true, telephone: true } },
          },
          orderBy: { dateArrivee: 'asc' },
        },
      },
    });
    if (!chambre) throw new NotFoundException('Chambre introuvable');
    return chambre;
  }

  async createChambre(dto: CreateChambreDto) {
    const existing = await this.prisma.chambre.findUnique({
      where: { numero: dto.numero },
    });
    if (existing) throw new ConflictException('Numero de chambre deja utilise');

    return this.prisma.chambre.create({
      data: {
        numero: dto.numero,
        type: dto.type,
        prixNuit: dto.prixNuit,
        capacite: dto.capacite,
        etage: dto.etage ?? null,
      },
    });
  }

  async updateChambre(id: string, dto: UpdateChambreDto) {
    await this.findOneChambre(id);
    return this.prisma.chambre.update({
      where: { id },
      data: dto,
    });
  }

  async deleteChambre(id: string) {
    const chambre = await this.prisma.chambre.findUnique({
      where: { id },
      include: {
        reservations: { where: { statut: { in: ['EN_COURS', 'CONFIRMEE'] } } },
      },
    });
    if (!chambre) throw new NotFoundException('Chambre introuvable');
    if (chambre.reservations.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une chambre avec des reservations actives',
      );
    }
    return this.prisma.chambre.delete({ where: { id } });
  }

  // ========================
  // Reservations
  // ========================

  async findAllReservations(statut?: string) {
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;

    return this.prisma.reservation.findMany({
      where,
      orderBy: { dateArrivee: 'desc' },
      include: {
        chambre: { select: { numero: true, type: true } },
        client: { select: { nom: true, prenom: true, telephone: true } },
      },
    });
  }

  async findOneReservation(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        chambre: true,
        client: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reservation introuvable');
    return reservation;
  }

  async createReservation(dto: CreateReservationDto) {
    const chambre = await this.prisma.chambre.findUnique({
      where: { id: dto.chambreId },
    });
    if (!chambre) throw new NotFoundException('Chambre introuvable');

    if (dto.nbPersonnes > chambre.capacite) {
      throw new BadRequestException(
        `Capacite maximale: ${chambre.capacite} personne(s)`,
      );
    }

    const dateArrivee = new Date(dto.dateArrivee);
    const dateDepart = new Date(dto.dateDepart);

    if (dateDepart <= dateArrivee) {
      throw new BadRequestException(
        "La date de depart doit etre apres la date d'arrivee",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const conflit = await tx.reservation.findFirst({
        where: {
          chambreId: dto.chambreId,
          statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
          dateArrivee: { lt: dateDepart },
          dateDepart: { gt: dateArrivee },
        },
      });
      if (conflit) {
        throw new ConflictException(
          'La chambre est deja reservee pour ces dates',
        );
      }

      const nbNuits = Math.ceil(
        (dateDepart.getTime() - dateArrivee.getTime()) / (1000 * 60 * 60 * 24),
      );
      const montantTotal = Number(chambre.prixNuit) * nbNuits;

      const reservation = await tx.reservation.create({
        data: {
          dateArrivee,
          dateDepart,
          nbPersonnes: dto.nbPersonnes,
          montantTotal,
          notes: dto.notes || null,
          chambreId: dto.chambreId,
          clientId: dto.clientId,
        },
        include: {
          chambre: { select: { numero: true, type: true } },
          client: { select: { nom: true, prenom: true } },
        },
      });

      await tx.chambre.update({
        where: { id: dto.chambreId },
        data: { statut: 'RESERVEE' },
      });

      return reservation;
    });
  }

  async confirmerReservation(id: string) {
    const reservation = await this.findOneReservation(id);
    if (reservation.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        'Seule une reservation en attente peut etre confirmee',
      );
    }
    await this.prisma.chambre.update({
      where: { id: reservation.chambreId },
      data: { statut: 'RESERVEE' },
    });

    return this.prisma.reservation.update({
      where: { id },
      data: { statut: 'CONFIRMEE' },
    });
  }

  async annulerReservation(id: string) {
    const reservation = await this.findOneReservation(id);
    if (reservation.statut === 'TERMINEE' || reservation.statut === 'ANNULEE') {
      throw new BadRequestException(
        'Cette reservation ne peut plus etre annulee',
      );
    }

    const hasOtherActiveReservation = await this.prisma.reservation.findFirst({
      where: {
        chambreId: reservation.chambreId,
        id: { not: id },
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
      },
    });

    if (!hasOtherActiveReservation) {
      await this.prisma.chambre.update({
        where: { id: reservation.chambreId },
        data: { statut: 'DISPONIBLE' },
      });
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  async checkIn(id: string) {
    const reservation = await this.findOneReservation(id);
    if (
      reservation.statut !== 'CONFIRMEE' &&
      reservation.statut !== 'EN_ATTENTE'
    ) {
      throw new BadRequestException(
        'Check-in possible uniquement pour une reservation confirmee ou en attente',
      );
    }

    await this.prisma.chambre.update({
      where: { id: reservation.chambreId },
      data: { statut: 'OCCUPEE' },
    });

    return this.prisma.reservation.update({
      where: { id },
      data: { statut: 'EN_COURS' },
      include: {
        chambre: { select: { numero: true, type: true } },
        client: { select: { nom: true, prenom: true } },
      },
    });
  }

  async checkOut(id: string) {
    const reservation = await this.findOneReservation(id);
    if (reservation.statut !== 'EN_COURS') {
      throw new BadRequestException(
        'Check-out possible uniquement pour une reservation en cours',
      );
    }

    await this.prisma.chambre.update({
      where: { id: reservation.chambreId },
      data: { statut: 'DISPONIBLE' },
    });

    return this.prisma.reservation.update({
      where: { id },
      data: { statut: 'TERMINEE' },
      include: {
        chambre: { select: { numero: true, type: true } },
        client: { select: { nom: true, prenom: true } },
      },
    });
  }

  // ========================
  // Factures
  // ========================

  async findAllFactures(payee?: boolean) {
    const where: Record<string, unknown> = {};
    if (payee !== undefined) where.payee = payee;
    return this.prisma.factureSejour.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reservation: {
          include: {
            client: { select: { nom: true, prenom: true, telephone: true } },
            chambre: { select: { numero: true, type: true } },
          },
        },
        paiement: true,
      },
    });
  }

  async findOneFacture(id: string) {
    const facture = await this.prisma.factureSejour.findUnique({
      where: { id },
      include: {
        reservation: {
          include: {
            client: true,
            chambre: true,
          },
        },
        paiement: true,
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  // ========================
  // Stats
  // ========================

  async getStats() {
    const chambres = await this.prisma.chambre.findMany();
    const total = chambres.length;
    const occupees = chambres.filter((c) => c.statut === 'OCCUPEE').length;
    const disponibles = chambres.filter(
      (c) => c.statut === 'DISPONIBLE',
    ).length;
    const maintenance = chambres.filter(
      (c) => c.statut === 'MAINTENANCE',
    ).length;
    const reservees = chambres.filter((c) => c.statut === 'RESERVEE').length;

    const reservationsEnCours = await this.prisma.reservation.count({
      where: { statut: 'EN_COURS' },
    });

    const reservationsAVenir = await this.prisma.reservation.count({
      where: { statut: { in: ['EN_ATTENTE', 'CONFIRMEE'] } },
    });

    return {
      total,
      occupees,
      disponibles,
      maintenance,
      reservees,
      tauxOccupation: total > 0 ? Math.round((occupees / total) * 100) : 0,
      reservationsEnCours,
      reservationsAVenir,
    };
  }
}
