import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MoyenPaiement } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaisseService } from './caisse.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateMouvementCaisseDto } from './dto/create-mouvement-caisse.dto';

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

class TrancheDto {
  @IsNumber() @Min(1) montant: number;
  @IsEnum(MoyenPaiement) moyen: MoyenPaiement;
  @IsOptional() @IsString() notes?: string;
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
    @Body() body: { totalReel: number; notes?: string; motifEcart?: string },
  ) {
    return this.caisseService.fermerSession(
      sessionId,
      body.totalReel,
      body.notes,
      body.motifEcart,
    );
  }

  // ========================
  // Mouvements de Caisse
  // ========================

  @Post('sessions/:sessionId/mouvements')
  ajouterMouvement(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateMouvementCaisseDto,
  ) {
    return this.caisseService.ajouterMouvement(sessionId, dto);
  }

  @Get('sessions/:sessionId/mouvements')
  getMouvements(@Param('sessionId') sessionId: string) {
    return this.caisseService.getMouvementsCaisse(sessionId);
  }

  // ========================
  // Encaissements
  // ========================

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

  // ========================
  // Tranches de paiement hôtel
  // ========================

  @Get('factures/:factureId/tranches')
  getTranchesFacture(@Param('factureId') factureId: string) {
    return this.caisseService.getTranchesFacture(factureId);
  }

  @Post('factures/:factureId/tranches')
  enregistrerTranche(
    @Param('factureId') factureId: string,
    @Body() dto: TrancheDto,
  ) {
    return this.caisseService.enregistrerTranche(
      factureId,
      dto.montant,
      dto.moyen,
      dto.notes,
    );
  }

  // ========================
  // Historique
  // ========================

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
