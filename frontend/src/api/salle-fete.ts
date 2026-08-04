import axios from './axios';

export interface ReservationSalle {
  id: string;
  dateEvent: string;
  heureDebut: string;
  heureFin: string;
  nbInvites: number;
  motif: string;
  montant: number;
  statut: 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'TERMINEE';
  notes: string | null;
  client: { nom: string; prenom: string; telephone?: string };
}

export interface SalleFeteStats {
  reservationsAVenir: number;
  totalReservations: number;
  caMois: number;
}

export const salleFeteApi = {
  getReservations: (statut?: string) =>
    axios.get<ReservationSalle[]>('/salle-fete/reservations', {
      params: statut ? { statut } : {},
    }).then((r) => r.data),
  getReservation: (id: string) =>
    axios.get<ReservationSalle>(`/salle-fete/reservations/${id}`).then((r) => r.data),
  createReservation: (data: {
    dateEvent: string;
    heureDebut: string;
    heureFin: string;
    nbInvites: number;
    motif: string;
    montant: number;
    clientId: string;
    notes?: string;
  }) => axios.post('/salle-fete/reservations', data).then((r) => r.data),
  confirmer: (id: string) =>
    axios.patch(`/salle-fete/reservations/${id}/confirmer`).then((r) => r.data),
  annuler: (id: string) =>
    axios.patch(`/salle-fete/reservations/${id}/annuler`).then((r) => r.data),
  terminer: (id: string) =>
    axios.patch(`/salle-fete/reservations/${id}/terminer`).then((r) => r.data),
  getStats: () => axios.get<SalleFeteStats>('/salle-fete/stats').then((r) => r.data),
};
