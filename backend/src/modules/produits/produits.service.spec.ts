import { ProduitsService } from './produits.service';

describe('ProduitsService', () => {
  it('applies stock adjustments as a relative delta', async () => {
    const mouvementCreate = jest.fn().mockResolvedValue({ id: 'm1' });
    const produitUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'p1', stockActuel: 15 });

    const prisma = {
      produit: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', stockActuel: 10 }),
        update: produitUpdate,
      },
      mouvementStock: {
        create: mouvementCreate,
      },
      $transaction: jest.fn().mockImplementation(async (operations) => {
        if (Array.isArray(operations)) {
          return Promise.all(operations);
        }
        return operations(prisma);
      }),
    } as any;

    const service = new ProduitsService(prisma);

    await service.createMouvement({
      produitId: 'p1',
      type: 'AJUSTEMENT',
      quantite: 5,
      motif: 'Ajustement de stock',
    } as any);

    expect(produitUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stockActuel: { increment: 5 } },
    });
  });
});
