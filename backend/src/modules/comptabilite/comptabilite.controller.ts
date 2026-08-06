import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComptabiliteService } from './comptabilite.service';
import { CreateCompteDto } from './dto/create-compte.dto';
import { CreateEcritureDto } from './dto/create-ecriture.dto';
import { CreateCategorieComptaDto } from './dto/create-categorie-compta.dto';

@Controller('comptabilite')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComptabiliteController {
  constructor(private readonly comptabiliteService: ComptabiliteService) {}

  @Get('comptes')
  findAllComptes() {
    return this.comptabiliteService.findAllComptes();
  }

  @Post('comptes')
  createCompte(@Body() dto: CreateCompteDto) {
    return this.comptabiliteService.createCompte(dto);
  }

  @Get('ecritures')
  findAllEcritures(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.comptabiliteService.findAllEcritures(dateDebut, dateFin);
  }

  @Post('ecritures')
  createEcriture(@Body() dto: CreateEcritureDto) {
    return this.comptabiliteService.createEcriture(dto);
  }

  @Get('categories')
  findAllCategories() {
    return this.comptabiliteService.findAllCategories();
  }

  @Post('categories')
  createCategorie(@Body() dto: CreateCategorieComptaDto) {
    return this.comptabiliteService.createCategorie(dto);
  }

  @Get('stats')
  getStats() {
    return this.comptabiliteService.getStats();
  }

  @Post('cloture')
  @Roles('admin', 'comptable')
  cloturerPeriode(@Body('periode') periode: string) {
    return this.comptabiliteService.cloturerPeriode(periode);
  }
}
