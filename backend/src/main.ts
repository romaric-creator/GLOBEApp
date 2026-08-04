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
  app.enableCors();
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
        req.body = stripEmpty(req.body as Record<string, unknown>);
      }
      next();
    },
  );

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
