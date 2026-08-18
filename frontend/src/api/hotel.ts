import axios from './axios';

export interface Chambre {
  id: string;
  numero: string;
  type: 'STANDARD' | 'JUNIOR' | 'JUNIOR_PLUS' | 'SENIOR' | 'STUDIO' | 'APPARTEMENT';
  statut: 'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE' | 'RESERVEE';
  prixNuit: number;
  capacite: number;
  etage: number | null;
}

export interface Reservation {
  id: string;
  dateArrivee: string;
  dateDepart: string;
  nbPersonnes: number;
  statut: 'EN_ATTENTE' | 'CONFIRMEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  montantTotal: number;
  notes: string | null;
  chambre: { numero: string; type: string };
  client: { nom: string; prenom: string; telephone?: string };
}

export interface HotelStats {
  total: number;
  occupees: number;
  disponibles: number;
  maintenance: number;
  reservees: number;
  tauxOccupation: number;
  reservationsEnCours: number;
  reservationsAVenir: number;
}

export const hotelApi = {
  // Chambres
  getChambres: () => axios.get<Chambre[]>('/hotel/chambres').then((r) => r.data),
  getChambre: (id: string) => axios.get<Chambre>(`/hotel/chambres/${id}`).then((r) => r.data),
  createChambre: (data: Partial<Chambre>) => axios.post('/hotel/chambres', data).then((r) => r.data),
  updateChambre: (id: string, data: Partial<Chambre>) => axios.patch(`/hotel/chambres/${id}`, data).then((r) => r.data),
  deleteChambre: (id: string) => axios.delete(`/hotel/chambres/${id}`).then((r) => r.data),

  // Reservations
  getReservations: (statut?: string) =>
    axios.get<Reservation[]>('/hotel/reservations', { params: statut ? { statut } : {} }).then((r) => r.data),
  getReservation: (id: string) => axios.get<Reservation>(`/hotel/reservations/${id}`).then((r) => r.data),
  createReservation: (data: {
    chambreId: string;
    clientId: string;
    dateArrivee: string;
    dateDepart: string;
    nbPersonnes: number;
    notes?: string;
  }) => axios.post('/hotel/reservations', data).then((r) => r.data),
  confirmerReservation: (id: string) => axios.patch(`/hotel/reservations/${id}/confirmer`).then((r) => r.data),
  annulerReservation: (id: string) => axios.patch(`/hotel/reservations/${id}/annuler`).then((r) => r.data),
  checkIn: (id: string) => axios.patch(`/hotel/reservations/${id}/checkin`).then((r) => r.data),
  checkOut: (id: string) => axios.patch(`/hotel/reservations/${id}/checkout`).then((r) => r.data),

  // Factures
  getFactures: (payee?: boolean) =>
    axios.get('/hotel/factures', { params: payee !== undefined ? { payee } : {} }).then((r) => r.data),
  getFacture: (id: string) => axios.get(`/hotel/factures/${id}`).then((r) => r.data),

  // Stats
  getStats: () => axios.get<HotelStats>('/hotel/stats').then((r) => r.data),
};
