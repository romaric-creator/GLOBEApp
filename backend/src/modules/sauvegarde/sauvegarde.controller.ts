import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SauvegardeService } from './sauvegarde.service';
import { CreateSauvegardeDto } from './dto/create-sauvegarde.dto';

@Controller('sauvegarde')
@UseGuards(JwtAuthGuard)
export class SauvegardeController {
  constructor(private readonly sauvegardeService: SauvegardeService) {}

  @Get()
  findAll() {
    return this.sauvegardeService.findAll();
  }

  @Post()
  create(@Body() dto: CreateSauvegardeDto) {
    return this.sauvegardeService.create(dto);
  }

  @Get('latest')
  getLatest() {
    return this.sauvegardeService.getLatest();
  }

  @Get('stats')
  getStats() {
    return this.sauvegardeService.getStats();
  }
}
