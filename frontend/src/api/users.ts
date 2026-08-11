import api from './axios';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  actif: boolean;
  dernierLogin?: string | null;
  createdAt: string;
  role: { id: string; nom: string };
}

export interface CreateUserDto {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  roleId: string;
}

export interface UpdateUserDto {
  nom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  roleId?: string;
  actif?: boolean;
}

export const usersApi = {
  findAll: () => api.get<User[]>('/users'),
  create: (data: CreateUserDto) => api.post<User>('/users', data),
  update: (id: string, data: UpdateUserDto) => api.patch<User>(`/users/${id}`, data),
  deactivate: (id: string) => api.patch<User>(`/users/${id}/deactivate`),
  unlock: (id: string) => api.patch<User>(`/users/${id}/unlock`),
};
