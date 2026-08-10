import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HotelService } from './hotel.service';

describe('HotelService', () => {
  let service: HotelService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      chambre: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      reservation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      factureSejour: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };
    service = new HotelService(prisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllChambres', () => {
    it('retourne la liste des chambres triees par numero', async () => {
      const chambres = [
        { id: 'ch1', numero: '101', statut: 'DISPONIBLE' },
        { id: 'ch2', numero: '102', statut: 'OCCUPEE' },
      ];
      prisma.chambre.findMany.mockResolvedValue(chambres);

      const result = await service.findAllChambres();

      expect(result).toBe(chambres);
    });
  });

  describe('createReservation', () => {
    const dto = {
      chambreId: 'ch1',
      clientId: 'cl1',
      dateArrivee: '2026-09-01',
      dateDepart: '2026-09-05',
      nbPersonnes: 2,
    };

    it('retourne la reservation creee', async () => {
      prisma.chambre.findUnique.mockResolvedValue({
        id: 'ch1',
        numero: '101',
        capacite: 3,
        prixNuit: 100,
      });
      prisma.reservation.findFirst.mockResolvedValue(null);
      const reservationCreee = {
        id: 'r1',
        statut: 'EN_ATTENTE',
        montantTotal: 400,
      };
      prisma.reservation.create.mockResolvedValue(reservationCreee);
      prisma.chambre.update.mockResolvedValue({});

      const result = await service.createReservation(dto);

      expect(result).toBe(reservationCreee);
      expect(prisma.chambre.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'RESERVEE' } }),
      );
    });

    it('echoue si la chambre est introuvable', async () => {
      prisma.chambre.findUnique.mockResolvedValue(null);

      await expect(service.createReservation(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('echoue si le nombre de personnes depasse la capacite', async () => {
      prisma.chambre.findUnique.mockResolvedValue({
        id: 'ch1',
        capacite: 1,
        prixNuit: 100,
      });

      await expect(
        service.createReservation({ ...dto, nbPersonnes: 5 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("echoue si la date de depart est avant la date d'arrivee", async () => {
      prisma.chambre.findUnique.mockResolvedValue({
        id: 'ch1',
        capacite: 3,
        prixNuit: 100,
      });

      await expect(
        service.createReservation({
          ...dto,
          dateArrivee: '2026-09-05',
          dateDepart: '2026-09-01',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkIn', () => {
    it('met la reservation en statut EN_COURS et la chambre OCCUPEE', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'CONFIRMEE',
        chambreId: 'ch1',
        dateArrivee: new Date('2026-09-01'),
        dateDepart: new Date('2026-09-05'),
        chambre: {},
        client: {},
      });
      prisma.chambre.update.mockResolvedValue({});
      prisma.reservation.update.mockResolvedValue({
        id: 'r1',
        statut: 'EN_COURS',
        chambre: { numero: '101', type: 'SIMPLE', prixNuit: 100 },
        client: { nom: 'Test', prenom: 'Client' },
      });

      const result = await service.checkIn('r1');

      expect(prisma.chambre.update).toHaveBeenCalledWith({
        where: { id: 'ch1' },
        data: { statut: 'OCCUPEE' },
      });
      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'EN_COURS' } }),
      );
      expect(result.statut).toBe('EN_COURS');
    });

    it("echoue si la reservation n'est pas CONFIRMEE ou EN_ATTENTE", async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'TERMINEE',
        chambreId: 'ch1',
        chambre: {},
        client: {},
      });

      await expect(service.checkIn('r1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('met la reservation en TERMINEE et la chambre DISPONIBLE', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'EN_COURS',
        chambreId: 'ch1',
        chambre: {},
        client: {},
      });
      prisma.chambre.update.mockResolvedValue({});
      prisma.reservation.update.mockResolvedValue({
        id: 'r1',
        statut: 'TERMINEE',
      });

      const result = await service.checkOut('r1');

      expect(prisma.chambre.update).toHaveBeenCalledWith({
        where: { id: 'ch1' },
        data: { statut: 'DISPONIBLE' },
      });
      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { statut: 'TERMINEE' } }),
      );
      expect(result.statut).toBe('TERMINEE');
    });

    it("echoue si la reservation n'est pas EN_COURS", async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'EN_ATTENTE',
        chambreId: 'ch1',
        chambre: {},
        client: {},
      });

      await expect(service.checkOut('r1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('annulerReservation', () => {
    it('met la chambre DISPONIBLE si aucune autre reservation active', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'CONFIRMEE',
        chambreId: 'ch1',
        chambre: {},
        client: {},
      });
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.chambre.update.mockResolvedValue({});
      prisma.reservation.update.mockResolvedValue({
        id: 'r1',
        statut: 'ANNULEE',
      });

      await service.annulerReservation('r1');

      expect(prisma.chambre.update).toHaveBeenCalledWith({
        where: { id: 'ch1' },
        data: { statut: 'DISPONIBLE' },
      });
    });

    it("ne modifie pas la chambre si d'autres reservations actives existent", async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'CONFIRMEE',
        chambreId: 'ch1',
        chambre: {},
        client: {},
      });
      prisma.reservation.findFirst.mockResolvedValue({
        id: 'r2',
        statut: 'EN_ATTENTE',
      });
      prisma.reservation.update.mockResolvedValue({
        id: 'r1',
        statut: 'ANNULEE',
      });

      await service.annulerReservation('r1');

      expect(prisma.chambre.update).not.toHaveBeenCalled();
    });

    it('echoue si la reservation est deja terminee ou annulee', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        statut: 'ANNULEE',
        chambreId: 'ch1',
        chambre: {},
        client: {},
      });

      await expect(service.annulerReservation('r1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
