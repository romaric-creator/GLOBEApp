import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';

function fmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

async function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
    width: 120,
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
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    font-size: 11px;
    color: #111;
    width: 80mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─── EN-TÊTE ─────────────────────────────────── */
  .ticket-header {
    background: #1a1a1a;
    color: #fff;
    text-align: center;
    padding: 10px 8px 8px;
  }
  .ticket-header .brand {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 4px;
    text-transform: uppercase;
  }
  .ticket-header .subtitle {
    font-size: 8px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.7;
    margin-top: 2px;
  }
  .ticket-header .type-badge {
    display: inline-block;
    margin-top: 6px;
    border: 1px solid rgba(255,255,255,0.45);
    border-radius: 2px;
    padding: 2px 10px;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.9);
  }

  /* ─── CORPS ───────────────────────────────────── */
  .section { padding: 6px 10px; }
  .section + .section { border-top: 1px dashed #ccc; }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2px 0;
  }
  .row .lbl {
    font-size: 8.5px;
    text-transform: uppercase;
    color: #666;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    margin-right: 6px;
  }
  .row .val {
    font-weight: 700;
    font-size: 11px;
    text-align: right;
  }

  /* ─── BLOC TOTAL ──────────────────────────────── */
  .total-section {
    background: #f5f5f5;
    border-top: 2px solid #1a1a1a;
    border-bottom: 2px solid #1a1a1a;
    padding: 7px 10px;
    text-align: center;
  }
  .total-section .lbl {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #555;
  }
  .total-section .amount {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 1px;
    margin-top: 1px;
  }
  .total-section .sub {
    font-size: 9px;
    color: #555;
    margin-top: 3px;
  }

  /* ─── LIGNES ARTICLES ─────────────────────────── */
  .items { padding: 4px 10px; }
  .items .col-head {
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    border-bottom: 1px solid #ddd;
    padding-bottom: 3px;
    margin-bottom: 2px;
  }
  .items .item {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: 2px 0;
  }
  .items .item .name { flex: 1; padding-right: 4px; word-break: break-word; }
  .items .item .price { white-space: nowrap; font-weight: 700; }

  /* ─── QR CODE ─────────────────────────────────── */
  .qr-section {
    text-align: center;
    padding: 8px 10px 4px;
    border-top: 1px dashed #ccc;
  }
  .qr-section svg {
    display: block;
    margin: 0 auto;
    width: 80px;
    height: 80px;
  }
  .qr-section .qr-label {
    font-size: 7.5px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 3px;
  }
  .qr-section .qr-code-text {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    margin-top: 1px;
    font-family: 'Courier New', monospace;
  }

  /* ─── PIED DE PAGE ────────────────────────────── */
  .ticket-footer {
    background: #1a1a1a;
    color: rgba(255,255,255,0.6);
    text-align: center;
    font-size: 7.5px;
    padding: 5px 8px;
    letter-spacing: 0.5px;
  }
  .ticket-footer .timestamp { color: rgba(255,255,255,0.9); font-weight: 600; }

  /* ─── STATUT ──────────────────────────────────── */
  .status-pill {
    display: inline-block;
    border: 1.5px solid #1a1a1a;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 3px 12px;
    margin: 4px auto;
  }
  .status-paid { border-color: #1a1a1a; }
  .status-due   { border-color: #1a1a1a; background: #1a1a1a; color: #fff; }
</style>
</head>
<body>
${body}
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}

function ticketHeader(typeLabel: string): string {
  return `<div class="ticket-header">
  <div class="brand">GLOBE</div>
  <div class="subtitle">Résidence Meublée</div>
  <div class="type-badge">${typeLabel}</div>
</div>`;
}

function section(...rows: string[]): string {
  return `<div class="section">${rows.join('')}</div>`;
}

function row(label: string, value: string): string {
  return `<div class="row"><span class="lbl">${label}</span><span class="val">${value}</span></div>`;
}

function totalSection(amount: string, sub?: string): string {
  return `<div class="total-section">
  <div class="lbl">Montant total</div>
  <div class="amount">${amount} FCFA</div>
  ${sub ? `<div class="sub">${sub}</div>` : ''}
</div>`;
}

function ticketFooter(): string {
  const now = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return `<div class="ticket-footer">Imprimé le <span class="timestamp">${now}</span> · GLOBE Manager</div>`;
}

function qrSection(svg: string, codeText: string, label = 'Référence'): string {
  return `<div class="qr-section">
  ${svg}
  <div class="qr-label">${label}</div>
  <div class="qr-code-text">${codeText}</div>
</div>`;
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
    const ref = `RES-${r.id.slice(-8).toUpperCase()}`;
    const qrData = `GLOBE:RES:${r.id}:${ref}`;
    const svg = await qrSvg(qrData);

    const payé = r.factureSejour ? Number(r.factureSejour.montantPaye) : 0;
    const reste = r.factureSejour ? Number(r.factureSejour.reste) : Number(r.montantTotal);
    const estSolde = reste === 0;

    let body = ticketHeader('Ticket de réservation');

    body += section(
      row('Client', `${r.client.nom} ${r.client.prenom || ''}`),
      ...(r.client.telephone ? [row('Téléphone', r.client.telephone)] : []),
    );

    body += section(
      row('Chambre', `N° ${r.chambre.numero} — ${r.chambre.type}`),
      row('Type de séjour', r.typeReservation.replace(/_/g, ' ')),
      row('Arrivée', `${fmtDate(r.dateArrivee)}${r.heureArrivee ? '  ' + r.heureArrivee : ''}`),
      row('Départ', `${fmtDate(r.dateDepart)}${r.heureDepart ? '  ' + r.heureDepart : ''}`),
      row('Personnes', String(r.nbPersonnes)),
    );

    const subLabel = r.factureSejour
      ? `Payé ${fmt(payé)} · Reste ${fmt(reste)} FCFA`
      : undefined;
    body += totalSection(fmt(Number(r.montantTotal)), subLabel);

    if (r.factureSejour) {
      body += `<div style="text-align:center;padding:5px 0;">
        <span class="status-pill ${estSolde ? 'status-paid' : 'status-due'}">${estSolde ? '✓ SOLDÉ' : `RESTE ${fmt(reste)} FCFA`}</span>
      </div>`;
    }

    body += qrSection(svg, ref, 'Référence réservation');
    body += ticketFooter();

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

    const ref = commande.numero;
    const qrData = `GLOBE:CMD:${commande.id}:${ref}`;
    const svg = await qrSvg(qrData);

    let body = ticketHeader('Ticket Restaurant / Bar');

    body += section(
      row('Commande', commande.numero),
      row('Serveur', `${commande.serveur.prenom} ${commande.serveur.nom}`),
      row('Date', fmtDateTime(commande.createdAt)),
    );

    body += `<div class="items">
  <div class="col-head"><span>Article</span><span>Total</span></div>`;
    for (const ligne of commande.lignes) {
      const sous = Number(ligne.prixUnitaire) * ligne.quantite;
      body += `<div class="item">
        <span class="name">${ligne.quantite}× ${ligne.produit.nom}</span>
        <span class="price">${fmt(sous)}</span>
      </div>`;
    }
    body += `</div>`;

    body += totalSection(fmt(Number(commande.total)));

    body += `<div style="text-align:center;padding:5px 0;">
      <span class="status-pill">${commande.statut}</span>
    </div>`;

    body += qrSection(svg, ref, 'Référence commande');
    body += ticketFooter();

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

    const typeLabel = session.caisse.type === 'HOTEL'
      ? 'Clôture Caisse Hôtel'
      : 'Clôture Caisse Restaurant';

    const ref = `CLT-${session.id.slice(-8).toUpperCase()}`;
    const qrData = `GLOBE:SESSION:${session.id}:${ref}`;
    const svg = await qrSvg(qrData);

    let body = ticketHeader(typeLabel);

    body += section(
      row('Caisse', session.caisse.nom),
      row('Caissier', `${session.user.prenom} ${session.user.nom}`),
      row('Ouverture', fmtDateTime(session.ouvertureAt)),
      row('Clôture', session.fermetureAt ? fmtDateTime(session.fermetureAt) : '—'),
    );

    const ecart = Number(session.ecart);
    body += section(
      row('Fond initial', `${fmt(Number(session.fondInitial))} FCFA`),
      row('Total théorique', `${fmt(Number(session.totalTheorique))} FCFA`),
      row('Total réel', `${fmt(Number(session.totalReel))} FCFA`),
      row('Écart', `${ecart >= 0 ? '+' : ''}${fmt(ecart)} FCFA${ecart < 0 ? ' (DÉFICIT)' : ecart > 0 ? ' (SURPLUS)' : ''}`),
    );

    if (session.mouvementsCaisse.length > 0) {
      let mvRows = '';
      for (const mv of session.mouvementsCaisse) {
        mvRows += row(`[${mv.type}] ${mv.motif || ''}`, `${fmt(Number(mv.montant))} F`);
      }
      body += section(mvRows);
    }

    body += totalSection(fmt(Number(session.totalTheorique)), `${session.paiements.length} paiement(s)`);

    body += qrSection(svg, ref, 'Référence session');
    body += ticketFooter();

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

    const codeRef = ticket.code || `PIS-${ticket.id.slice(-8).toUpperCase()}`;
    const qrData = `GLOBE:PIS:${ticket.id}:${codeRef}`;
    const svg = await qrSvg(qrData);

    let body = ticketHeader('Ticket Piscine');

    body += section(
      row("Type d'accès", ticket.type.replace(/_/g, ' ')),
      ...(ticket.client ? [row('Client', `${ticket.client.nom} ${ticket.client.prenom || ''}`)] : []),
      ...(ticket.emplacementNumero ? [row('Emplacement', ticket.emplacementNumero)] : []),
    );

    const validite = ticket.dateFin
      ? `${fmtDate(ticket.dateDebut)} → ${fmtDate(ticket.dateFin)}`
      : fmtDate(ticket.dateDebut);
    body += section(row('Validité', validite));

    const totalGeneral = Number(ticket.prix) + ticket.transactions.reduce((s, t) => s + Number(t.total), 0);

    body += `<div class="items">
  <div class="col-head"><span>Article</span><span>Total</span></div>
  <div class="item">
    <span class="name">1× Entrée ${ticket.type.replace(/_/g, ' ').toLowerCase()}</span>
    <span class="price">${fmt(Number(ticket.prix))}</span>
  </div>`;
    for (const tx of ticket.transactions) {
      body += `<div class="item">
        <span class="name">${tx.quantite}× ${tx.accessoire.nom}</span>
        <span class="price">${fmt(Number(tx.total))}</span>
      </div>`;
    }
    body += `</div>`;

    body += totalSection(fmt(totalGeneral));

    body += `<div style="text-align:center;padding:6px 0;font-size:11px;font-weight:700;letter-spacing:1px;">
      ✦ BON BAIN ! ✦
    </div>`;

    body += qrSection(svg, codeRef, 'Code d\'accès piscine');
    body += ticketFooter();

    return baseHtml('Ticket Piscine', body);
  }
}
