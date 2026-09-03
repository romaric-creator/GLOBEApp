import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'logo.png');
const GOLD = '#C9A84C';
const DARK = '#1A1A1A';
const GRAY = '#666666';
const LIGHT_GRAY = '#F5F5F5';
const TICKET_WIDTH = 226;

function fmt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function buildDoc(height: number): { doc: PDFKit.PDFDocument; chunks: Buffer[] } {
  const doc = new PDFDocument({ size: [TICKET_WIDTH, height], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  return { doc, chunks };
}

function drawHeader(doc: PDFKit.PDFDocument, subtitle: string): number {
  // Gold top bar
  doc.rect(0, 0, TICKET_WIDTH, 6).fill(GOLD);

  // Logo
  doc.image(LOGO_PATH, TICKET_WIDTH / 2 - 28, 12, { width: 56, height: 56 });

  // App name
  doc
    .fillColor(DARK)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('RÉSIDENCE MEUBLÉE', 0, 74, { align: 'center' });
  doc
    .fillColor(GOLD)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('GLOBE', 0, 88, { align: 'center' });

  // Subtitle badge
  doc.fillColor(DARK).rect(14, 108, TICKET_WIDTH - 28, 18).fill();
  doc
    .fillColor('#FFFFFF')
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(subtitle.toUpperCase(), 0, 113, { align: 'center' });

  return 136; // y position after header
}

function drawSeparator(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(14, y).lineTo(TICKET_WIDTH - 14, y).lineWidth(0.5).strokeColor(GOLD).stroke();
}

function drawField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number,
  x = 14,
): number {
  doc.fillColor(GRAY).fontSize(7).font('Helvetica').text(label.toUpperCase(), x, y);
  doc
    .fillColor(DARK)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(value, x, y + 9, { width: TICKET_WIDTH - 28 });
  return y + 26;
}

function drawFooter(doc: PDFKit.PDFDocument, y: number): void {
  // Gold bottom bar
  doc.rect(0, y, TICKET_WIDTH, 6).fill(GOLD);
  doc
    .fillColor(GRAY)
    .fontSize(6.5)
    .font('Helvetica')
    .text(`Imprimé le ${new Date().toLocaleString('fr-FR')}`, 0, y - 14, { align: 'center' });
}

function finalize(doc: PDFKit.PDFDocument, chunks: Buffer[]): Promise<Buffer> {
  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async genererTicketReservation(reservationId: string): Promise<Buffer> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { chambre: true, client: true, factureSejour: true },
    });
    if (!reservation) throw new NotFoundException('Reservation introuvable');

    const { doc, chunks } = buildDoc(440);
    let y = drawHeader(doc, 'Ticket de réservation');

    // Section client
    y += 8;
    y = drawField(doc, 'Client', `${reservation.client.nom} ${reservation.client.prenom || ''}`, y);
    if (reservation.client.telephone) {
      y = drawField(doc, 'Téléphone', reservation.client.telephone, y);
    }

    drawSeparator(doc, y);
    y += 8;

    // Section chambre
    y = drawField(doc, 'Chambre', `N° ${reservation.chambre.numero} — ${reservation.chambre.type}`, y);
    y = drawField(doc, 'Type de séjour', reservation.typeReservation, y);
    y = drawField(
      doc,
      'Arrivée',
      `${reservation.dateArrivee.toLocaleDateString('fr-FR')}${reservation.heureArrivee ? '  ' + reservation.heureArrivee : ''}`,
      y,
    );
    y = drawField(
      doc,
      'Départ',
      `${reservation.dateDepart.toLocaleDateString('fr-FR')}${reservation.heureDepart ? '  ' + reservation.heureDepart : ''}`,
      y,
    );
    y = drawField(doc, 'Personnes', String(reservation.nbPersonnes), y);

    drawSeparator(doc, y);
    y += 8;

    // Total block
    doc.rect(14, y, TICKET_WIDTH - 28, 28).fill(LIGHT_GRAY);
    doc.fillColor(GRAY).fontSize(7).font('Helvetica').text('TOTAL', 14, y + 4, { width: TICKET_WIDTH - 28, align: 'center' });
    doc
      .fillColor(DARK)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(`${fmt(Number(reservation.montantTotal))} FCFA`, 14, y + 12, {
        width: TICKET_WIDTH - 28,
        align: 'center',
      });
    y += 36;

    if (reservation.factureSejour) {
      doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(
        `Payé: ${fmt(Number(reservation.factureSejour.montantPaye))} FCFA`,
        0, y, { align: 'center' },
      );
      y += 12;
      doc.fillColor(Number(reservation.factureSejour.reste) > 0 ? '#C0392B' : '#27AE60').fontSize(8).font('Helvetica-Bold').text(
        `Reste: ${fmt(Number(reservation.factureSejour.reste))} FCFA`,
        0, y, { align: 'center' },
      );
      y += 16;
    }

    drawFooter(doc, y + 4);
    return finalize(doc, chunks);
  }

  async genererTicketCommande(commandeId: string): Promise<Buffer> {
    const commande = await this.prisma.commandeTable.findUnique({
      where: { id: commandeId },
      include: {
        lignes: { include: { produit: { select: { nom: true } } } },
        serveur: { select: { nom: true, prenom: true } },
      },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');

    const lineHeight = 14;
    const height = 300 + commande.lignes.length * lineHeight;
    const { doc, chunks } = buildDoc(height);
    let y = drawHeader(doc, 'Ticket Restaurant / Bar');

    y += 8;
    y = drawField(doc, 'Commande N°', commande.numero, y);
    y = drawField(doc, 'Serveur', `${commande.serveur.prenom} ${commande.serveur.nom}`, y);

    drawSeparator(doc, y);
    y += 8;

    // Column headers
    doc.fillColor(GRAY).fontSize(7).font('Helvetica');
    doc.text('ARTICLE', 14, y);
    doc.text('TOTAL', TICKET_WIDTH - 55, y, { width: 41, align: 'right' });
    y += 11;
    drawSeparator(doc, y);
    y += 6;

    // Lines
    for (const ligne of commande.lignes) {
      const sousTotal = Number(ligne.prixUnitaire) * ligne.quantite;
      doc.fillColor(DARK).fontSize(8.5).font('Helvetica');
      doc.text(`${ligne.quantite}× ${ligne.produit.nom}`, 14, y, { width: 130 });
      doc.text(`${fmt(sousTotal)}`, TICKET_WIDTH - 55, y, { width: 41, align: 'right' });
      y += lineHeight;
    }

    y += 4;
    drawSeparator(doc, y);
    y += 8;

    // Total block
    doc.rect(14, y, TICKET_WIDTH - 28, 28).fill(LIGHT_GRAY);
    doc.fillColor(GRAY).fontSize(7).font('Helvetica').text('TOTAL', 14, y + 4, { width: TICKET_WIDTH - 28, align: 'center' });
    doc
      .fillColor(DARK)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(`${fmt(Number(commande.total))} FCFA`, 14, y + 12, {
        width: TICKET_WIDTH - 28,
        align: 'center',
      });
    y += 38;

    // Status badge
    const statutColor = commande.statut === 'TERMINEE' ? '#27AE60' : commande.statut === 'EN_PREPARATION' ? GOLD : GRAY;
    doc.rect(TICKET_WIDTH / 2 - 35, y, 70, 16).fill(statutColor);
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(commande.statut, 0, y + 4, { align: 'center' });
    y += 24;

    drawFooter(doc, y + 4);
    return finalize(doc, chunks);
  }

  async genererRapportCloture(sessionId: string): Promise<Buffer> {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
      include: {
        caisse: true,
        user: { select: { nom: true, prenom: true } },
        mouvementsCaisse: true,
        paiements: true,
      },
    });
    if (!session) throw new NotFoundException('Session introuvable');

    const nbMouvements = session.mouvementsCaisse.length;
    const lineHeight = 16;
    const height = 440 + nbMouvements * lineHeight;
    const { doc, chunks } = buildDoc(height);

    const typeLabel = session.caisse.type === 'HOTEL' ? 'Clôture Caisse Hôtel' : 'Clôture Caisse Restaurant';
    let y = drawHeader(doc, typeLabel);

    y += 8;
    y = drawField(doc, 'Caisse', session.caisse.nom, y);
    y = drawField(doc, 'Caissier', `${session.user.prenom} ${session.user.nom}`, y);

    const fmt2 = (d: Date) => d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    y = drawField(doc, 'Ouverture', fmt2(session.ouvertureAt), y);
    y = drawField(doc, 'Cloture', session.fermetureAt ? fmt2(session.fermetureAt) : '—', y);

    drawSeparator(doc, y);
    y += 8;

    y = drawField(doc, 'Fond initial', `${fmt(Number(session.fondInitial))} FCFA`, y);
    y = drawField(doc, 'Total theorique', `${fmt(Number(session.totalTheorique))} FCFA`, y);
    y = drawField(doc, 'Total reel', `${fmt(Number(session.totalReel))} FCFA`, y);

    const ecart = Number(session.ecart);
    const ecartColor = ecart < 0 ? '#C0392B' : ecart > 0 ? '#27AE60' : DARK;
    doc.fillColor(GRAY).fontSize(7).font('Helvetica').text('ECART', 14, y);
    doc.fillColor(ecartColor).fontSize(9).font('Helvetica-Bold')
      .text(`${ecart >= 0 ? '+' : ''}${fmt(ecart)} FCFA`, 14, y + 9, { width: TICKET_WIDTH - 28 });
    y += 26;

    if (session.mouvementsCaisse.length > 0) {
      drawSeparator(doc, y);
      y += 8;
      doc.fillColor(GRAY).fontSize(7).font('Helvetica').text('MOUVEMENTS', 14, y);
      y += 12;
      for (const mv of session.mouvementsCaisse) {
        const mvColor = mv.type === 'APPORT' ? '#27AE60' : '#C0392B';
        doc.fillColor(mvColor).fontSize(7.5).font('Helvetica-Bold').text(mv.type, 14, y, { width: 60 });
        doc.fillColor(DARK).fontSize(7.5).font('Helvetica').text(mv.motif, 74, y, { width: 80 });
        doc.fillColor(DARK).fontSize(7.5).font('Helvetica-Bold')
          .text(`${fmt(Number(mv.montant))} F`, TICKET_WIDTH - 55, y, { width: 41, align: 'right' });
        y += lineHeight;
      }
    }

    drawSeparator(doc, y);
    y += 8;
    doc.fillColor(GRAY).fontSize(7).font('Helvetica')
      .text(`${session.paiements.length} paiement(s) enregistre(s)`, 0, y, { align: 'center' });
    y += 14;

    drawFooter(doc, y + 4);
    return finalize(doc, chunks);
  }

  async genererTicketPiscine(ticketId: string): Promise<Buffer> {
    const ticket = await this.prisma.ticketPiscine.findUnique({
      where: { id: ticketId },
      include: {
        client: true,
        transactions: {
          where: { type: { not: 'RETOUR' } },
          include: { accessoire: { select: { nom: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket piscine introuvable');

    const lineHeight = 14;
    const extrasHeight = ticket.transactions.length * lineHeight;
    const { doc, chunks } = buildDoc(380 + extrasHeight);
    let y = drawHeader(doc, 'Ticket Piscine');

    y += 8;

    if (ticket.code) {
      doc.fillColor(DARK).rect(14, y, TICKET_WIDTH - 28, 20).fill();
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
        .text(ticket.code, 0, y + 5, { align: 'center' });
      y += 28;
    }

    y = drawField(doc, "Type d'accès", ticket.type.replace(/_/g, ' '), y);

    if (ticket.client) {
      y = drawField(doc, 'Client', `${ticket.client.nom} ${ticket.client.prenom || ''}`, y);
    }

    if (ticket.emplacementNumero) {
      y = drawField(doc, 'Emplacement', ticket.emplacementNumero, y);
    }

    drawSeparator(doc, y);
    y += 8;

    const validite = ticket.dateFin
      ? `${ticket.dateDebut.toLocaleDateString('fr-FR')} → ${ticket.dateFin.toLocaleDateString('fr-FR')}`
      : `${ticket.dateDebut.toLocaleDateString('fr-FR')}`;
    y = drawField(doc, 'Validité', validite, y);

    drawSeparator(doc, y);
    y += 8;

    // Lignes : entrée
    doc.fillColor(GRAY).fontSize(7).font('Helvetica').text('ARTICLE', 14, y);
    doc.text('TOTAL', TICKET_WIDTH - 55, y, { width: 41, align: 'right' });
    y += 11;
    drawSeparator(doc, y);
    y += 6;

    doc.fillColor(DARK).fontSize(8.5).font('Helvetica');
    doc.text(`1× Entrée ${ticket.type.replace(/_/g, ' ').toLowerCase()}`, 14, y, { width: 130 });
    doc.text(`${fmt(Number(ticket.prix))}`, TICKET_WIDTH - 55, y, { width: 41, align: 'right' });
    y += lineHeight;

    for (const tx of ticket.transactions) {
      doc.text(`${tx.quantite}× ${tx.accessoire.nom}`, 14, y, { width: 130 });
      doc.text(`${fmt(Number(tx.total))}`, TICKET_WIDTH - 55, y, { width: 41, align: 'right' });
      y += lineHeight;
    }

    y += 4;
    drawSeparator(doc, y);
    y += 8;

    const totalGeneral = Number(ticket.prix) + ticket.transactions.reduce((s, t) => s + Number(t.total), 0);

    // Total block
    doc.rect(14, y, TICKET_WIDTH - 28, 28).fill(LIGHT_GRAY);
    doc.fillColor(GRAY).fontSize(7).font('Helvetica').text('TOTAL', 14, y + 4, { width: TICKET_WIDTH - 28, align: 'center' });
    doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold')
      .text(`${fmt(totalGeneral)} FCFA`, 14, y + 12, { width: TICKET_WIDTH - 28, align: 'center' });
    y += 38;

    doc.fillColor(GOLD).fontSize(8).font('Helvetica-Bold').text('Bon bain !', 0, y, { align: 'center' });
    y += 16;

    drawFooter(doc, y + 4);
    return finalize(doc, chunks);
  }
}
