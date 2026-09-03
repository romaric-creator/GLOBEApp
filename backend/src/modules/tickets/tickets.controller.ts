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
    const pdf = await this.ticketsService.genererTicketReservation(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ticket-reservation-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Get('commande/:id')
  async ticketCommande(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.ticketsService.genererTicketCommande(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ticket-commande-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Get('piscine/:id')
  async ticketPiscine(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.ticketsService.genererTicketPiscine(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ticket-piscine-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Get('cloture/:id')
  async rapportCloture(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.ticketsService.genererRapportCloture(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="cloture-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
