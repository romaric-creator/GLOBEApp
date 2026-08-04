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
};
