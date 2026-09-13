import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MoyenPaiement, Prisma, TypeMouvementCaisse } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateMouvementCaisseDto } from './dto/create-mouvement-caisse.dto';

const ECART_SEUIL_ALERTE = 5000;

@Injectable()
export class CaisseService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
  ) {}

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

  async fermerSession(sessionId: string, totalReel: number, notes?: string, motifEcart?: string) {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
      include: { paiements: true, mouvementsCaisse: true, caisse: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (session.statut === 'FERMEE')
      throw new BadRequestException('Cette session est deja fermee');

    // Calcul théorique : fond initial + paiements encaissés + tranches + apports - retraits - dépenses
    const totalPaiements = session.paiements
      .filter((p) => p.statut === 'ENCAISSE')
      .reduce((s, p) => s + Number(p.montant), 0);

    const totalMouvements = session.mouvementsCaisse.reduce((s, m) => {
      if (m.type === 'APPORT') return s + Number(m.montant);
      if (m.type === 'RETRAIT' || m.type === 'DEPENSE') return s - Number(m.montant);
      return s;
    }, 0);

    // Pour la caisse hôtel, inclure les paiements par tranches effectués pendant la session
    let totalTranches = 0;
    if (session.caisse.type === 'HOTEL') {
      const trancheAgg = await this.prisma.paiementTranche.aggregate({
        _sum: { montant: true },
        where: { createdAt: { gte: session.ouvertureAt } },
      });
      totalTranches = Number(trancheAgg._sum.montant ?? 0);
    }

    const totalTheorique = Number(session.fondInitial) + totalPaiements + totalMouvements + totalTranches;
    const ecart = totalReel - totalTheorique;

    if (Math.abs(ecart) >= ECART_SEUIL_ALERTE) {
      this.notifications.emitNotification({
        type: 'CAISSE_ALERTE',
        titre: `Ecart de caisse — ${session.caisse.nom}`,
        message: `La session de ${session.caisse.nom} presente un ecart de ${ecart > 0 ? '+' : ''}${ecart.toLocaleString('fr-FR')} FCFA (theorique: ${totalTheorique.toLocaleString('fr-FR')}, reel: ${totalReel.toLocaleString('fr-FR')}).`,
        data: { sessionId: session.id, ecart, totalTheorique, totalReel },
        createdAt: new Date(),
      });
    }

    return this.prisma.sessionCaisse.update({
      where: { id: sessionId },
      data: {
        statut: 'FERMEE',
        fermetureAt: new Date(),
        totalTheorique,
        totalReel,
        ecart,
        notes: notes || null,
        motifEcart: motifEcart || null,
      },
    });
  }

  async getSessionActive(caisseId: string) {
    const session = await this.prisma.sessionCaisse.findFirst({
      where: { caisseId, statut: 'OUVERTE' },
      orderBy: { ouvertureAt: 'desc' },
      include: {
        paiements: { orderBy: { createdAt: 'desc' } },
        caisse: true,
      },
    });

    if (!session) return null;

    if (session.caisse.type === 'HOTEL') {
      const trancheAgg = await this.prisma.paiementTranche.aggregate({
        _sum: { montant: true },
        where: { createdAt: { gte: session.ouvertureAt } },
      });
      return { ...session, totalTranches: Number(trancheAgg._sum.montant ?? 0) };
    }

    return session;
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
      if (montant <= 0) throw new BadRequestException('Le montant doit etre superieur a 0');
      if (montant > Number(facture.reste)) {
        throw new BadRequestException(
          `Montant depasse le reste du (reste: ${Number(facture.reste).toLocaleString()} FCFA)`,
        );
      }

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
          _count: { select: { paiements: true, mouvementsCaisse: true } },
        },
      }),
      this.prisma.sessionCaisse.count({ where: { caisseId } }),
    ]);
    return { data, total, page, limit };
  }

  // ========================
  // Mouvements de Caisse
  // ========================

  async ajouterMouvement(
    sessionId: string,
    dto: CreateMouvementCaisseDto,
    userId: string,
  ) {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (session.statut !== 'OUVERTE')
      throw new BadRequestException(
        "Impossible d'ajouter un mouvement a une session fermee",
      );

    const isSortie = dto.type === 'RETRAIT' || dto.type === 'DEPENSE';
    if (isSortie) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      });
      const hasSortiePermission = user?.role.permissions.some(
        (rp) => rp.permission.module === "caisse" && rp.permission.action === "sortie",
      );
      if (!hasSortiePermission) {
        throw new ForbiddenException(
          "Action non autorisee : enregistrement de sorties de caisse interdit",
        );
      }
    }

    return this.prisma.mouvementCaisse.create({
      data: {
        type: dto.type as TypeMouvementCaisse,
        montant: dto.montant,
        motif: dto.motif,
        sessionId,
      },
    });
  }

  async getMouvementsCaisse(sessionId: string) {
    return this.prisma.mouvementCaisse.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========================
  // Tranches de paiement hôtel
  // ========================

  async getTranchesFacture(factureId: string) {
    const facture = await this.prisma.factureSejour.findUnique({
      where: { id: factureId },
      include: {
        tranches: { orderBy: { createdAt: 'asc' } },
        reservation: {
          include: {
            client: { select: { nom: true, prenom: true } },
            chambre: { select: { numero: true, type: true } },
          },
        },
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  async enregistrerTranche(
    factureId: string,
    montant: number,
    moyen: MoyenPaiement,
    notes?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const facture = await tx.factureSejour.findUnique({
        where: { id: factureId },
      });
      if (!facture) throw new NotFoundException('Facture introuvable');
      if (facture.payee) throw new BadRequestException('Facture déjà soldée');

      const nouveauMontantPaye = Number(facture.montantPaye) + montant;
      if (nouveauMontantPaye > Number(facture.total)) {
        throw new BadRequestException(
          `Montant dépasse le reste dû (reste: ${Number(facture.reste).toLocaleString()} FCFA)`,
        );
      }
      const payee = nouveauMontantPaye >= Number(facture.total);

      // Générer référence tranche
      const annee = new Date().getFullYear();
      const last = await tx.paiementTranche.findFirst({
        where: { reference: { startsWith: `TR-${annee}-` } },
        orderBy: { reference: 'desc' },
      });
      const seq = last ? parseInt(last.reference.split('-')[2]) + 1 : 1;
      const reference = `TR-${annee}-${String(seq).padStart(5, '0')}`;

      const tranche = await tx.paiementTranche.create({
        data: {
          montant,
          moyen,
          reference,
          notes: notes || null,
          factureSejourId: factureId,
        },
      });

      await tx.factureSejour.update({
        where: { id: factureId },
        data: {
          montantPaye: nouveauMontantPaye,
          reste: Number(facture.total) - nouveauMontantPaye,
          payee,
        },
      });

      return tranche;
    });
  }
}
