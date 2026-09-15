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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HotelService } from './hotel.service';
import { CreateChambreDto, UpdateChambreDto } from './dto/create-chambre.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { QueryReservationDto } from './dto/query-reservation.dto';

@Controller('hotel')
@UseGuards(JwtAuthGuard)
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  // Chambres
  @Get('chambres')
  findAllChambres() {
    return this.hotelService.findAllChambres();
  }

  @Get('chambres/:id')
  findOneChambre(@Param('id') id: string) {
    return this.hotelService.findOneChambre(id);
  }

  @Post('chambres')
  createChambre(
    @Body() dto: CreateChambreDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.hotelService.createChambre(dto, user.role);
  }

  @Patch('chambres/:id')
  updateChambre(
    @Param('id') id: string,
    @Body() dto: UpdateChambreDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.hotelService.updateChambre(id, dto, user.role);
  }

  @Delete('chambres/:id')
  deleteChambre(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.hotelService.deleteChambre(id, user.role);
  }

  // Reservations
  @Get('reservations')
  findAllReservations(@Query() query: QueryReservationDto) {
    return this.hotelService.findAllReservations(query.statut || undefined);
  }

  @Get('reservations/:id')
  findOneReservation(@Param('id') id: string) {
    return this.hotelService.findOneReservation(id);
  }

  @Post('reservations')
  createReservation(@Body() dto: CreateReservationDto) {
    return this.hotelService.createReservation(dto);
  }

  @Patch('reservations/:id/confirmer')
  confirmerReservation(@Param('id') id: string) {
    return this.hotelService.confirmerReservation(id);
  }

  @Patch('reservations/:id/annuler')
  annulerReservation(@Param('id') id: string) {
    return this.hotelService.annulerReservation(id);
  }

  @Patch('reservations/:id/checkin')
  checkIn(@Param('id') id: string) {
    return this.hotelService.checkIn(id);
  }

  @Patch('reservations/:id/checkout')
  checkOut(@Param('id') id: string, @Body() body?: { force?: boolean }) {
    return this.hotelService.checkOut(id, body?.force);
  }

  // Factures
  @Get('reservations/:id/facture')
  getFactureByReservation(@Param('id') id: string) {
    return this.hotelService.findFactureByReservation(id);
  }

  @Get('factures')
  findAllFactures(@Query('payee') payee?: string) {
    if (payee === 'true') return this.hotelService.findAllFactures(true);
    if (payee === 'false') return this.hotelService.findAllFactures(false);
    return this.hotelService.findAllFactures();
  }

  @Get('factures/:id')
  findOneFacture(@Param('id') id: string) {
    return this.hotelService.findOneFacture(id);
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.hotelService.getStats();
  }
}
