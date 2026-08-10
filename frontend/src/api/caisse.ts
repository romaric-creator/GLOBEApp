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

export const caisseApi = {
  getCaisses: () => axios.get<Caisse[]>('/caisse').then((r) => r.data),

  getSessionActive: (caisseId: string) =>
    axios.get<SessionCaisse | null>(`/caisse/${caisseId}/session-active`).then((r) => r.data),

  ouvrirSession: (caisseId: string, fondInitial: number) =>
    axios.post(`/caisse/${caisseId}/ouvrir`, { fondInitial }).then((r) => r.data),

  fermerSession: (sessionId: string, totalReel: number, notes?: string) =>
    axios.post(`/caisse/sessions/${sessionId}/fermer`, { totalReel, notes }).then((r) => r.data),

  encaisserHotel: (data: { factureId: string; sessionId: string; montant: number; moyen: string }) =>
    axios.post('/caisse/encaisser/hotel', data).then((r) => r.data),

  encaisserRestaurant: (data: { commandeId: string; sessionId: string; montant: number; moyen: string }) =>
    axios.post('/caisse/encaisser/restaurant', data).then((r) => r.data),

  getHistorique: (caisseId: string, page = 1) =>
    axios.get(`/caisse/${caisseId}/historique`, { params: { page } }).then((r) => r.data),
};
