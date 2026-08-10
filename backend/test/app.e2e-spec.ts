import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('doit rejeter sans email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'password' })
        .expect(400);
    });

    it('doit rejeter sans mot de passe', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@test.com' })
        .expect(400);
    });

    it('doit rejeter un email invalide', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'invalid', password: 'password' })
        .expect(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('doit rejeter sans token (route admin uniquement)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@test.com' })
        .expect(401);
    });

    it('doit rejeter sans token meme avec un body valide', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          nom: 'Test',
          prenom: 'User',
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('doit rejeter sans token', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('doit rejeter sans token', () => {
      return request(app.getHttpServer()).get('/api/users').expect(401);
    });
  });
});
