import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReservationSalleDto } from './dto/create-reservation-salle.dto';
import { CreateTypeReservationDto } from './dto/create-type-reservation.dto';

@Injectable()
export class SalleFeteService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // Types de reservation
  // ========================

  async findAllTypes() {
    return this.prisma.typeReservationSalle.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
    });
  }

  async createType(dto: CreateTypeReservationDto) {
    return this.prisma.typeReservationSalle.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        inclusions: dto.inclusions,
        prixBase: dto.prixBase || 0,
      },
    });
  }

  async updateType(id: string, dto: Partial<CreateTypeReservationDto>) {
    const t = await this.prisma.typeReservationSalle.findUnique({
      where: { id },
    });
    if (!t) throw new NotFoundException('Type introuvable');
    return this.prisma.typeReservationSalle.update({
      where: { id },
      data: dto,
    });
  }

  async deleteType(id: string) {
    const t = await this.prisma.typeReservationSalle.findUnique({
      where: { id },
    });
    if (!t) throw new NotFoundException('Type introuvable');
    return this.prisma.typeReservationSalle.update({
      where: { id },
      data: { actif: false },
    });
  }

  // ========================
  // Reservations
  // ========================

  async findAll(statut?: string) {
    const where: Record<string, unknown> = {};
    if (statut) where.statut = statut;

    return this.prisma.reservationSalle.findMany({
      where,
      orderBy: { dateEvent: 'desc' },
      include: {
        client: { select: { nom: true, prenom: true, telephone: true } },
        type: { select: { nom: true } },
      },
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservationSalle.findUnique({
      where: { id },
      include: { client: true, type: true },
    });
    if (!reservation) throw new NotFoundException('Reservation introuvable');
    return reservation;
  }

  async create(dto: CreateReservationSalleDto) {
    const dateEvent = new Date(dto.dateEvent);

    const conflit = await this.prisma.reservationSalle.findFirst({
      where: {
        dateEvent,
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE'] },
        OR: [
          {
            heureDebut: { lt: dto.heureFin },
            heureFin: { gt: dto.heureDebut },
          },
        ],
      },
    });
    if (conflit) {
      throw new ConflictException('La salle est deja reservee pour ce creneau');
    }

    return this.prisma.reservationSalle.create({
      data: {
        dateEvent,
        heureDebut: dto.heureDebut,
        heureFin: dto.heureFin,
        nbInvites: dto.nbInvites,
        motif: dto.motif,
        montant: dto.montant,
        notes: dto.notes || null,
        clientId: dto.clientId,
        typeId: dto.typeId || null,
      },
      include: {
        client: { select: { nom: true, prenom: true } },
        type: { select: { nom: true } },
      },
    });
  }

  async confirmer(id: string) {
    const reservation = await this.findOne(id);
    if (reservation.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        'Seule une reservation en attente peut etre confirmee',
      );
    }
    return this.prisma.reservationSalle.update({
      where: { id },
      data: { statut: 'CONFIRMEE' },
    });
  }

  async annuler(id: string) {
    const reservation = await this.findOne(id);
    if (reservation.statut === 'TERMINEE' || reservation.statut === 'ANNULEE') {
      throw new BadRequestException(
        'Cette reservation ne peut plus etre annulee',
      );
    }
    return this.prisma.reservationSalle.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  async terminer(id: string) {
    const reservation = await this.findOne(id);
    if (reservation.statut !== 'CONFIRMEE') {
      throw new BadRequestException(
        'Seule une reservation confirmee peut etre terminee',
      );
    }
    return this.prisma.reservationSalle.update({
      where: { id },
      data: { statut: 'TERMINEE' },
    });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservationsAVenir = await this.prisma.reservationSalle.count({
      where: {
        statut: { in: ['EN_ATTENTE', 'CONFIRMEE'] },
        dateEvent: { gte: today },
      },
    });

    const totalReservations = await this.prisma.reservationSalle.count();

    const caMois = await this.prisma.reservationSalle.aggregate({
      where: {
        statut: { in: ['CONFIRMEE', 'TERMINEE'] },
        createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum: { montant: true },
    });

    return {
      reservationsAVenir,
      totalReservations,
      caMois: Number(caMois._sum.montant || 0),
    };
  }
}
