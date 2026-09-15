import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ProduitsService } from './produits.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { CreateMouvementDto } from './dto/create-mouvement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('produits')
@UseGuards(JwtAuthGuard)
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  // --- Categories ---

  @Get('categories')
  findAllCategories() {
    return this.produitsService.findAllCategories();
  }

  @Post('categories')
  createCategorie(
    @Body() dto: CreateCategorieDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut créer des catégories");
    return this.produitsService.createCategorie(dto);
  }

  @Patch('categories/:id')
  updateCategorie(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategorieDto>,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut modifier les catégories");
    return this.produitsService.updateCategorie(id, dto);
  }

  @Delete('categories/:id')
  deleteCategorie(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut supprimer des catégories");
    return this.produitsService.deleteCategorie(id);
  }

  // --- Produits ---

  @Get()
  findAll() {
    return this.produitsService.findAllProduits();
  }

  @Get('alertes')
  findAlertes() {
    return this.produitsService.findProduitsEnAlerte();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitsService.findOneProduit(id);
  }

  @Post()
  create(
    @Body() dto: CreateProduitDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut créer des produits");
    return this.produitsService.createProduit(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProduitDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut modifier les produits");
    return this.produitsService.updateProduit(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut supprimer des produits");
    return this.produitsService.deleteProduit(id);
  }

  // --- Mouvements de stock ---

  @Get('mouvements/historique')
  findMouvements(@Query('produitId') produitId?: string) {
    return this.produitsService.findMouvements(produitId);
  }

  @Post('mouvements')
  createMouvement(@Body() dto: CreateMouvementDto) {
    return this.produitsService.createMouvement(dto);
  }
}
