import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaisseService } from './caisse.service';
import { OuvrirCaisseDto, CloturerCaisseDto } from './dto/cloture-caisse.dto';

@Controller('caisse')
@UseGuards(JwtAuthGuard)
export class CaisseController {
  constructor(private readonly caisseService: CaisseService) {}

  @Post('ouvrir')
  ouvrir(@Body() dto: OuvrirCaisseDto, @Request() req: { user: { id: string } }) {
    return this.caisseService.ouvrir(dto, req.user.id);
  }

  @Post('cloturer')
  cloturer(@Body() dto: CloturerCaisseDto, @Request() req: { user: { id: string } }) {
    return this.caisseService.cloturer(dto, req.user.id);
  }

  @Get('etat')
  getEtat(@Request() req: { user: { id: string } }) {
    return this.caisseService.getEtatCaisse(req.user.id);
  }

  @Get('historique')
  getHistorique(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.caisseService.getHistorique(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
