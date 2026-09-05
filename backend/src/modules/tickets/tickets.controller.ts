import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('reservation/:id')
  async ticketReservation(@Param('id') id: string, @Res() res: Response) {
    const html = await this.ticketsService.genererTicketReservation(id);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  @Get('commande/:id')
  async ticketCommande(@Param('id') id: string, @Res() res: Response) {
    const html = await this.ticketsService.genererTicketCommande(id);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  @Get('piscine/:id')
  async ticketPiscine(@Param('id') id: string, @Res() res: Response) {
    const html = await this.ticketsService.genererTicketPiscine(id);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  @Get('cloture/:id')
  async rapportCloture(@Param('id') id: string, @Res() res: Response) {
    const html = await this.ticketsService.genererRapportCloture(id);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }
}
