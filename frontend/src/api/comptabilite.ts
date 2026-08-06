import axios from './axios';

export interface Compte {
  id: string;
  nom: string;
  type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
  solde: number;
}

export interface Ecriture {
  id: string;
  date: string;
  montant: number;
  libelle: string;
  compteDebit: { id: string; nom: string };
  compteCredit: { id: string; nom: string };
  categorieCompta: { id: string; nom: string; type: string };
}

export interface CategorieCompta {
  id: string;
  nom: string;
  type: 'RECETTE' | 'DEPENSE' | 'TRANSFERT';
}

export interface ComptaStats {
  totalRecettes: number;
  totalDepenses: number;
  soldeGeneral: number;
  nbEcritures: number;
}

export const comptabiliteApi = {
  getComptes: () =>
    axios.get<Compte[]>('/comptabilite/comptes').then((r) => r.data),
  createCompte: (data: { nom: string; type: string }) =>
    axios.post('/comptabilite/comptes', data).then((r) => r.data),
  getEcritures: (dateDebut?: string, dateFin?: string) =>
    axios.get<Ecriture[]>('/comptabilite/ecritures', {
      params: {
        ...(dateDebut ? { dateDebut } : {}),
        ...(dateFin ? { dateFin } : {}),
      },
    }).then((r) => r.data),
  createEcriture: (data: {
    montant: number;
    libelle: string;
    compteDebitId: string;
    compteCreditId: string;
    categorieComptaId: string;
  }) => axios.post('/comptabilite/ecritures', data).then((r) => r.data),
  getCategories: () =>
    axios.get<CategorieCompta[]>('/comptabilite/categories').then((r) => r.data),
  createCategorie: (data: { nom: string; type: string }) =>
    axios.post('/comptabilite/categories', data).then((r) => r.data),
  getStats: () =>
    axios.get<ComptaStats>('/comptabilite/stats').then((r) => r.data),
  cloturerPeriode: (periode: string) =>
    axios.post('/comptabilite/cloture', { periode }).then((r) => r.data),
};
