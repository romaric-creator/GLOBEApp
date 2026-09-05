import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


function fmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR');
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #000;
    width: 80mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Barres de séparation haut/bas : noir pour thermique */
  .bar { height: 4px; background: #000; }
  .header { text-align: center; padding: 8px 0 4px; }
  .header .company { font-weight: bold; font-size: 12px; letter-spacing: 0.5px; }
  .header .brand { font-weight: bold; font-size: 16px; letter-spacing: 2px; }
  /* Badge titre : noir plein, texte blanc */
  .badge {
    background: #000;
    color: #fff;
    text-align: center;
    font-weight: bold;
    font-size: 9px;
    letter-spacing: 1px;
    padding: 4px 0;
    margin: 6px 10px 0;
    text-transform: uppercase;
  }
  /* Séparateur : tirets noirs bien visibles */
  .sep { border: none; border-top: 1px dashed #000; margin: 6px 10px; }
  .field { padding: 2px 10px 4px; }
  .field .lbl { font-size: 9px; text-transform: uppercase; }
  .field .val { font-weight: bold; font-size: 11px; }
  /* Bloc total : bordure noire au lieu de fond gris */
  .total-block {
    border: 2px solid #000;
    text-align: center;
    margin: 6px 10px;
    padding: 4px 0 6px;
  }
  .total-block .lbl { font-size: 9px; text-transform: uppercase; }
  .total-block .amount { font-weight: bold; font-size: 15px; }
  .items { padding: 0 10px; }
  .items .col-head { display: flex; justify-content: space-between; font-size: 9px; text-transform: uppercase; padding: 2px 0; border-bottom: 1px solid #000; }
  .items .item { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
  .items .item .name { flex: 1; padding-right: 4px; word-break: break-word; }
  .items .item .price { white-space: nowrap; }
  .footer { text-align: center; font-size: 9px; padding: 4px 0 2px; }
  /* États en gras + parenthèses au lieu de couleurs */
  .status-ok { font-weight: bold; }
  .status-warn { font-weight: bold; text-decoration: underline; }
</style>
</head>
<body>
${body}
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

function header(subtitle: string): string {
  return `<div class="bar"></div>
<div class="header">
  <div class="company">RESIDENCE MEUBLEE</div>
  <div class="brand">GLOBE</div>
</div>
<div class="badge">${subtitle}</div>`;
}

function sep(): string {
  return '<hr class="sep"/>';
}

function field(label: string, value: string): string {
  return `<div class="field"><div class="lbl">${label}</div><div class="val">${value}</div></div>`;
}

function totalBlock(amount: string): string {
  return `<div class="total-block"><div class="lbl">Total</div><div class="amount">${amount} FCFA</div></div>`;
}

function footer(): string {
  return `${sep()}<div class="footer">Imprimé le ${new Date().toLocaleString('fr-FR')}</div><div class="bar"></div>`;
}

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async genererTicketReservation(reservationId: string): Promise<string> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { chambre: true, client: true, factureSejour: true },
    });
    if (!reservation) throw new NotFoundException('Reservation introuvable');

    const r = reservation;
    let body = header('Ticket de réservation');

    body += field('Client', `${r.client.nom} ${r.client.prenom || ''}`);
    if (r.client.telephone) body += field('Téléphone', r.client.telephone);
    body += sep();
    body += field('Chambre', `N° ${r.chambre.numero} — ${r.chambre.type}`);
    body += field('Type de séjour', r.typeReservation);
    body += field('Arrivée', `${fmtDate(r.dateArrivee)}${r.heureArrivee ? '  ' + r.heureArrivee : ''}`);
    body += field('Départ', `${fmtDate(r.dateDepart)}${r.heureDepart ? '  ' + r.heureDepart : ''}`);
    body += field('Personnes', String(r.nbPersonnes));
    body += sep();
    body += totalBlock(fmt(Number(r.montantTotal)));

    if (r.factureSejour) {
      const payé = Number(r.factureSejour.montantPaye);
      const reste = Number(r.factureSejour.reste);
      body += `<div class="field"><div class="val" style="text-align:center;font-size:11px;">Paye : ${fmt(payé)} FCFA</div></div>`;
      body += `<div class="field"><div class="val" style="text-align:center;font-weight:bold;${reste > 0 ? 'text-decoration:underline;' : ''}">Reste : ${fmt(reste)} FCFA${reste > 0 ? ' (DU)' : ' (SOLDE)'}</div></div>`;
    }

    body += footer();
    return baseHtml('Ticket Réservation', body);
  }

  async genererTicketCommande(commandeId: string): Promise<string> {
    const commande = await this.prisma.commandeTable.findUnique({
      where: { id: commandeId },
      include: {
        lignes: { include: { produit: { select: { nom: true } } } },
        serveur: { select: { nom: true, prenom: true } },
      },
    });
    if (!commande) throw new NotFoundException('Commande introuvable');

    let body = header('Ticket Restaurant / Bar');
    body += field('Commande N°', commande.numero);
    body += field('Serveur', `${commande.serveur.prenom} ${commande.serveur.nom}`);
    body += sep();

    body += `<div class="items">
  <div class="col-head"><span>Article</span><span>Total</span></div>`;
    for (const ligne of commande.lignes) {
      const sous = Number(ligne.prixUnitaire) * ligne.quantite;
      body += `<div class="item"><span class="name">${ligne.quantite}× ${ligne.produit.nom}</span><span class="price">${fmt(sous)}</span></div>`;
    }
    body += `</div>`;

    body += sep();
    body += totalBlock(fmt(Number(commande.total)));

    body += `<div style="text-align:center;margin:4px 0;"><span style="border:1px solid #000;font-weight:bold;font-size:9px;padding:3px 10px;">${commande.statut}</span></div>`;

    body += footer();
    return baseHtml('Ticket Commande', body);
  }

  async genererRapportCloture(sessionId: string): Promise<string> {
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

    const typeLabel = session.caisse.type === 'HOTEL' ? 'Clôture Caisse Hôtel' : 'Clôture Caisse Restaurant';
    let body = header(typeLabel);

    body += field('Caisse', session.caisse.nom);
    body += field('Caissier', `${session.user.prenom} ${session.user.nom}`);
    body += field('Ouverture', fmtDateTime(session.ouvertureAt));
    body += field('Clôture', session.fermetureAt ? fmtDateTime(session.fermetureAt) : '—');
    body += sep();
    body += field('Fond initial', `${fmt(Number(session.fondInitial))} FCFA`);
    body += field('Total théorique', `${fmt(Number(session.totalTheorique))} FCFA`);
    body += field('Total réel', `${fmt(Number(session.totalReel))} FCFA`);

    const ecart = Number(session.ecart);
    const ecartStyle = ecart !== 0 ? 'font-weight:bold;text-decoration:underline;' : 'font-weight:bold;';
    body += `<div class="field"><div class="lbl">Ecart</div><div class="val" style="${ecartStyle}">${ecart >= 0 ? '+' : ''}${fmt(ecart)} FCFA${ecart < 0 ? ' (DEFICIT)' : ecart > 0 ? ' (SURPLUS)' : ''}</div></div>`;

    if (session.mouvementsCaisse.length > 0) {
      body += sep();
      body += `<div class="field"><div class="lbl">Mouvements</div></div>`;
      body += `<div class="items">`;
      for (const mv of session.mouvementsCaisse) {
        body += `<div class="item"><span class="name" style="font-weight:bold;">[${mv.type}]</span><span class="price">${fmt(Number(mv.montant))} F</span></div>`;
        if (mv.motif) body += `<div style="padding: 0 10px 2px; font-size:9px;">${mv.motif}</div>`;
      }
      body += `</div>`;
    }

    body += sep();
    body += `<div class="footer">${session.paiements.length} paiement(s) enregistré(s)</div>`;
    body += footer();
    return baseHtml('Rapport Clôture', body);
  }

  async genererTicketPiscine(ticketId: string): Promise<string> {
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

    let body = header('Ticket Piscine');

    if (ticket.code) {
      body += `<div style="background:#000;color:#fff;font-weight:bold;font-size:13px;text-align:center;margin:6px 10px;padding:5px 0;">${ticket.code}</div>`;
    }

    body += field("Type d'accès", ticket.type.replace(/_/g, ' '));
    if (ticket.client) body += field('Client', `${ticket.client.nom} ${ticket.client.prenom || ''}`);
    if (ticket.emplacementNumero) body += field('Emplacement', ticket.emplacementNumero);

    body += sep();
    const validite = ticket.dateFin
      ? `${fmtDate(ticket.dateDebut)} → ${fmtDate(ticket.dateFin)}`
      : fmtDate(ticket.dateDebut);
    body += field('Validité', validite);
    body += sep();

    const totalGeneral = Number(ticket.prix) + ticket.transactions.reduce((s, t) => s + Number(t.total), 0);

    body += `<div class="items">
  <div class="col-head"><span>Article</span><span>Total</span></div>
  <div class="item"><span class="name">1× Entrée ${ticket.type.replace(/_/g, ' ').toLowerCase()}</span><span class="price">${fmt(Number(ticket.prix))}</span></div>`;
    for (const tx of ticket.transactions) {
      body += `<div class="item"><span class="name">${tx.quantite}× ${tx.accessoire.nom}</span><span class="price">${fmt(Number(tx.total))}</span></div>`;
    }
    body += `</div>`;

    body += sep();
    body += totalBlock(fmt(totalGeneral));
    body += `<div style="text-align:center;font-weight:bold;font-size:11px;padding:4px 0;">*** BON BAIN ! ***</div>`;
    body += footer();
    return baseHtml('Ticket Piscine', body);
  }
}
