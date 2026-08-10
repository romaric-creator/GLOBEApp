import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComptabiliteService } from './comptabilite.service';
import { CreateDepenseDto } from './dto/create-depense.dto';

@Controller('comptabilite')
@UseGuards(JwtAuthGuard)
export class ComptabiliteController {
  constructor(private readonly comptabiliteService: ComptabiliteService) {}

  // Tableau de bord financier (mois courant ou mois donné ex: ?mois=2026-07)
  @Get('tableau-bord')
  getTableauBord(@Query('mois') mois?: string) {
    return this.comptabiliteService.getTableauBord(mois);
  }

  // Historique sur 12 mois (courbe)
  @Get('historique-mensuel')
  getHistoriqueMensuel() {
    return this.comptabiliteService.getHistoriqueMensuel();
  }

  // Trésorerie consolidée (caisses ouvertes en ce moment)
  @Get('tresorerie')
  getTresorerie() {
    return this.comptabiliteService.getTresorerie();
  }

  // Détail des recettes par source sur une période
  @Get('recettes')
  getRecettesDetail(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.comptabiliteService.getRecettesDetail(dateDebut, dateFin);
  }

  // Dépenses
  @Get('depenses')
  getDepenses(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
    @Query('centre') centre?: string,
  ) {
    return this.comptabiliteService.getDepenses(dateDebut, dateFin, centre);
  }

  @Post('depenses')
  createDepense(@Body() dto: CreateDepenseDto) {
    return this.comptabiliteService.createDepense(dto);
  }

  @Delete('depenses/:id')
  deleteDepense(@Param('id') id: string) {
    return this.comptabiliteService.deleteDepense(id);
  }
}
