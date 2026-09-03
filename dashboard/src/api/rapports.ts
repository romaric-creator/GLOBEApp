import api from './axios';

export interface ChiffreAffaires {
  total: number;
  hotel: number;
  restaurant: number;
  piscine: number;
  salle_fete: number;
}

export interface CA7JoursItem {
  date: string;
  total: number;
  hotel: number;
  restaurant: number;
}

export const rapportsApi = {
  getChiffreAffaires: (debut: string, fin: string) =>
    api.get<ChiffreAffaires>('/rapports/chiffre-affaires', { params: { dateDebut: debut, dateFin: fin } }).then((r) => r.data),
  getCA7Jours: () =>
    api.get<CA7JoursItem[]>('/rapports/ca-7-jours').then((r) => r.data),
  getCAParJour: (debut: string, fin: string) =>
    api.get<CA7JoursItem[]>('/rapports/ca-par-jour', { params: { dateDebut: debut, dateFin: fin } }).then((r) => r.data),
  getCAParMois: (annee: number) =>
    api.get<CA7JoursItem[]>('/rapports/ca-par-mois', { params: { annee } }).then((r) => r.data),
};
