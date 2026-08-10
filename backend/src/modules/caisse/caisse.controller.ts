import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { MoyenPaiement } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaisseService } from './caisse.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class EncaisserHotelDto {
  @IsUUID() factureId: string;
  @IsUUID() sessionId: string;
  @IsNumber() @Min(0) montant: number;
  @IsEnum(MoyenPaiement) moyen: MoyenPaiement;
}

class EncaisserRestaurantDto {
  @IsUUID() commandeId: string;
  @IsUUID() sessionId: string;
  @IsNumber() @Min(0) montant: number;
  @IsEnum(MoyenPaiement) moyen: MoyenPaiement;
}

@Controller('caisse')
@UseGuards(JwtAuthGuard)
export class CaisseController {
  constructor(private readonly caisseService: CaisseService) {}

  @Get()
  getCaisses() {
    return this.caisseService.getCaisses();
  }

  @Get(':id/session-active')
  getSessionActive(@Param('id') id: string) {
    return this.caisseService.getSessionActive(id);
  }

  @Post(':id/ouvrir')
  ouvrirSession(
    @Param('id') id: string,
    @Body() body: { fondInitial: number },
    @CurrentUser() user: { id: string },
  ) {
    return this.caisseService.ouvrirSession(id, user.id, body.fondInitial ?? 0);
  }

  @Post('sessions/:sessionId/fermer')
  fermerSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { totalReel: number; notes?: string },
  ) {
    return this.caisseService.fermerSession(
      sessionId,
      body.totalReel,
      body.notes,
    );
  }

  @Post('encaisser/hotel')
  encaisserHotel(
    @Body() body: EncaisserHotelDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.caisseService.encaisserFactureHotel(
      body.factureId,
      body.sessionId,
      user.id,
      body.montant,
      body.moyen,
    );
  }

  @Post('encaisser/restaurant')
  encaisserRestaurant(
    @Body() body: EncaisserRestaurantDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.caisseService.encaisserCommandeRestaurant(
      body.commandeId,
      body.sessionId,
      user.id,
      body.montant,
      body.moyen,
    );
  }

  @Get(':id/historique')
  getHistorique(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.caisseService.getHistorique(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
