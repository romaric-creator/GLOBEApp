import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MoyenPaiement, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CaisseService {
  constructor(private prisma: PrismaService) {}

  async getCaisses() {
    return this.prisma.caisse.findMany({
      where: { actif: true },
      include: {
        sessions: {
          where: { statut: 'OUVERTE' },
          orderBy: { ouvertureAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async ouvrirSession(caisseId: string, userId: string, fondInitial: number) {
    const caisse = await this.prisma.caisse.findUnique({
      where: { id: caisseId },
    });
    if (!caisse) throw new NotFoundException('Caisse introuvable');
    const sessionOuverte = await this.prisma.sessionCaisse.findFirst({
      where: { caisseId, statut: 'OUVERTE' },
    });
    if (sessionOuverte)
      throw new BadRequestException(
        'Une session est deja ouverte pour cette caisse',
      );
    return this.prisma.sessionCaisse.create({
      data: { caisseId, userId, fondInitial },
    });
  }

  async fermerSession(sessionId: string, totalReel: number, notes?: string) {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
      include: { paiements: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (session.statut === 'FERMEE')
      throw new BadRequestException('Cette session est deja fermee');
    const totalTheorique = session.paiements
      .filter((p) => p.statut === 'ENCAISSE')
      .reduce((s, p) => s + Number(p.montant), Number(session.fondInitial));
    const ecart = totalReel - totalTheorique;
    return this.prisma.sessionCaisse.update({
      where: { id: sessionId },
      data: {
        statut: 'FERMEE',
        fermetureAt: new Date(),
        totalTheorique,
        totalReel,
        ecart,
        notes: notes || null,
      },
    });
  }

  async getSessionActive(caisseId: string) {
    return this.prisma.sessionCaisse.findFirst({
      where: { caisseId, statut: 'OUVERTE' },
      orderBy: { ouvertureAt: 'desc' },
      include: {
        paiements: { orderBy: { createdAt: 'desc' } },
        caisse: true,
      },
    });
  }

  private async generateReference(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const annee = new Date().getFullYear();
    const last = await tx.paiement.findFirst({
      where: { reference: { startsWith: `PAY-${annee}-` } },
      orderBy: { reference: 'desc' },
    });
    const seq = last ? parseInt(last.reference.split('-')[2]) + 1 : 1;
    return `PAY-${annee}-${String(seq).padStart(5, '0')}`;
  }

  private async createPaiementWithRetry(
    data: Record<string, unknown>,
    tx: Prisma.TransactionClient,
    retries = 3,
  ) {
    for (let attempt = 0; attempt < retries; attempt++) {
      const reference = await this.generateReference(tx);
      try {
        return await tx.paiement.create({ data: { ...data, reference } as any });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < retries - 1) {
          continue;
        }
        throw e;
      }
    }
  }

  async encaisserFactureHotel(
    factureId: string,
    sessionId: string,
    userId: string,
    montant: number,
    moyen: MoyenPaiement,
  ) {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.statut !== 'OUVERTE')
      throw new BadRequestException('Session de caisse non ouverte');

    return this.prisma.$transaction(async (tx) => {
      const facture = await tx.factureSejour.findUnique({
        where: { id: factureId },
      });
      if (!facture) throw new NotFoundException('Facture introuvable');
      if (facture.payee) throw new BadRequestException('Facture deja payee');

      const nouvMontantPaye = Number(facture.montantPaye) + montant;
      const payee = nouvMontantPaye >= Number(facture.total);

      const paiement = await this.createPaiementWithRetry(
        {
          montant,
          moyen,
          sourceType: 'HOTEL_INVOICE',
          sessionId,
          userId,
          factureSejourId: factureId,
        },
        tx,
      );
      await tx.factureSejour.update({
        where: { id: factureId },
        data: {
          montantPaye: nouvMontantPaye,
          reste: Number(facture.total) - nouvMontantPaye,
          payee,
        },
      });
      return paiement;
    });
  }

  async encaisserCommandeRestaurant(
    commandeId: string,
    sessionId: string,
    userId: string,
    montant: number,
    moyen: MoyenPaiement,
  ) {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.statut !== 'OUVERTE')
      throw new BadRequestException('Session de caisse non ouverte');

    return this.prisma.$transaction(async (tx) => {
      const commande = await tx.commandeTable.findUnique({
        where: { id: commandeId },
      });
      if (!commande) throw new NotFoundException('Commande introuvable');
      if (commande.statut !== 'TERMINEE')
        throw new BadRequestException(
          'Seule une commande TERMINEE peut etre encaissee',
        );
      const existing = await tx.paiement.findFirst({
        where: { commandeTableId: commandeId },
      });
      if (existing) throw new BadRequestException('Commande deja encaissee');

      return this.createPaiementWithRetry(
        {
          montant,
          moyen,
          sourceType: 'RESTAURANT_ORDER',
          sessionId,
          userId,
          commandeTableId: commandeId,
        },
        tx,
      );
    });
  }

  async getHistorique(caisseId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.sessionCaisse.findMany({
        where: { caisseId },
        orderBy: { ouvertureAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { nom: true, prenom: true } },
          _count: { select: { paiements: true } },
        },
      }),
      this.prisma.sessionCaisse.count({ where: { caisseId } }),
    ]);
    return { data, total, page, limit };
  }
}
