import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VentesService } from './ventes.service';
import { CreateVenteDto } from './dto/create-vente.dto';
import { CreateAvoirDto } from './dto/create-avoir.dto';

@Controller('ventes')
@UseGuards(JwtAuthGuard)
export class VentesController {
  constructor(private readonly ventesService: VentesService) {}

  @Post()
  create(
    @Body() dto: CreateVenteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ventesService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.ventesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('stats')
  getStats() {
    return this.ventesService.getStats();
  }

  @Get('creances')
  getCreances(@Query('clientId') clientId?: string) {
    return this.ventesService.getCreances(clientId || undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventesService.findOne(id);
  }

  @Patch(':id/annuler')
  annuler(@Param('id') id: string) {
    return this.ventesService.annuler(id);
  }

  @Post('avoir')
  createAvoir(@Body() dto: CreateAvoirDto) {
    return this.ventesService.createAvoir(dto);
  }

  @Post(':id/ticket')
  genererTicket(@Param('id') id: string) {
    return this.ventesService.genererTicket(id);
  }

  @Patch('creances/:id/payer')
  payerCreance(@Param('id') id: string) {
    return this.ventesService.payerCreance(id);
  }
}
