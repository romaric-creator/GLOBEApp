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
import { PiscineService } from './piscine.service';
import { CreateTicketPiscineDto } from './dto/create-ticket.dto';
import { CreateAbonnementDto } from './dto/create-abonnement.dto';

@Controller('piscine')
@UseGuards(JwtAuthGuard)
export class PiscineController {
  constructor(private readonly piscineService: PiscineService) {}

  // Tickets
  @Get('tickets')
  findAllTickets(
    @Query('type') type?: string,
    @Query('utilise') utilise?: string,
  ) {
    return this.piscineService.findAllTickets(
      type || undefined,
      utilise || undefined,
    );
  }

  @Post('tickets')
  createTicket(@Body() dto: CreateTicketPiscineDto) {
    return this.piscineService.createTicket(dto);
  }

  @Patch('tickets/:id/utiliser')
  utiliserTicket(@Param('id') id: string) {
    return this.piscineService.utiliserTicket(id);
  }

  // Abonnements
  @Get('abonnements')
  findAllAbonnements(@Query('actif') actif?: string) {
    return this.piscineService.findAllAbonnements(actif || undefined);
  }

  @Post('abonnements')
  createAbonnement(@Body() dto: CreateAbonnementDto) {
    return this.piscineService.createAbonnement(dto);
  }

  @Patch('abonnements/:id/resilier')
  resilierAbonnement(@Param('id') id: string) {
    return this.piscineService.resilierAbonnement(id);
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.piscineService.getStats();
  }
}
