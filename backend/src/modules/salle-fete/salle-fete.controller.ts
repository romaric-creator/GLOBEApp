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
import { SalleFeteService } from './salle-fete.service';
import { CreateReservationSalleDto } from './dto/create-reservation-salle.dto';
import { CreateTypeReservationDto } from './dto/create-type-reservation.dto';

@Controller('salle-fete')
@UseGuards(JwtAuthGuard)
export class SalleFeteController {
  constructor(private readonly salleFeteService: SalleFeteService) {}

  // Types de reservation
  @Get('types')
  findAllTypes() {
    return this.salleFeteService.findAllTypes();
  }

  @Post('types')
  createType(@Body() dto: CreateTypeReservationDto) {
    return this.salleFeteService.createType(dto);
  }

  @Patch('types/:id')
  updateType(@Param('id') id: string, @Body() dto: CreateTypeReservationDto) {
    return this.salleFeteService.updateType(id, dto);
  }

  @Delete('types/:id')
  deleteType(@Param('id') id: string) {
    return this.salleFeteService.deleteType(id);
  }

  // Reservations
  @Get('reservations')
  findAll(@Query('statut') statut?: string) {
    return this.salleFeteService.findAll(statut || undefined);
  }

  @Get('reservations/:id')
  findOne(@Param('id') id: string) {
    return this.salleFeteService.findOne(id);
  }

  @Post('reservations')
  create(@Body() dto: CreateReservationSalleDto) {
    return this.salleFeteService.create(dto);
  }

  @Patch('reservations/:id/confirmer')
  confirmer(@Param('id') id: string) {
    return this.salleFeteService.confirmer(id);
  }

  @Patch('reservations/:id/annuler')
  annuler(@Param('id') id: string) {
    return this.salleFeteService.annuler(id);
  }

  @Patch('reservations/:id/terminer')
  terminer(@Param('id') id: string) {
    return this.salleFeteService.terminer(id);
  }

  @Get('stats')
  getStats() {
    return this.salleFeteService.getStats();
  }
}
