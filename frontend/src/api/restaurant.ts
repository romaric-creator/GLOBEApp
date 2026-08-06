import axios from './axios';

export interface ArticleMenu {
  id: string;
  nom: string;
  description: string | null;
  categorie: 'BOISSON' | 'PLAT' | 'DESSERT' | 'AUTRE';
  prix: number;
  actif: boolean;
}

export interface LigneCommande {
  id: string;
  quantite: number;
  prixUnitaire: number;
  notes: string | null;
  article: { nom: string; categorie: string };
}

export interface Commande {
  id: string;
  numero: string;
  statut: string;
  total: number;
  notes: string | null;
  createdAt: string;
  serveur: { prenom: string; nom: string };
  lignes: LigneCommande[];
}

export interface RestaurantStats {
  commandesAujourdHui: number;
  commandesEnCours: number;
  caJour: number;
}

export const restaurantApi = {
  // Articles Menu
  getArticles: (categorie?: string) =>
    axios.get<ArticleMenu[]>('/restaurant/articles', {
      params: { actif: 'true', ...(categorie ? { categorie } : {}) },
    }).then((r) => r.data),
  createArticle: (data: { nom: string; description?: string; categorie?: string; prix: number }) =>
    axios.post<ArticleMenu>('/restaurant/articles', data).then((r) => r.data),
  updateArticle: (id: string, data: Partial<{ nom: string; description: string; categorie: string; prix: number }>) =>
    axios.patch<ArticleMenu>(`/restaurant/articles/${id}`, data).then((r) => r.data),
  deleteArticle: (id: string) =>
    axios.delete(`/restaurant/articles/${id}`).then((r) => r.data),

  // Commandes
  getCommandes: (statut?: string) =>
    axios.get<Commande[]>('/restaurant/commandes', {
      params: statut ? { statut } : {},
    }).then((r) => r.data),
  createCommande: (data: {
    serveurId: string;
    notes?: string;
    lignes: { articleId: string; quantite: number; notes?: string }[];
  }) => axios.post('/restaurant/commandes', data).then((r) => r.data),
  changerStatut: (id: string, statut: string) =>
    axios.patch(`/restaurant/commandes/${id}/statut/${statut}`).then((r) => r.data),

  // Stats
  getStats: () =>
    axios.get<RestaurantStats>('/restaurant/stats').then((r) => r.data),
};
