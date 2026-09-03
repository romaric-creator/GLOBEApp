import api from './axios';

export interface Session { statut: string; }
export interface Caisse { id: string; type: string; nom: string; sessions: Session[]; }

export const caisseApi = {
  getCaisses: () => api.get<Caisse[]>('/caisse').then((r) => r.data),
};
