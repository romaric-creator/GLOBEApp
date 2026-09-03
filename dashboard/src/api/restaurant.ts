import api from './axios';

export interface RestaurantStats {
  commandesEnPreparation: number;
  commandesAujourdHui: number;
  caJour: number;
}

export const restaurantApi = {
  getStats: () => api.get<RestaurantStats>('/restaurant/stats').then((r) => r.data),
};
