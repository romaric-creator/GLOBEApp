import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantService } from './restaurant.service';
import { CreateCommandeDto, AjouterLignesDto } from './dto/create-commande.dto';

@Controller('restaurant')
@UseGuards(JwtAuthGuard)
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('commandes')
  findAllCommandes(@Query('statut') statut?: string) {
    return this.restaurantService.findAllCommandes(statut || undefined);
  }

  @Get('commandes/:id')
  findOneCommande(@Param('id') id: string) {
    return this.restaurantService.findOneCommande(id);
  }

  @Post('commandes')
  createCommande(@Body() dto: CreateCommandeDto) {
    return this.restaurantService.createCommande(dto);
  }

  @Post('commandes/:id/lignes')
  ajouterLignes(@Param('id') id: string, @Body() dto: AjouterLignesDto) {
    return this.restaurantService.ajouterLignes(id, dto);
  }

  @Patch('commandes/:id/statut/:statut')
  changerStatut(
    @Param('id') id: string,
    @Param('statut') statut: 'TERMINEE' | 'ANNULEE',
  ) {
    return this.restaurantService.changerStatut(id, statut);
  }

  @Get('stats')
  getStats() {
    return this.restaurantService.getStats();
  }
}
