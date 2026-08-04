import api from './axios';

export interface Categorie {
  id: string;
  nom: string;
  description?: string;
  parentId?: string;
  _count?: { produits: number };
}

export interface Produit {
  id: string;
  reference: string;
  nom: string;
  prixAchat: number;
  prixVente: number;
  stockActuel: number;
  seuilAlerte: number;
  unite: string;
  actif: boolean;
  categorieId: string;
  categorie: Categorie;
  createdAt: string;
}

export interface CreateProduitDto {
  reference: string;
  nom: string;
  prixAchat: number;
  prixVente: number;
  stockActuel?: number;
  seuilAlerte?: number;
  unite?: string;
  categorieId: string;
}

export interface MouvementStock {
  id: string;
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'INVENTAIRE';
  quantite: number;
  motif?: string;
  date: string;
  produit: { nom: string; reference: string };
}

export interface CreateMouvementDto {
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'INVENTAIRE';
  quantite: number;
  motif?: string;
  produitId: string;
}

export const produitsApi = {
  findAll: () => api.get<Produit[]>('/produits'),
  findOne: (id: string) => api.get<Produit>('/produits/' + id),
  create: (data: CreateProduitDto) => api.post<Produit>('/produits', data),
  update: (id: string, data: Partial<CreateProduitDto>) => api.patch<Produit>('/produits/' + id, data),
  remove: (id: string) => api.delete('/produits/' + id),
  alertes: () => api.get<Produit[]>('/produits/alertes'),

  getCategories: () => api.get<Categorie[]>('/produits/categories'),
  createCategorie: (data: { nom: string; description?: string; parentId?: string }) =>
    api.post<Categorie>('/produits/categories', data),
  deleteCategorie: (id: string) => api.delete('/produits/categories/' + id),

  getMouvements: (produitId?: string) =>
    api.get<MouvementStock[]>('/produits/mouvements/historique', { params: { produitId } }),
  createMouvement: (data: CreateMouvementDto) => api.post('/produits/mouvements', data),
};
