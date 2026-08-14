import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === '') continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = stripEmpty(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:1420',
    'tauri://localhost',
    'https://tauri.localhost',
    ...extraOrigins,
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use(
    (
      req: { body?: Record<string, unknown> },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.body && typeof req.body === 'object') {
        req.body = stripEmpty(req.body);
      }
      next();
    },
  );

  const prisma = app.get(PrismaService);
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get(
    '/api/health',
    async (
      _req: unknown,
      res: {
        status: (code: number) => { json: (v: unknown) => void };
        json: (v: unknown) => void;
      },
    ) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected', version: '1.1.9' });
      } catch {
        res.status(503).json({
          status: 'degraded',
          database: 'disconnected',
          version: '1.1.9',
        });
      }
    },
  );

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
