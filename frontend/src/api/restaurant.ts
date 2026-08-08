import axios from './axios';

export interface LigneCommande {
  id: string;
  quantite: number;
  prixUnitaire: number;
  notes: string | null;
  produit: { nom: string; unite: string; categorie: { nom: string } };
}

export interface Commande {
  id: string;
  numero: string;
  statut: 'EN_PREPARATION' | 'TERMINEE' | 'ANNULEE';
  total: number;
  tableReference: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  serveur: { prenom: string; nom: string };
  lignes: LigneCommande[];
  paiement: { id: string; montant: number; moyen: string } | null;
}

export interface RestaurantStats {
  commandesAujourdHui: number;
  commandesEnPreparation: number;
  caJour: number;
}

export const restaurantApi = {
  getCommandes: (statut?: string) =>
    axios.get<Commande[]>('/restaurant/commandes', { params: statut ? { statut } : {} }).then((r) => r.data),

  getCommande: (id: string) =>
    axios.get<Commande>(`/restaurant/commandes/${id}`).then((r) => r.data),

  createCommande: (data: {
    serveurId: string;
    tableReference?: string;
    notes?: string;
    lignes: { produitId: string; quantite: number; notes?: string }[];
  }) => axios.post('/restaurant/commandes', data).then((r) => r.data),

  ajouterLignes: (id: string, lignes: { produitId: string; quantite: number; notes?: string }[]) =>
    axios.post(`/restaurant/commandes/${id}/lignes`, { lignes }).then((r) => r.data),

  terminer: (id: string) =>
    axios.patch(`/restaurant/commandes/${id}/statut/TERMINEE`).then((r) => r.data),

  annuler: (id: string) =>
    axios.patch(`/restaurant/commandes/${id}/statut/ANNULEE`).then((r) => r.data),

  getStats: () =>
    axios.get<RestaurantStats>('/restaurant/stats').then((r) => r.data),
};
