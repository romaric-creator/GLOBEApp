import api from './axios';

export interface Client {
  id: string;
  type: 'PARTICULIER' | 'PROFESSIONNEL';
  nom: string;
  prenom?: string;
  raisonSociale?: string;
  email?: string;
  telephone?: string;
  soldeCreance: number;
  pointsFidelite: number;
  actif: boolean;
  createdAt: string;
}

export interface CreateClientDto {
  nom: string;
  prenom?: string;
  raisonSociale?: string;
  email?: string;
  telephone?: string;
  type?: 'PARTICULIER' | 'PROFESSIONNEL';
}

export const clientsApi = {
  findAll: () => api.get<Client[]>('/clients'),
  findOne: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: CreateClientDto) => api.post<Client>('/clients', data),
  update: (id: string, data: Partial<CreateClientDto>) => api.patch<Client>(`/clients/${id}`, data),
  remove: (id: string) => api.delete(`/clients/${id}`),
};
