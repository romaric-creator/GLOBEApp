import api from './axios';

export interface Produit {
  nom: string;
  actif: boolean;
  stockActuel: number;
  seuilAlerte: number;
  unite: string;
}

export const produitsApi = {
  findAll: () => api.get<Produit[]>('/produits').then((r) => r.data),
};
