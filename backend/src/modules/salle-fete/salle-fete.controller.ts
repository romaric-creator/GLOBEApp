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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  createType(
    @Body() dto: CreateTypeReservationDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut créer des types de réservation");
    return this.salleFeteService.createType(dto);
  }

  @Patch('types/:id')
  updateType(
    @Param('id') id: string,
    @Body() dto: CreateTypeReservationDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut modifier les types de réservation");
    return this.salleFeteService.updateType(id, dto);
  }

  @Delete('types/:id')
  deleteType(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException("Seul l'administrateur peut supprimer des types de réservation");
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
