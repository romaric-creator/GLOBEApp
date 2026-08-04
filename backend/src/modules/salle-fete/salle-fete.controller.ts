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
import { SalleFeteService } from './salle-fete.service';
import { CreateReservationSalleDto } from './dto/create-reservation-salle.dto';

@Controller('salle-fete')
@UseGuards(JwtAuthGuard)
export class SalleFeteController {
  constructor(private readonly salleFeteService: SalleFeteService) {}

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
