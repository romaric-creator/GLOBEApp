import axios from './axios';

export interface Employe {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  poste: string;
  salaire: number;
  typeContrat: string;
  actif: boolean;
  createdAt: string;
  user?: { email: string };
}

export interface Pointage {
  id: string;
  date: string;
  heureArrivee: string | null;
  heureDepart: string | null;
  methode: string;
  employe: { nom: string; prenom: string; matricule: string };
}

export interface Presence {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  present: boolean;
  heureArrivee: string | null;
  heureDepart: string | null;
}

export interface Conge {
  id: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  motif: string | null;
  createdAt: string;
  employe: { nom: string; prenom: string; matricule: string };
}

export interface CreateEmployeDto {
  matricule: string;
  nom: string;
  prenom: string;
  poste: string;
  salaire: number;
  typeContrat: string;
  userId?: string;
}

export interface CreatePointageDto {
  employeId: string;
  date: string;
  heureArrivee?: string;
  heureDepart?: string;
  methode?: string;
}

export interface CreateCongeDto {
  employeId: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

export const personnelApi = {
  // Employes
  getEmployes: () =>
    axios.get<Employe[]>('/personnel/employes').then((r) => r.data),

  getEmploye: (id: string) =>
    axios.get<Employe>(`/personnel/employes/${id}`).then((r) => r.data),

  createEmploye: (dto: CreateEmployeDto) =>
    axios.post<Employe>('/personnel/employes', dto).then((r) => r.data),

  updateEmploye: (id: string, dto: Partial<CreateEmployeDto>) =>
    axios.patch<Employe>(`/personnel/employes/${id}`, dto).then((r) => r.data),

  toggleEmploye: (id: string) =>
    axios.patch<Employe>(`/personnel/employes/${id}/toggle`).then((r) => r.data),

  // Pointages
  getPointages: (date?: string, employeId?: string) =>
    axios.get<Pointage[]>('/personnel/pointages', {
      params: { ...(date ? { date } : {}), ...(employeId ? { employeId } : {}) },
    }).then((r) => r.data),

  getPresences: () =>
    axios.get<Presence[]>('/personnel/pointages/presences').then((r) => r.data),

  createPointage: (dto: CreatePointageDto) =>
    axios.post<Pointage>('/personnel/pointages', dto).then((r) => r.data),

  updatePointage: (id: string, dto: { heureArrivee?: string; heureDepart?: string }) =>
    axios.patch<Pointage>(`/personnel/pointages/${id}`, dto).then((r) => r.data),

  // Conges
  getConges: (employeId?: string, statut?: string) =>
    axios.get<Conge[]>('/personnel/conges', {
      params: { ...(employeId ? { employeId } : {}), ...(statut ? { statut } : {}) },
    }).then((r) => r.data),

  createConge: (dto: CreateCongeDto) =>
    axios.post<Conge>('/personnel/conges', dto).then((r) => r.data),

  approuverConge: (id: string) =>
    axios.patch(`/personnel/conges/${id}/approuver`).then((r) => r.data),

  refuserConge: (id: string) =>
    axios.patch(`/personnel/conges/${id}/refuser`).then((r) => r.data),
};
