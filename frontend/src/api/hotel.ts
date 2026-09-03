import axios from './axios';

export type TypeReservation = 'NUIT' | 'SIESTE' | 'SIESTE_PROLONGEE';

export interface Chambre {
  id: string;
  numero: string;
  type: 'STANDARD' | 'JUNIOR' | 'JUNIOR_PLUS' | 'SENIOR' | 'STUDIO' | 'APPARTEMENT';
  statut: 'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE' | 'RESERVEE';
  prixNuit: number;
  prixSieste?: number | null;
  prixJournee?: number | null;
  description?: string | null;
  capacite: number;
  etage: number | null;
}

export interface Reservation {
  id: string;
  typeReservation: TypeReservation;
  dateArrivee: string;
  dateDepart: string;
  heureArrivee?: string | null;
  heureDepart?: string | null;
  nbPersonnes: number;
  statut: 'EN_ATTENTE' | 'CONFIRMEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  montantTotal: number;
  notes: string | null;
  chambre: { numero: string; type: string };
  client: { nom: string; prenom: string; telephone?: string };
}

export interface PaiementTranche {
  id: string;
  montant: number;
  moyen: string;
  reference: string;
  notes: string | null;
  createdAt: string;
}

export interface FactureSejour {
  id: string;
  numero: string;
  montantNuitee: number;
  montantExtras: number;
  total: number;
  montantPaye: number;
  reste: number;
  payee: boolean;
  createdAt: string;
  paiement: { montant: number; moyen: string; createdAt: string } | null;
  tranches: PaiementTranche[];
  reservation: {
    client: { nom: string; prenom: string; telephone?: string };
    chambre: { numero: string; type: string };
    dateArrivee: string;
    dateDepart: string;
  };
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
    typeReservation?: TypeReservation;
    dateArrivee: string;
    dateDepart?: string;
    nbPersonnes: number;
    heureArrivee?: string;
    heureDepart?: string;
    notes?: string;
  }) => axios.post('/hotel/reservations', data).then((r) => r.data),
  confirmerReservation: (id: string) => axios.patch(`/hotel/reservations/${id}/confirmer`).then((r) => r.data),
  annulerReservation: (id: string) => axios.patch(`/hotel/reservations/${id}/annuler`).then((r) => r.data),
  checkIn: (id: string) => axios.patch(`/hotel/reservations/${id}/checkin`).then((r) => r.data),
  checkOut: (id: string, force?: boolean) => (force ? axios.patch(`/hotel/reservations/${id}/checkout`, { force: true }) : axios.patch(`/hotel/reservations/${id}/checkout`)).then((r) => r.data),

  // Factures
  getFactures: (payee?: boolean) =>
    axios.get('/hotel/factures', { params: payee !== undefined ? { payee } : {} }).then((r) => r.data),
  getFacture: (id: string) => axios.get(`/hotel/factures/${id}`).then((r) => r.data),
  getReservationFacture: (reservationId: string) =>
    axios.get<FactureSejour>(`/hotel/reservations/${reservationId}/facture`).then((r) => r.data),

  // Stats
  getStats: () => axios.get<HotelStats>('/hotel/stats').then((r) => r.data),
};
