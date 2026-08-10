import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';

describe('RestaurantService', () => {
  let service: RestaurantService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      produit: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      commandeTable: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ligneCommande: {
        createMany: jest.fn(),
      },
      mouvementStock: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };
    service = new RestaurantService(prisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCommande', () => {
    it('decremente le stock de chaque produit commande', async () => {
      prisma.produit.findMany.mockResolvedValue([
        { id: 'p1', nom: 'Coca', prixVente: 5, stockActuel: 10, actif: true },
        { id: 'p2', nom: 'Burger', prixVente: 12, stockActuel: 8, actif: true },
      ]);
      prisma.commandeTable.findFirst.mockResolvedValue(null);
      prisma.commandeTable.create.mockResolvedValue({
        id: 'cmd1',
        numero: 'CMD-2026-0001',
        total: 22,
        lignes: [],
      });
      prisma.produit.update.mockResolvedValue({});
      prisma.mouvementStock.create.mockResolvedValue({});

      await service.createCommande({
        serveurId: 'u1',
        lignes: [
          { produitId: 'p1', quantite: 2 },
          { produitId: 'p2', quantite: 1 },
        ],
      } as any);

      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stockActuel: { decrement: 2 } },
      });
      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { stockActuel: { decrement: 1 } },
      });
    });

    it('echoue si un produit est introuvable ou inactif', async () => {
      prisma.produit.findMany.mockResolvedValue([
        { id: 'p1', nom: 'Coca', prixVente: 5, stockActuel: 10, actif: true },
      ]);

      await expect(
        service.createCommande({
          serveurId: 'u1',
          lignes: [
            { produitId: 'p1', quantite: 1 },
            { produitId: 'p-inexistant', quantite: 1 },
          ],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('echoue si le stock est insuffisant', async () => {
      prisma.produit.findMany.mockResolvedValue([
        { id: 'p1', nom: 'Coca', prixVente: 5, stockActuel: 1, actif: true },
      ]);

      await expect(
        service.createCommande({
          serveurId: 'u1',
          lignes: [{ produitId: 'p1', quantite: 5 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changerStatut', () => {
    it('passe de EN_PREPARATION a TERMINEE', async () => {
      prisma.commandeTable.findUnique.mockResolvedValue({
        id: 'cmd1',
        statut: 'EN_PREPARATION',
        lignes: [],
        serveur: {},
        paiement: null,
      });
      prisma.commandeTable.update.mockResolvedValue({ id: 'cmd1', statut: 'TERMINEE' });

      const result = await service.changerStatut('cmd1', 'TERMINEE');

      expect(prisma.commandeTable.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statut: 'TERMINEE' }) }),
      );
      expect(result.statut).toBe('TERMINEE');
    });

    it('echoue si la commande n\'est pas EN_PREPARATION', async () => {
      prisma.commandeTable.findUnique.mockResolvedValue({
        id: 'cmd1',
        statut: 'TERMINEE',
        lignes: [],
        serveur: {},
        paiement: null,
      });

      await expect(service.changerStatut('cmd1', 'EN_PREPARATION' as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('re-incremente le stock lors d\'une annulation', async () => {
      prisma.commandeTable.findUnique.mockResolvedValue({
        id: 'cmd1',
        numero: 'CMD-2026-0001',
        statut: 'EN_PREPARATION',
        lignes: [
          { produitId: 'p1', quantite: 2 },
          { produitId: 'p2', quantite: 1 },
        ],
        serveur: {},
        paiement: null,
      });
      prisma.produit.update.mockResolvedValue({});
      prisma.mouvementStock.create.mockResolvedValue({});
      prisma.commandeTable.update.mockResolvedValue({ id: 'cmd1', statut: 'ANNULEE' });

      await service.changerStatut('cmd1', 'ANNULEE');

      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stockActuel: { increment: 2 } },
      });
      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { stockActuel: { increment: 1 } },
      });
    });
  });
});
