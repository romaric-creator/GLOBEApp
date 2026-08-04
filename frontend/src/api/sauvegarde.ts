import axios from './axios';

export interface Sauvegarde {
  id: string;
  date: string;
  taille: number | null;
  chemin: string;
  type: 'COMPLETE' | 'INCREMENTALE';
  statut: 'EN_COURS' | 'REUSSIE' | 'ECHOUEE';
}

export interface SauvegardeStats {
  totalSauvegardes: number;
  derniereSauvegarde: string | null;
  tailleTotale: number;
}

export const sauvegardeApi = {
  findAll: () =>
    axios.get<Sauvegarde[]>('/sauvegarde').then((r) => r.data),
  create: (type: 'COMPLETE' | 'INCREMENTALE') =>
    axios.post<Sauvegarde>('/sauvegarde', { type }).then((r) => r.data),
  getLatest: () =>
    axios.get<Sauvegarde>('/sauvegarde/latest').then((r) => r.data),
  getStats: () =>
    axios.get<SauvegardeStats>('/sauvegarde/stats').then((r) => r.data),
};
