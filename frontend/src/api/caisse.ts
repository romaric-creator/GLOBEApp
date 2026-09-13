import axios from './axios';

export interface Caisse {
  id: string;
  nom: string;
  type: 'HOTEL' | 'RESTAURANT_BAR';
  actif: boolean;
  sessions: SessionCaisse[];
}

export interface SessionCaisse {
  id: string;
  fondInitial: number;
  totalTheorique: number;
  totalReel: number;
  ecart: number;
  statut: 'OUVERTE' | 'FERMEE';
  ouvertureAt: string;
  fermetureAt: string | null;
  caisse?: Caisse;
  paiements?: Paiement[];
  totalTranches?: number;
  user?: { nom: string; prenom: string };
  _count?: { paiements: number; mouvementsCaisse: number };
}

export interface Paiement {
  id: string;
  reference: string;
  montant: number;
  moyen: string;
  sourceType: 'HOTEL_INVOICE' | 'RESTAURANT_ORDER' | 'SERVICE';
  statut: string;
  createdAt: string;
}

export const MOYEN_OPTIONS = [
  { value: 'ESPECES', label: 'Especes' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'AUTRE', label: 'Autre' },
];

export interface MouvementCaisse {
  id: string;
  type: 'APPORT' | 'RETRAIT' | 'DEPENSE';
  montant: number;
  motif: string;
  createdAt: string;
}

export interface PaiementTranche {
  id: string;
  montant: number;
  moyen: string;
  reference: string;
  notes: string | null;
  createdAt: string;
}

export const caisseApi = {
  getCaisses: () => axios.get<Caisse[]>('/caisse').then((r) => r.data),

  getSessionActive: (caisseId: string) =>
    axios.get<SessionCaisse | null>(`/caisse/${caisseId}/session-active`).then((r) => r.data),

  ouvrirSession: (caisseId: string, fondInitial: number) =>
    axios.post(`/caisse/${caisseId}/ouvrir`, { fondInitial }).then((r) => r.data),

  fermerSession: (sessionId: string, totalReel: number, notes?: string, motifEcart?: string) =>
    axios.post(`/caisse/sessions/${sessionId}/fermer`, { totalReel, notes, motifEcart }).then((r) => r.data),

  encaisserHotel: (data: { factureId: string; sessionId: string; montant: number; moyen: string }) =>
    axios.post('/caisse/encaisser/hotel', data).then((r) => r.data),

  encaisserRestaurant: (data: { commandeId: string; sessionId: string; montant: number; moyen: string }) =>
    axios.post('/caisse/encaisser/restaurant', data).then((r) => r.data),

  getHistorique: (caisseId: string, page = 1) =>
    axios.get(`/caisse/${caisseId}/historique`, { params: { page } }).then((r) => r.data),

  getMouvements: (sessionId: string) =>
    axios.get<MouvementCaisse[]>(`/caisse/sessions/${sessionId}/mouvements`).then((r) => r.data),

  ajouterMouvement: (sessionId: string, data: { type: string; montant: number; motif: string }) =>
    axios.post(`/caisse/sessions/${sessionId}/mouvements`, data).then((r) => r.data),

  getTranches: (factureId: string) =>
    axios.get(`/caisse/factures/${factureId}/tranches`).then((r) => r.data),

  enregistrerTranche: (factureId: string, data: { montant: number; moyen: string; notes?: string }) =>
    axios.post(`/caisse/factures/${factureId}/tranches`, data).then((r) => r.data),
};

const isElectron = () => typeof (window as any).electronAPI !== 'undefined';

function writeToWindow(win: Window, html: string) {
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Ouvre une fenêtre de façon synchrone (pendant le user-gesture) pour éviter
// le popup blocker. En Electron on n'en a pas besoin.
function preOpenWindow(): Window | null {
  if (isElectron()) return null;
  return window.open('about:blank', '_blank');
}

async function openTicket(html: string, preWin: Window | null): Promise<void> {
  const api = (window as any).electronAPI;
  if (api?.printTicket) {
    const result = await api.printTicket(html);
    if (result && !result.ok) throw new Error(result.error || "Erreur d'impression");
    return;
  }
  const win = preWin ?? window.open('about:blank', '_blank');
  if (win) writeToWindow(win, html);
}

function fetchAndPrint(url: string): Promise<void> {
  const preWin = preOpenWindow();
  return axios
    .get<string>(url)
    .then((r) => openTicket(r.data, preWin))
    .catch((err) => {
      if (preWin) preWin.close();
      throw err;
    });
}

function openPreview(html: string, preWin: Window | null) {
  const stripped = html.replace(/<script>window\.onload[^<]*<\/script>/g, '');
  const api = (window as any).electronAPI;
  if (api?.previewTicket) {
    api.previewTicket(html); // main process s'occupe du strip + barre
    return;
  }
  const win = preWin ?? window.open('about:blank', '_blank');
  if (win) writeToWindow(win, stripped);
}

function fetchAndPreview(url: string): Promise<void> {
  const preWin = preOpenWindow();
  return axios
    .get<string>(url)
    .then((r) => openPreview(r.data, preWin))
    .catch((err) => {
      if (preWin) preWin.close();
      throw err;
    });
}

export const ticketsApi = {
  imprimerReservation: (id: string) => fetchAndPrint(`/tickets/reservation/${id}`),
  imprimerCommande: (id: string) => fetchAndPrint(`/tickets/commande/${id}`),
  imprimerPiscine: (id: string) => fetchAndPrint(`/tickets/piscine/${id}`),
  imprimerCloture: (sessionId: string) => fetchAndPrint(`/tickets/cloture/${sessionId}`),
  apercevoirReservation: (id: string) => fetchAndPreview(`/tickets/reservation/${id}`),
  apercevoirCommande: (id: string) => fetchAndPreview(`/tickets/commande/${id}`),
  apercevoirPiscine: (id: string) => fetchAndPreview(`/tickets/piscine/${id}`),
  apercevoirCloture: (sessionId: string) => fetchAndPreview(`/tickets/cloture/${sessionId}`),
};
