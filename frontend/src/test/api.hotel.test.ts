import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from '../api/axios';
import { hotelApi } from '../api/hotel';

const mockAxios = axiosInstance as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('hotelApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getChambres appelle /hotel/chambres', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    await hotelApi.getChambres();
    expect(mockAxios.get).toHaveBeenCalledWith('/hotel/chambres');
  });

  it('getReservations sans statut n\'envoie pas de param', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    await hotelApi.getReservations();
    expect(mockAxios.get).toHaveBeenCalledWith('/hotel/reservations', { params: {} });
  });

  it('getReservations avec statut envoie le param', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    await hotelApi.getReservations('EN_COURS');
    expect(mockAxios.get).toHaveBeenCalledWith('/hotel/reservations', { params: { statut: 'EN_COURS' } });
  });

  it('checkIn appelle PATCH /checkin', async () => {
    mockAxios.patch.mockResolvedValue({ data: {} });
    await hotelApi.checkIn('r1');
    expect(mockAxios.patch).toHaveBeenCalledWith('/hotel/reservations/r1/checkin');
  });

  it('checkOut appelle PATCH /checkout', async () => {
    mockAxios.patch.mockResolvedValue({ data: {} });
    await hotelApi.checkOut('r1');
    expect(mockAxios.patch).toHaveBeenCalledWith('/hotel/reservations/r1/checkout');
  });

  it('createReservation envoie les donnees', async () => {
    const data = {
      chambreId: 'ch1',
      clientId: 'cl1',
      dateArrivee: '2026-09-01',
      dateDepart: '2026-09-05',
      nbPersonnes: 2,
    };
    mockAxios.post.mockResolvedValue({ data: { id: 'r1' } });
    const result = await hotelApi.createReservation(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/hotel/reservations', data);
    expect(result).toEqual({ id: 'r1' });
  });
});
