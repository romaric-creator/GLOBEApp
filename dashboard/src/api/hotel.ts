import api from './axios';

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
  getStats: () => api.get<HotelStats>('/hotel/stats').then((r) => r.data),
};
