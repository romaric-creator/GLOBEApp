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

@Controller('sync')
export class SyncController {
  constructor(
    private syncService: SyncService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Déclencher une sync manuelle (depuis l'app desktop)
  @UseGuards(JwtAuthGuard)
  @Post('push')
  async push() {
    return this.syncService.sync();
  }

  // Statut de sync (nb en attente, dernière sync)
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status() {
    return this.syncService.getStatus();
  }

  // Historique des syncs
  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    return this.syncService.getLogs(limit ? parseInt(limit) : 10);
  }

  // Endpoint reçoit les données depuis une instance locale (protégé par clé API)
  @Post('receive')
  async receive(
    @Headers('x-sync-key') key: string,
    @Body() payload: any,
  ) {
    const expected = this.config.get<string>('SYNC_API_KEY');
    if (!expected || key !== expected) {
      throw new ForbiddenException('Clé de synchronisation invalide');
    }
    return this.upsertPayload(payload);
  }

  private async upsertPayload(payload: any) {
    const results = { reservations: 0, facturesSejour: 0, commandes: 0, paiements: 0, depenses: 0 };

    if (payload.reservations?.length) {
      for (const r of payload.reservations) {
        const { chambre, client, factureSejour, syncStatus, syncedAt, ...data } = r;
        await this.prisma.reservation.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
        results.reservations++;
      }
    }

    if (payload.facturesSejour?.length) {
      for (const f of payload.facturesSejour) {
        const { reservation, paiement, syncStatus, syncedAt, ...data } = f;
        await this.prisma.factureSejour.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
        results.facturesSejour++;
      }
    }

    if (payload.commandes?.length) {
      for (const c of payload.commandes) {
        const { lignes, syncStatus, syncedAt, ...data } = c;
        await this.prisma.commandeTable.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
        results.commandes++;
      }
    }

    if (payload.paiements?.length) {
      for (const p of payload.paiements) {
        const { syncStatus, syncedAt, ...data } = p;
        await this.prisma.paiement.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
        results.paiements++;
      }
    }

    if (payload.depenses?.length) {
      for (const d of payload.depenses) {
        const { syncStatus, syncedAt, ...data } = d;
        await this.prisma.depense.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
        results.depenses++;
      }
    }

    return { success: true, ...results };
  }
}
