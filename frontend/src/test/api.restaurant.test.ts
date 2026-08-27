import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing restaurantApi
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from '../api/axios';
import { restaurantApi } from '../api/restaurant';

const mockAxios = axiosInstance as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

describe('restaurantApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCommandes appelle /restaurant/commandes sans filtre', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    await restaurantApi.getCommandes();
    expect(mockAxios.get).toHaveBeenCalledWith('/restaurant/commandes', { params: {} });
  });

  it('getCommandes passe le statut en param', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    await restaurantApi.getCommandes('TERMINEE');
    expect(mockAxios.get).toHaveBeenCalledWith('/restaurant/commandes', { params: { statut: 'TERMINEE' } });
  });

  it('createCommande envoie les donnees au bon endpoint', async () => {
    const payload = { serveurId: 'u1', lignes: [{ produitId: 'p1', quantite: 2 }] };
    mockAxios.post.mockResolvedValue({ data: { id: 'c1', numero: 'CMD-001' } });
    const result = await restaurantApi.createCommande(payload);
    expect(mockAxios.post).toHaveBeenCalledWith('/restaurant/commandes', payload);
    expect(result).toEqual({ id: 'c1', numero: 'CMD-001' });
  });

  it('terminer appelle PATCH statut/TERMINEE', async () => {
    mockAxios.patch.mockResolvedValue({ data: {} });
    await restaurantApi.terminer('c1');
    expect(mockAxios.patch).toHaveBeenCalledWith('/restaurant/commandes/c1/statut/TERMINEE');
  });

  it('annuler appelle PATCH statut/ANNULEE', async () => {
    mockAxios.patch.mockResolvedValue({ data: {} });
    await restaurantApi.annuler('c1');
    expect(mockAxios.patch).toHaveBeenCalledWith('/restaurant/commandes/c1/statut/ANNULEE');
  });

  it('getStats retourne les statistiques', async () => {
    const stats = { commandesEnCours: 3, caJour: 45000 };
    mockAxios.get.mockResolvedValue({ data: stats });
    const result = await restaurantApi.getStats();
    expect(result).toEqual(stats);
  });
});
