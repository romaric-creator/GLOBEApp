import api from './axios';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

export const authApi = {
  login: (email: string, motDePasse: string) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', { email, password: motDePasse }).then((r) => r.data),
};
