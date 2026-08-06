import axios from './axios';

export interface ChiffreAffaires {
  ventes: number;
  hotel: number;
  restaurant: number;
  piscine: number;
  salle_fete: number;
  total: number;
}

export interface OccupationHotel {
  totalChambres: number;
  chambresOccupees: number;
  tauxOccupation: number;
}

export interface TopProduit {
  produitId: string;
  nom: string;
  quantiteVendue: number;
}

export interface ResumePersonnel {
  effectifTotal: number;
  presentsAujourdhui: number;
  enConge: number;
}

export interface ResumeMensuel {
  caTotal: number;
  depenses: number;
  benefice: number;
  nbVentes: number;
  nbReservations: number;
}

export const rapportsApi = {
  getChiffreAffaires: (dateDebut: string, dateFin: string) =>
    axios.get<ChiffreAffaires>('/rapports/chiffre-affaires', {
      params: { dateDebut, dateFin },
    }).then((r) => r.data),
  getOccupation: (dateDebut: string, dateFin: string) =>
    axios.get<OccupationHotel>('/rapports/occupation', {
      params: { dateDebut, dateFin },
    }).then((r) => r.data),
  getTopProduits: (limit = 10) =>
    axios.get<TopProduit[]>('/rapports/top-produits', {
      params: { limit },
    }).then((r) => r.data),
  getResumePersonnel: () =>
    axios.get<ResumePersonnel>('/rapports/personnel').then((r) => r.data),
  getResumeMensuel: (mois: number, annee: number) =>
    axios.get<ResumeMensuel>('/rapports/resume-mensuel', {
      params: { mois, annee },
    }).then((r) => r.data),
};
