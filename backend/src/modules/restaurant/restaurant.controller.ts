import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantService } from './restaurant.service';
import { CreateTableDto, UpdateTableDto } from './dto/create-table.dto';
import { CreateCommandeDto, AjouterLignesDto } from './dto/create-commande.dto';
import { CreateArticleMenuDto } from './dto/create-article-menu.dto';

@Controller('restaurant')
@UseGuards(JwtAuthGuard)
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  // Articles Menu
  @Get('articles')
  findAllArticles(
    @Query('categorie') categorie?: string,
    @Query('actif') actif?: string,
  ) {
    return this.restaurantService.findAllArticles(categorie || undefined, actif || undefined);
  }

  @Post('articles')
  createArticle(@Body() dto: CreateArticleMenuDto) {
    return this.restaurantService.createArticle(dto);
  }

  @Patch('articles/:id')
  updateArticle(@Param('id') id: string, @Body() dto: CreateArticleMenuDto) {
    return this.restaurantService.updateArticle(id, dto);
  }

  @Delete('articles/:id')
  deleteArticle(@Param('id') id: string) {
    return this.restaurantService.deleteArticle(id);
  }

  // Tables
  @Get('tables')
  findAllTables() {
    return this.restaurantService.findAllTables();
  }

  @Post('tables')
  createTable(@Body() dto: CreateTableDto) {
    return this.restaurantService.createTable(dto);
  }

  @Patch('tables/:id')
  updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.restaurantService.updateTable(id, dto);
  }

  @Delete('tables/:id')
  deleteTable(@Param('id') id: string) {
    return this.restaurantService.deleteTable(id);
  }

  // Commandes
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
    @Param('statut') statut: 'EN_PREPARATION' | 'PRETE' | 'SERVIE' | 'PAYEE' | 'ANNULEE',
  ) {
    return this.restaurantService.changerStatut(id, statut);
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.restaurantService.getStats();
  }
}
