import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import axiosInstance from '../api/axios';
import { caisseApi } from '../api/caisse';

const mockAxios = axiosInstance as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('caisseApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCaisses retourne la liste', async () => {
    const caisses = [{ id: 'c1', type: 'HOTEL' }];
    mockAxios.get.mockResolvedValue({ data: caisses });
    const result = await caisseApi.getCaisses();
    expect(result).toEqual(caisses);
  });

  it('getSessionActive appelle le bon endpoint', async () => {
    mockAxios.get.mockResolvedValue({ data: null });
    await caisseApi.getSessionActive('c1');
    expect(mockAxios.get).toHaveBeenCalledWith('/caisse/c1/session-active');
  });

  it('ouvrirSession envoie le fond initial', async () => {
    mockAxios.post.mockResolvedValue({ data: { id: 's1' } });
    await caisseApi.ouvrirSession('c1', 50000);
    expect(mockAxios.post).toHaveBeenCalledWith('/caisse/c1/ouvrir', { fondInitial: 50000 });
  });

  it('fermerSession envoie totalReel et notes', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });
    await caisseApi.fermerSession('s1', 75000, 'RAS');
    expect(mockAxios.post).toHaveBeenCalledWith('/caisse/sessions/s1/fermer', { totalReel: 75000, notes: 'RAS' });
  });

  it('encaisserHotel envoie les donnees de paiement', async () => {
    mockAxios.post.mockResolvedValue({ data: { id: 'p1' } });
    await caisseApi.encaisserHotel({ factureId: 'f1', montant: 30000, moyen: 'ESPECES', sessionId: 's1' });
    expect(mockAxios.post).toHaveBeenCalledWith('/caisse/encaisser/hotel', {
      factureId: 'f1', montant: 30000, moyen: 'ESPECES', sessionId: 's1',
    });
  });

  it('encaisserRestaurant envoie les donnees de paiement', async () => {
    mockAxios.post.mockResolvedValue({ data: { id: 'p2' } });
    await caisseApi.encaisserRestaurant({ commandeId: 'cmd1', montant: 15000, moyen: 'CARTE', sessionId: 's1' });
    expect(mockAxios.post).toHaveBeenCalledWith('/caisse/encaisser/restaurant', {
      commandeId: 'cmd1', montant: 15000, moyen: 'CARTE', sessionId: 's1',
    });
  });
});
