import axios from './axios';

export interface TableResto {
  id: string;
  numero: number;
  capacite: number;
  zone: string | null;
  statut: 'LIBRE' | 'OCCUPEE' | 'RESERVEE';
  commandes: { id: string; numero: string; statut: string; total: number }[];
}

export interface LigneCommande {
  id: string;
  quantite: number;
  prixUnitaire: number;
  notes: string | null;
  produit: { nom: string; reference?: string };
}

export interface Commande {
  id: string;
  numero: string;
  statut: string;
  total: number;
  notes: string | null;
  createdAt: string;
  table: { numero: number; zone: string | null };
  serveur: { prenom: string; nom: string };
  lignes: LigneCommande[];
}

export interface RestaurantStats {
  totalTables: number;
  tablesOccupees: number;
  tablesLibres: number;
  commandesAujourdHui: number;
  commandesEnCours: number;
  caJour: number;
}

export const restaurantApi = {
  // Tables
  getTables: () =>
    axios.get<TableResto[]>('/restaurant/tables').then((r) => r.data),
  getTable: (id: string) =>
    axios.get<TableResto>(`/restaurant/tables/${id}`).then((r) => r.data),
  createTable: (data: { numero: number; capacite: number; zone?: string }) =>
    axios.post('/restaurant/tables', data).then((r) => r.data),
  updateTable: (id: string, data: { capacite?: number; zone?: string }) =>
    axios.patch(`/restaurant/tables/${id}`, data).then((r) => r.data),
  deleteTable: (id: string) =>
    axios.delete(`/restaurant/tables/${id}`).then((r) => r.data),

  // Commandes
  getCommandes: (statut?: string, tableId?: string) =>
    axios
      .get<Commande[]>('/restaurant/commandes', {
        params: {
          ...(statut ? { statut } : {}),
          ...(tableId ? { tableId } : {}),
        },
      })
      .then((r) => r.data),
  getCommande: (id: string) =>
    axios.get<Commande>(`/restaurant/commandes/${id}`).then((r) => r.data),
  createCommande: (data: {
    tableId: string;
    serveurId: string;
    notes?: string;
    lignes: { produitId: string; quantite: number; notes?: string }[];
  }) => axios.post('/restaurant/commandes', data).then((r) => r.data),
  ajouterLignes: (
    id: string,
    data: { lignes: { produitId: string; quantite: number; notes?: string }[] },
  ) => axios.post(`/restaurant/commandes/${id}/lignes`, data).then((r) => r.data),
  changerStatut: (id: string, statut: string) =>
    axios.patch(`/restaurant/commandes/${id}/statut/${statut}`).then((r) => r.data),

  // Stats
  getStats: () =>
    axios.get<RestaurantStats>('/restaurant/stats').then((r) => r.data),
};
