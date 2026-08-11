import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  ForbiddenException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';

type SyncRecord = Record<string, unknown>;

interface SyncPayload {
  reservations?: SyncRecord[];
  facturesSejour?: SyncRecord[];
  commandes?: SyncRecord[];
  paiements?: SyncRecord[];
  depenses?: SyncRecord[];
}

function omit(obj: SyncRecord, ...keys: string[]): SyncRecord {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

@Controller('sync')
export class SyncController {
  constructor(
    private syncService: SyncService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('push')
  async push() {
    return this.syncService.sync();
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status() {
    return this.syncService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    return this.syncService.getLogs(limit ? parseInt(limit) : 10);
  }

  @Post('receive')
  async receive(
    @Headers('x-sync-key') key: string,
    @Body() payload: SyncPayload,
  ) {
    const expected = this.config.get<string>('SYNC_API_KEY');
    if (!expected || key !== expected) {
      throw new ForbiddenException('Clé de synchronisation invalide');
    }
    return this.upsertPayload(payload);
  }

  private async upsertPayload(payload: SyncPayload) {
    const results = {
      reservations: 0,
      facturesSejour: 0,
      commandes: 0,
      paiements: 0,
      depenses: 0,
    };

    if (payload.reservations?.length) {
      for (const r of payload.reservations) {
        const data = omit(
          r,
          'chambre',
          'client',
          'factureSejour',
          'syncStatus',
          'syncedAt',
        );
        await this.prisma.reservation.upsert({
          where: { id: data['id'] as string },
          update: data as any,
          create: data as any,
        });
        results.reservations++;
      }
    }

    if (payload.facturesSejour?.length) {
      for (const f of payload.facturesSejour) {
        const data = omit(
          f,
          'reservation',
          'paiement',
          'syncStatus',
          'syncedAt',
        );
        await this.prisma.factureSejour.upsert({
          where: { id: data['id'] as string },
          update: data as any,
          create: data as any,
        });
        results.facturesSejour++;
      }
    }

    if (payload.commandes?.length) {
      for (const c of payload.commandes) {
        const data = omit(c, 'lignes', 'syncStatus', 'syncedAt');
        await this.prisma.commandeTable.upsert({
          where: { id: data['id'] as string },
          update: data as any,
          create: data as any,
        });
        results.commandes++;
      }
    }

    if (payload.paiements?.length) {
      for (const p of payload.paiements) {
        const data = omit(p, 'syncStatus', 'syncedAt');
        await this.prisma.paiement.upsert({
          where: { id: data['id'] as string },
          update: data as any,
          create: data as any,
        });
        results.paiements++;
      }
    }

    if (payload.depenses?.length) {
      for (const d of payload.depenses) {
        const data = omit(d, 'syncStatus', 'syncedAt');
        await this.prisma.depense.upsert({
          where: { id: data['id'] as string },
          update: data as any,
          create: data as any,
        });
        results.depenses++;
      }
    }

    return { success: true, ...results };
  }
}
