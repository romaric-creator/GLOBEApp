import api from './axios';

export interface Permission {
  id: string;
  module: string;
  action: string;
}

export interface Role {
  id: string;
  nom: string;
  description?: string | null;
  permissions: Array<{ permission: Permission }>;
  _count: { users: number };
}

export const rolesApi = {
  findAll: () => api.get<Role[]>('/roles'),
  getPermissions: () => api.get<Permission[]>('/roles/permissions'),
  assignPermissions: (roleId: string, permissionIds: string[]) =>
    api.patch<Role>(`/roles/${roleId}/permissions`, { permissionIds }),
};
