import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async genererTicketReservation(reservationId: string): Promise<Buffer> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        chambre: true,
        client: true,
        factureSejour: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reservation introuvable');

    const doc = new PDFDocument({ size: [226, 400], margin: 10 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(14).font('Helvetica-Bold').text('GLOBE RESIDENCE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').text('Ticket de reservation', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('─'.repeat(30), { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(9).font('Helvetica-Bold').text('Client:');
    doc.font('Helvetica').text(`${reservation.client.nom} ${reservation.client.prenom || ''}`);
    if (reservation.client.telephone) doc.text(`Tel: ${reservation.client.telephone}`);
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').text('Chambre:');
    doc.font('Helvetica').text(`N° ${reservation.chambre.numero} — ${reservation.chambre.type}`);
    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').text('Sejour:');
    doc.font('Helvetica').text(`Type: ${reservation.typeReservation}`);
    doc.text(`Arrivee: ${reservation.dateArrivee.toLocaleDateString('fr-FR')}${reservation.heureArrivee ? ' ' + reservation.heureArrivee : ''}`);
    doc.text(`Depart: ${reservation.dateDepart.toLocaleDateString('fr-FR')}${reservation.heureDepart ? ' ' + reservation.heureDepart : ''}`);
    doc.text(`Personnes: ${reservation.nbPersonnes}`);
    doc.moveDown(0.3);

    doc.text('─'.repeat(30), { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11).text(`Total: ${Number(reservation.montantTotal).toLocaleString()} FCFA`, { align: 'center' });

    if (reservation.factureSejour) {
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica').text(`Paye: ${Number(reservation.factureSejour.montantPaye).toLocaleString()} FCFA`, { align: 'center' });
      doc.text(`Reste: ${Number(reservation.factureSejour.reste).toLocaleString()} FCFA`, { align: 'center' });
    }

    doc.moveDown(0.5);
    doc.fontSize(7).text(`Imprime le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.text('Merci de votre visite!', { align: 'center' });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
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

    const doc = new PDFDocument({ size: [226, 400], margin: 10 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(14).font('Helvetica-Bold').text('GLOBE RESIDENCE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').text('Ticket Restaurant / Bar', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).text(`Commande: ${commande.numero}`, { align: 'center' });
    doc.text(`Serveur: ${commande.serveur.prenom} ${commande.serveur.nom}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text('─'.repeat(30), { align: 'center' });
    doc.moveDown(0.3);

    for (const ligne of commande.lignes) {
      const sousTotal = Number(ligne.prixUnitaire) * ligne.quantite;
      doc.font('Helvetica').fontSize(9);
      doc.text(`${ligne.quantite}x ${ligne.produit.nom}`, { continued: true });
      doc.text(`  ${sousTotal.toLocaleString()}`, { align: 'right' });
    }

    doc.moveDown(0.5);
    doc.text('─'.repeat(30), { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11).text(`Total: ${Number(commande.total).toLocaleString()} FCFA`, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).text(`Statut: ${commande.statut}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(7).text(`${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.text('Merci et a bientot!', { align: 'center' });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async genererTicketPiscine(ticketId: string): Promise<Buffer> {
    const ticket = await this.prisma.ticketPiscine.findUnique({
      where: { id: ticketId },
      include: { client: true },
    });
    if (!ticket) throw new NotFoundException('Ticket piscine introuvable');

    const doc = new PDFDocument({ size: [226, 300], margin: 10 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(14).font('Helvetica-Bold').text('GLOBE RESIDENCE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').text('Ticket Piscine', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('─'.repeat(30), { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(9).font('Helvetica-Bold').text('Type:');
    doc.font('Helvetica').text(ticket.type);
    doc.moveDown(0.3);

    if (ticket.client) {
      doc.font('Helvetica-Bold').text('Client:');
      doc.font('Helvetica').text(`${ticket.client.nom} ${ticket.client.prenom || ''}`);
      doc.moveDown(0.3);
    }

    doc.font('Helvetica-Bold').text('Validite:');
    doc.font('Helvetica').text(`Du ${ticket.dateDebut.toLocaleDateString('fr-FR')}${ticket.dateFin ? ' au ' + ticket.dateFin.toLocaleDateString('fr-FR') : ''}`);
    doc.moveDown(0.5);

    doc.text('─'.repeat(30), { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11).text(`Prix: ${Number(ticket.prix).toLocaleString()} FCFA`, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(7).font('Helvetica').text(`${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.text('Bon bain!', { align: 'center' });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
