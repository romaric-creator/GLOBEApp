import axios from './axios';

export interface TableauBord {
  periode: { debut: string; fin: string };
  recettes: {
    hotel: number;
    restaurant: number;
    piscine: number;
    salle: number;
    total: number;
  };
  depenses: {
    HOTEL: number;
    RESTAURANT: number;
    PISCINE: number;
    SALLE_FETE: number;
    GENERAL: number;
    total: number;
  };
  resultat: number;
}

export interface MoisHistorique {
  label: string;
  recettes: number;
  depenses: number;
  resultat: number;
}

export interface CaisseOuverte {
  nom: string;
  type: string;
  fondInitial: number;
  totalEncaisse: number;
  total: number;
}

export interface Tresorerie {
  caisses: CaisseOuverte[];
  total: number;
}

export interface Depense {
  id: string;
  libelle: string;
  montant: number;
  centre: 'HOTEL' | 'RESTAURANT' | 'PISCINE' | 'SALLE_FETE' | 'GENERAL';
  date: string;
  notes: string | null;
  createdAt: string;
}

export const comptabiliteApi = {
  getTableauBord: (mois?: string) =>
    axios.get<TableauBord>('/comptabilite/tableau-bord', { params: mois ? { mois } : {} }).then((r) => r.data),

  getHistoriqueMensuel: () =>
    axios.get<MoisHistorique[]>('/comptabilite/historique-mensuel').then((r) => r.data),

  getTresorerie: () =>
    axios.get<Tresorerie>('/comptabilite/tresorerie').then((r) => r.data),

  getDepenses: (params?: { dateDebut?: string; dateFin?: string; centre?: string }) =>
    axios.get<Depense[]>('/comptabilite/depenses', { params }).then((r) => r.data),

  createDepense: (data: { libelle: string; montant: number; centre?: string; date?: string; notes?: string }) =>
    axios.post<Depense>('/comptabilite/depenses', data).then((r) => r.data),

  deleteDepense: (id: string) =>
    axios.delete(`/comptabilite/depenses/${id}`).then((r) => r.data),
};
