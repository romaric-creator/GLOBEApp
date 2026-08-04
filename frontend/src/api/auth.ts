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
  };
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (data: LoginDto) => api.post<LoginResponse>('/auth/login', data),
  profile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};
