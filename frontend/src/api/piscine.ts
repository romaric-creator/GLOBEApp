import axios from './axios';

export interface TicketPiscine {
  id: string;
  type: 'JOURNALIER' | 'ABONNEMENT_MENSUEL' | 'ABONNEMENT_ANNUEL';
  prix: number;
  dateDebut: string;
  dateFin: string | null;
  utilise: boolean;
  createdAt: string;
  client: { nom: string; prenom: string } | null;
}

export interface AbonnementLoisir {
  id: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  prix: number;
  actif: boolean;
  client: { nom: string; prenom: string; telephone?: string };
}

export interface PiscineStats {
  ticketsAujourdHui: number;
  abonnementsActifs: number;
  caJour: number;
  totalTickets: number;
}

export interface AccessoirePiscine {
  id: string;
  nom: string;
  description: string | null;
  type: 'VENTE' | 'LOCATION' | 'VENTE_ET_LOCATION';
  prixVente: number | null;
  prixLocation: number | null;
  stock: number;
  actif: boolean;
  createdAt: string;
}

export interface TransactionAccessoire {
  id: string;
  type: 'VENTE' | 'LOCATION' | 'RETOUR';
  quantite: number;
  prixUnit: number;
  total: number;
  notes: string | null;
  createdAt: string;
  accessoire: { nom: string };
  client: { nom: string; prenom: string } | null;
}

export interface CreateAccessoireDto {
  nom: string;
  description?: string;
  type?: 'VENTE' | 'LOCATION' | 'VENTE_ET_LOCATION';
  prixVente?: number;
  prixLocation?: number;
  stock?: number;
}

export interface CreateTransactionDto {
  accessoireId: string;
  type: 'VENTE' | 'LOCATION' | 'RETOUR';
  quantite: number;
  prixUnit: number;
  clientId?: string;
  notes?: string;
}

export const piscineApi = {
  getTickets: (type?: string, utilise?: string) =>
    axios.get<TicketPiscine[]>('/piscine/tickets', {
      params: { ...(type ? { type } : {}), ...(utilise ? { utilise } : {}) },
    }).then((r) => r.data),
  createTicket: (data: { type: string; prix: number; dateDebut: string; dateFin?: string; clientId?: string }) =>
    axios.post('/piscine/tickets', data).then((r) => r.data),
  utiliserTicket: (id: string) =>
    axios.patch(`/piscine/tickets/${id}/utiliser`).then((r) => r.data),

  getAbonnements: (actif?: string) =>
    axios.get<AbonnementLoisir[]>('/piscine/abonnements', {
      params: actif ? { actif } : {},
    }).then((r) => r.data),
  createAbonnement: (data: { type: string; dateDebut: string; dateFin: string; prix: number; clientId: string }) =>
    axios.post('/piscine/abonnements', data).then((r) => r.data),
  resilierAbonnement: (id: string) =>
    axios.patch(`/piscine/abonnements/${id}/resilier`).then((r) => r.data),

  getStats: () => axios.get<PiscineStats>('/piscine/stats').then((r) => r.data),

  // Accessoires
  getAccessoires: (actif?: string) =>
    axios.get<AccessoirePiscine[]>('/piscine/accessoires', { params: actif ? { actif } : {} }).then((r) => r.data),
  createAccessoire: (data: CreateAccessoireDto) =>
    axios.post<AccessoirePiscine>('/piscine/accessoires', data).then((r) => r.data),
  updateAccessoire: (id: string, data: Partial<CreateAccessoireDto>) =>
    axios.patch<AccessoirePiscine>(`/piscine/accessoires/${id}`, data).then((r) => r.data),
  deleteAccessoire: (id: string) =>
    axios.delete(`/piscine/accessoires/${id}`).then((r) => r.data),
  getTransactions: (accessoireId?: string) =>
    axios.get<TransactionAccessoire[]>('/piscine/accessoires/transactions', { params: accessoireId ? { accessoireId } : {} }).then((r) => r.data),
  createTransaction: (data: CreateTransactionDto) =>
    axios.post<TransactionAccessoire>('/piscine/accessoires/transactions', data).then((r) => r.data),
};
