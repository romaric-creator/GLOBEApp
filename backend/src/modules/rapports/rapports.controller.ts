import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RapportsService } from './rapports.service';

@Controller('rapports')
@UseGuards(JwtAuthGuard)
export class RapportsController {
  constructor(private readonly rapportsService: RapportsService) {}

  @Get('chiffre-affaires')
  getChiffreAffaires(
    @Query('dateDebut') dateDebut: string,
    @Query('dateFin') dateFin: string,
  ) {
    return this.rapportsService.getChiffreAffaires(dateDebut, dateFin);
  }

  @Get('occupation')
  getOccupation(
    @Query('dateDebut') dateDebut: string,
    @Query('dateFin') dateFin: string,
  ) {
    return this.rapportsService.getOccupation(dateDebut, dateFin);
  }

  @Get('top-produits')
  getTopProduits(@Query('limit') limit?: string) {
    return this.rapportsService.getTopProduits(
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('personnel')
  getResumePersonnel() {
    return this.rapportsService.getResumePersonnel();
  }

  @Get('ca-7-jours')
  getCA7Jours() {
    return this.rapportsService.getCA7Jours();
  }

  @Get('resume-mensuel')
  getResumeMensuel(
    @Query('mois') mois: string,
    @Query('annee') annee: string,
  ) {
    return this.rapportsService.getResumeMensuel(
      parseInt(mois),
      parseInt(annee),
    );
  }
}
