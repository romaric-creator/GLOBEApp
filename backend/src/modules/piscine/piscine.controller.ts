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
import { PiscineService } from './piscine.service';
import { CheckoutPiscineDto, CreateTicketPiscineDto } from './dto/create-ticket.dto';
import { CreateAbonnementDto } from './dto/create-abonnement.dto';
import {
  CreateAccessoireDto,
  CreateTransactionDto,
} from './dto/create-accessoire.dto';

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

  @Post('tickets/checkout')
  checkoutPiscine(@Body() dto: CheckoutPiscineDto) {
    return this.piscineService.checkoutPiscine(dto);
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

  // Accessoires
  @Get('accessoires')
  findAllAccessoires(@Query('actif') actif?: string) {
    return this.piscineService.findAllAccessoires(actif || undefined);
  }

  @Post('accessoires')
  createAccessoire(@Body() dto: CreateAccessoireDto) {
    return this.piscineService.createAccessoire(dto);
  }

  @Patch('accessoires/:id')
  updateAccessoire(@Param('id') id: string, @Body() dto: CreateAccessoireDto) {
    return this.piscineService.updateAccessoire(id, dto);
  }

  @Delete('accessoires/:id')
  deleteAccessoire(@Param('id') id: string) {
    return this.piscineService.deleteAccessoire(id);
  }

  @Get('accessoires/transactions')
  getTransactions(@Query('accessoireId') accessoireId?: string) {
    return this.piscineService.getTransactions(accessoireId || undefined);
  }

  @Post('accessoires/transactions')
  createTransaction(@Body() dto: CreateTransactionDto) {
    return this.piscineService.createTransaction(dto);
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.piscineService.getStats();
  }
}
