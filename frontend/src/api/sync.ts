import api from './axios';

export interface SyncStatus {
  dernierSync: {
    id: string;
    statut: 'EN_COURS' | 'REUSSIE' | 'ECHOUEE';
    nbEnvois: number;
    erreur?: string;
    createdAt: string;
    completedAt?: string;
  } | null;
  nbEnAttente: number;
  remoteConfigure: boolean;
}

export interface SyncLog {
  id: string;
  statut: 'EN_COURS' | 'REUSSIE' | 'ECHOUEE';
  nbEnvois: number;
  erreur?: string;
  details?: string;
  createdAt: string;
  completedAt?: string;
}

export const syncApi = {
  getStatus: () => api.get<SyncStatus>('/sync/status'),
  push: () => api.post<{ success: boolean; nbEnvois: number; erreur?: string }>('/sync/push'),
  getLogs: (limit = 10) => api.get<SyncLog[]>(`/sync/logs?limit=${limit}`),
  testConnection: (creds: { host: string; port: number; user: string; password: string; database: string }) =>
    api.post<{ ok: boolean; erreur?: string }>('/sync/test-connection', creds),
};
