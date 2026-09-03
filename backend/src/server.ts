import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';

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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured before starting the API');
}

if (
  process.env.NODE_ENV === 'production' &&
  databaseUrl.includes('tidbcloud.com') &&
  !databaseUrl.includes('sslaccept=strict')
) {
  throw new Error(
    'DATABASE_URL must use sslaccept=strict for TiDB Cloud production connections',
  );
}

let nestApp: INestApplication | undefined;

async function getApp(): Promise<INestApplication> {
  if (nestApp) return nestApp;

  nestApp = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  nestApp.setGlobalPrefix('api');

  const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'https://globe-manager-admin.vercel.app',
    'https://globe-manager-dashboard.vercel.app',
    ...extraOrigins,
  ];

  nestApp.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  nestApp.use(
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

  await nestApp.init();
  return nestApp;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  const app = await getApp();
  app.getHttpAdapter().getInstance()(req, res);
}
