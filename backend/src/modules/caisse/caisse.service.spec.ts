import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CaisseService } from './caisse.service';

describe('CaisseService', () => {
  let service: CaisseService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      caisse: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      sessionCaisse: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      paiement: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      factureSejour: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      commandeTable: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };
    service = new CaisseService(prisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getCaisses', () => {
    it('retourne la liste des caisses actives', async () => {
      const caisses = [{ id: 'c1', nom: 'Caisse principale', actif: true }];
      prisma.caisse.findMany.mockResolvedValue(caisses);

      const result = await service.getCaisses();

      expect(result).toBe(caisses);
    });
  });

  describe('ouvrirSession', () => {
    it('echoue si une session est deja ouverte pour cette caisse', async () => {
      prisma.caisse.findUnique.mockResolvedValue({ id: 'c1', nom: 'Caisse' });
      prisma.sessionCaisse.findFirst.mockResolvedValue({
        id: 's1',
        statut: 'OUVERTE',
      });

      await expect(service.ouvrirSession('c1', 'u1', 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('echoue si la caisse est introuvable', async () => {
      prisma.caisse.findUnique.mockResolvedValue(null);

      await expect(
        service.ouvrirSession('inexistant', 'u1', 100),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('fermerSession', () => {
    it("calcule l'ecart en excluant les paiements non encaisses", async () => {
      prisma.sessionCaisse.findUnique.mockResolvedValue({
        id: 's1',
        statut: 'OUVERTE',
        fondInitial: 100,
        paiements: [
          { statut: 'ENCAISSE', montant: 50 },
          { statut: 'ENCAISSE', montant: 30 },
          { statut: 'ANNULE', montant: 20 },
        ],
      });
      prisma.sessionCaisse.update.mockResolvedValue({});

      // totalTheorique = 100 + 50 + 30 = 180, ecart = 200 - 180 = 20
      await service.fermerSession('s1', 200);

      expect(prisma.sessionCaisse.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: expect.objectContaining({
            totalTheorique: 180,
            totalReel: 200,
            ecart: 20,
            statut: 'FERMEE',
          }),
        }),
      );
    });

    it('echoue si la session est deja fermee', async () => {
      prisma.sessionCaisse.findUnique.mockResolvedValue({
        id: 's1',
        statut: 'FERMEE',
        paiements: [],
      });

      await expect(service.fermerSession('s1', 100)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('encaisserFactureHotel', () => {
    it('echoue si la facture est deja payee', async () => {
      prisma.factureSejour.findUnique.mockResolvedValue({
        id: 'f1',
        payee: true,
        total: 300,
        montantPaye: 300,
      });

      await expect(
        service.encaisserFactureHotel('f1', 's1', 'u1', 100, 'ESPECES'),
      ).rejects.toThrow(BadRequestException);
    });

    it('echoue si la facture est introuvable', async () => {
      prisma.sessionCaisse.findUnique.mockResolvedValue({
        id: 's1',
        statut: 'OUVERTE',
      });
      prisma.factureSejour.findUnique.mockResolvedValue(null);

      await expect(
        service.encaisserFactureHotel('inexistant', 's1', 'u1', 100, 'ESPECES'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('encaisserCommandeRestaurant', () => {
    it("echoue si la commande n'est pas TERMINEE", async () => {
      prisma.commandeTable.findUnique.mockResolvedValue({
        id: 'cmd1',
        statut: 'EN_PREPARATION',
      });

      await expect(
        service.encaisserCommandeRestaurant('cmd1', 's1', 'u1', 80, 'ESPECES'),
      ).rejects.toThrow(BadRequestException);
    });

    it('echoue si la commande a deja un paiement', async () => {
      prisma.commandeTable.findUnique.mockResolvedValue({
        id: 'cmd1',
        statut: 'TERMINEE',
      });
      prisma.paiement.findFirst.mockResolvedValue({ id: 'p-existing' });

      await expect(
        service.encaisserCommandeRestaurant('cmd1', 's1', 'u1', 80, 'ESPECES'),
      ).rejects.toThrow(BadRequestException);
    });

    it('echoue si la commande est introuvable', async () => {
      prisma.sessionCaisse.findUnique.mockResolvedValue({
        id: 's1',
        statut: 'OUVERTE',
      });
      prisma.commandeTable.findUnique.mockResolvedValue(null);

      await expect(
        service.encaisserCommandeRestaurant(
          'inexistant',
          's1',
          'u1',
          80,
          'ESPECES',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
