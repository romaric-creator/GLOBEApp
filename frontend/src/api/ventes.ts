import axios from './axios';

export interface LigneVente {
  id: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  totalLigne: number;
  produit: { id: string; nom: string; reference: string };
}

export interface Vente {
  id: string;
  numero: string;
  date: string;
  sousTotal: number;
  remise: number;
  taxe: number;
  total: number;
  modePaiement: string;
  statut: string;
  client?: { id: string; nom: string; prenom?: string };
  user?: { nom: string; prenom: string };
  lignes: LigneVente[];
}

export interface Creance {
  id: string;
  montant: number;
  dateEcheance: string;
  statut: string;
  client: { id: string; nom: string; prenom?: string };
  vente: { numero: string };
}

export interface CreateLigneDto {
  produitId: string;
  quantite: number;
  prixUnitaire: number;
  remise?: number;
}

export interface CreateVenteDto {
  modePaiement: string;
  clientId?: string;
  remise?: number;
  lignes: CreateLigneDto[];
}

export interface EtatCaisse {
  caisseOuverte: boolean;
  montantOuverture: number;
  totalVentes: number;
  nbVentes: number;
  ventesParMode: { mode: string; total: number; count: number }[];
}

export interface ClotureCaisse {
  id: string;
  date: string;
  montantOuverture: number;
  montantCloture: number;
  ecart: number;
  user?: { nom: string; prenom: string };
}

export const ventesApi = {
  getAll: (page = 1, limit = 20) =>
    axios.get<{ data: Vente[]; total: number }>('/ventes', { params: { page, limit } }).then((r) => r.data),

  getOne: (id: string) =>
    axios.get<Vente>(`/ventes/${id}`).then((r) => r.data),

  create: (dto: CreateVenteDto) =>
    axios.post<Vente>('/ventes', dto).then((r) => r.data),

  annuler: (id: string) =>
    axios.patch<Vente>(`/ventes/${id}/annuler`).then((r) => r.data),

  genererTicket: (id: string) =>
    axios.post(`/ventes/${id}/ticket`).then((r) => r.data),

  createAvoir: (dto: { venteId: string; motif: string; montant: number }) =>
    axios.post('/ventes/avoir', dto).then((r) => r.data),

  getStats: () =>
    axios.get('/ventes/stats').then((r) => r.data),

  getCreances: (clientId?: string) =>
    axios.get<Creance[]>('/ventes/creances', { params: clientId ? { clientId } : {} }).then((r) => r.data),

  payerCreance: (id: string) =>
    axios.patch(`/ventes/creances/${id}/payer`).then((r) => r.data),

  // Caisse
  ouvrirCaisse: (montantOuverture: number) =>
    axios.post('/caisse/ouvrir', { montantOuverture }).then((r) => r.data),

  cloturerCaisse: (montantCloture: number) =>
    axios.post('/caisse/cloturer', { montantCloture }).then((r) => r.data),

  getEtatCaisse: () =>
    axios.get<EtatCaisse>('/caisse/etat').then((r) => r.data),

  getHistoriqueCaisse: (page = 1, limit = 20) =>
    axios.get<{ data: ClotureCaisse[]; total: number }>('/caisse/historique', { params: { page, limit } }).then((r) => r.data),
};
