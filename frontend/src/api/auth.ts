import api from './axios';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    role: string;
    permissions: Array<{ module: string; action: string }>;
  };
  accessToken: string;
  refreshToken: string;
}

export interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  role: string;
  permissions: Array<{ module: string; action: string }>;
}

export const authApi = {
  login: (data: LoginDto) => api.post<LoginResponse>('/auth/login', data),
  profile: () => api.get<Profile>('/auth/profile'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data: { ancienMotDePasse: string; nouveauMotDePasse: string }) =>
    api.post<{ message: string }>('/auth/change-password', data),
};
