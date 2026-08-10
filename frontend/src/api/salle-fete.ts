import axios from './axios';

export interface TypeReservationSalle {
  id: string;
  nom: string;
  description: string | null;
  inclusions: string | null;
  prixBase: number;
  actif: boolean;
  createdAt: string;
}

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
  type: { nom: string } | null;
  typeId: string | null;
}

export interface SalleFeteStats {
  reservationsAVenir: number;
  totalReservations: number;
  caMois: number;
}

export const salleFeteApi = {
  // Types
  getTypes: () =>
    axios.get<TypeReservationSalle[]>('/salle-fete/types').then((r) => r.data),
  createType: (data: { nom: string; description?: string; inclusions?: string; prixBase?: number }) =>
    axios.post<TypeReservationSalle>('/salle-fete/types', data).then((r) => r.data),
  updateType: (id: string, data: { nom?: string; description?: string; inclusions?: string; prixBase?: number }) =>
    axios.patch<TypeReservationSalle>(`/salle-fete/types/${id}`, data).then((r) => r.data),
  deleteType: (id: string) =>
    axios.delete(`/salle-fete/types/${id}`).then((r) => r.data),

  // Reservations
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
    typeId?: string;
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
