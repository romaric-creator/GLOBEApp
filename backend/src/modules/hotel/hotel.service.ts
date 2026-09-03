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
        prixSieste: dto.prixSieste ?? null,
        prixJournee: dto.prixJournee ?? null,
        description: dto.description ?? null,
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

    const typeReservation = dto.typeReservation ?? 'NUIT';
    const dateArrivee = new Date(dto.dateArrivee);

    // ── Règles métier par type ────────────────────────────────────────────────

    let heureArrivee: string | null = dto.heureArrivee ?? null;
    let heureDepart: string | null = null;
    let dateDepart: Date;

    if (typeReservation === 'NUIT') {
      // Nuitée : départ fixé au lendemain 12h00
      dateDepart = new Date(dateArrivee);
      dateDepart.setDate(dateDepart.getDate() + 1);
      heureDepart = '12:00';

    } else if (typeReservation === 'SIESTE_PROLONGEE') {
      // Sieste prolongée : arrivée >= 22h00, durée 8h glissantes
      if (!heureArrivee) {
        throw new BadRequestException('heureArrivee est obligatoire pour une sieste prolongée');
      }
      const [hh] = heureArrivee.split(':').map(Number);
      if (hh < 22) {
        throw new BadRequestException(
          'La sieste prolongée est réservée aux arrivées à partir de 22h00',
        );
      }
      // Calcul départ : arrivée + 8h
      const departTotalMinutes = hh * 60 + (parseInt(heureArrivee.split(':')[1]) || 0) + 8 * 60;
      const departH = Math.floor(departTotalMinutes / 60) % 24;
      const departM = departTotalMinutes % 60;
      heureDepart = `${String(departH).padStart(2, '0')}:${String(departM).padStart(2, '0')}`;
      // Si départ dépasse minuit → lendemain
      if (departTotalMinutes >= 24 * 60) {
        dateDepart = new Date(dateArrivee);
        dateDepart.setDate(dateDepart.getDate() + 1);
      } else {
        dateDepart = new Date(dateArrivee);
      }

    } else {
      // Sieste (journée) : même jour, heureArrivee + heureDepart obligatoires
      if (!dto.heureArrivee || !dto.heureDepart) {
        throw new BadRequestException(
          'heureArrivee et heureDepart sont obligatoires pour une sieste',
        );
      }
      if (dto.heureArrivee >= dto.heureDepart) {
        throw new BadRequestException(
          "L'heure de départ doit être après l'heure d'arrivée",
        );
      }
      heureDepart = dto.heureDepart;
      dateDepart = new Date(dateArrivee);
    }

    // ── Calcul du montant ─────────────────────────────────────────────────────
    let montantTotal: number;
    if (typeReservation === 'SIESTE') {
      if (!chambre.prixSieste) {
        throw new BadRequestException(
          'Cette chambre ne propose pas de tarif sieste',
        );
      }
      montantTotal = Number(chambre.prixSieste);
    } else if (typeReservation === 'SIESTE_PROLONGEE') {
      if (!chambre.prixJournee) {
        throw new BadRequestException(
          'Cette chambre ne propose pas de tarif sieste prolongée',
        );
      }
      montantTotal = Number(chambre.prixJournee);
    } else {
      montantTotal = Number(chambre.prixNuit);
    }

    return this.prisma.$transaction(async (tx) => {
      // Vérification de conflit avec prise en compte des créneaux horaires
      const reservationsActives = await tx.reservation.findMany({
        where: {
          chambreId: dto.chambreId,
          statut: { in: ['EN_ATTENTE', 'CONFIRMEE', 'EN_COURS'] },
          dateArrivee: { lte: dateDepart },
          dateDepart: { gte: dateArrivee },
        },
      });

      for (const existing of reservationsActives) {
        // Si même date : vérifier chevauchement d'heures
        const sameDay =
          existing.dateArrivee.toISOString().split('T')[0] ===
          dateArrivee.toISOString().split('T')[0];

        if (sameDay && existing.heureArrivee && dto.heureArrivee) {
          // Chevauchement horaire
          const existStart = existing.heureArrivee;
          const existEnd = existing.heureDepart ?? '23:59';
          const newStart = dto.heureArrivee;
          const newEnd = dto.heureDepart ?? '23:59';
          if (!(newEnd <= existStart || newStart >= existEnd)) {
            throw new ConflictException(
              `La chambre est déjà réservée sur ce créneau (${existStart}-${existEnd})`,
            );
          }
        } else if (!existing.heureArrivee && !dto.heureArrivee) {
          // Les deux sont des réservations nuit — conflit de dates
          throw new ConflictException(
            'La chambre est deja reservee pour ces dates',
          );
        } else {
          // Mix nuit + sieste/journée sur la même date — conflit
          throw new ConflictException(
            'La chambre est deja reservee (conflit avec une autre reservation)',
          );
        }
      }

      const reservation = await tx.reservation.create({
        data: {
          typeReservation,
          dateArrivee,
          dateDepart,
          heureArrivee: heureArrivee ?? null,
          heureDepart: heureDepart ?? null,
          nbPersonnes: dto.nbPersonnes,
          montantTotal,
          notes: dto.notes || null,
          chambreId: dto.chambreId,
          clientId: dto.clientId,
          typeDocumentClient: dto.typeDocumentClient ?? null,
          numeroDocumentClient: dto.numeroDocumentClient ?? null,
          nationaliteClient: dto.nationaliteClient ?? null,
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

    return this.prisma.$transaction(async (tx) => {
      const annee = new Date().getFullYear();
      const last = await tx.factureSejour.findFirst({
        where: { numero: { startsWith: `FS-${annee}-` } },
        orderBy: { numero: 'desc' },
      });
      const seq = last ? parseInt(last.numero.split('-')[2]) + 1 : 1;
      const numero = `FS-${annee}-${String(seq).padStart(5, '0')}`;
      await tx.chambre.update({
        where: { id: reservation.chambreId },
        data: { statut: 'OCCUPEE' },
      });

      const updated = await tx.reservation.update({
        where: { id },
        data: { statut: 'EN_COURS' },
        include: {
          chambre: { select: { numero: true, type: true, prixNuit: true } },
          client: { select: { nom: true, prenom: true } },
        },
      });

      const factureExistante = await tx.factureSejour.findUnique({
        where: { reservationId: id },
      });

      if (!factureExistante) {
        const montantNuitee = Number(reservation.montantTotal);
        await tx.factureSejour.create({
          data: {
            numero,
            montantNuitee,
            montantExtras: 0,
            total: montantNuitee,
            reste: montantNuitee,
            reservationId: id,
          },
        });
      }

      return updated;
    });
  }

  async checkOut(id: string, force = false) {
    const reservation = await this.findOneReservation(id);
    if (reservation.statut !== 'EN_COURS') {
      throw new BadRequestException(
        'Check-out possible uniquement pour une reservation en cours',
      );
    }

    const facture = await this.prisma.factureSejour.findUnique({
      where: { reservationId: id },
    });

    if (!force && facture && Number(facture.reste) > 0) {
      throw new BadRequestException(
        `Solde impaye de ${Number(facture.reste).toLocaleString()} FCFA. Encaissez avant le check-out ou forcez le depart.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.chambre.update({
        where: { id: reservation.chambreId },
        data: { statut: 'DISPONIBLE' },
      });

      if (force && facture && Number(facture.reste) > 0) {
        await tx.factureSejour.update({
          where: { id: facture.id },
          data: { reste: 0, payee: true },
        });
      }

      return tx.reservation.update({
        where: { id },
        data: { statut: 'TERMINEE' },
        include: {
          chambre: { select: { numero: true, type: true } },
          client: { select: { nom: true, prenom: true } },
        },
      });
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
        tranches: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  async findFactureByReservation(reservationId: string) {
    return this.prisma.factureSejour.findUnique({
      where: { reservationId },
      include: {
        paiement: true,
        tranches: { orderBy: { createdAt: 'asc' } },
        reservation: {
          include: {
            client: { select: { nom: true, prenom: true, telephone: true } },
            chambre: { select: { numero: true, type: true } },
          },
        },
      },
    });
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
