import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      client: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ClientsService(prisma);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('retourne la liste des clients', async () => {
      const clients = [
        { id: 'cl1', nom: 'Dupont', prenom: 'Jean' },
        { id: 'cl2', nom: 'Martin', prenom: 'Marie' },
      ];
      prisma.client.findMany.mockResolvedValue(clients);

      const result = await service.findAll();

      expect(result).toBe(clients);
    });
  });

  describe('create', () => {
    it('cree et retourne un nouveau client', async () => {
      const dto = { nom: 'Dupont', prenom: 'Jean', telephone: '0600000000' };
      const clientCree = { id: 'cl1', ...dto };
      prisma.client.create.mockResolvedValue(clientCree);

      const result = await service.create(dto as any);

      expect(prisma.client.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toBe(clientCree);
    });
  });

  describe('remove', () => {
    it('supprime le client existant', async () => {
      const client = { id: 'cl1', nom: 'Dupont', prenom: 'Jean' };
      prisma.client.findUnique.mockResolvedValue(client);
      prisma.client.delete.mockResolvedValue(client);

      const result = await service.remove('cl1');

      expect(prisma.client.delete).toHaveBeenCalledWith({ where: { id: 'cl1' } });
      expect(result).toBe(client);
    });

    it('echoue si le client est introuvable', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('met a jour un client existant', async () => {
      const client = { id: 'cl1', nom: 'Dupont', prenom: 'Jean' };
      prisma.client.findUnique.mockResolvedValue(client);
      prisma.client.update.mockResolvedValue({ ...client, nom: 'Durand' });

      const result = await service.update('cl1', { nom: 'Durand' } as any);

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 'cl1' },
        data: { nom: 'Durand' },
      });
      expect(result.nom).toBe('Durand');
    });

    it('echoue si le client est introuvable', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.update('inexistant', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
