import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    logConnexion: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('1h'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('doit rejeter un email inexistant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('doit rejeter un compte desactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        actif: false,
        role: { nom: 'employe' },
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('doit rejeter un compte verrouille', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        actif: true,
        tentativesEchouees: 5,
        role: { nom: 'employe' },
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('doit connecter avec des identifiants valides', async () => {
      const hash = await bcrypt.hash('password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        passwordHash: hash,
        nom: 'Test',
        prenom: 'User',
        actif: true,
        tentativesEchouees: 0,
        role: { nom: 'admin' },
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue({});
      mockPrisma.logConnexion.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('register', () => {
    it('doit rejeter un email deja utilise', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'password',
          nom: 'Test',
          prenom: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('doit creer un utilisateur avec le role employe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', nom: 'employe' });
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
        nom: 'New',
        prenom: 'User',
        role: { nom: 'employe' },
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'password',
        nom: 'New',
        prenom: 'User',
      });

      expect(result.email).toBe('new@test.com');
      expect(result.role).toBe('employe');
    });
  });
});
