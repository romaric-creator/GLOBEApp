import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

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
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:1420', 'tauri://localhost'],
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

  // Health check pour Tauri desktop auto-start
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/health', (_req: unknown, res: { json: (v: unknown) => void }) => {
    res.json({ status: 'ok' });
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
