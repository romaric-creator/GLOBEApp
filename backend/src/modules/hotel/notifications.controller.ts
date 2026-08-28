import { Controller, Get, Post, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 50,
    });
  }

  @Patch(':id/lire')
  markRead(@Param('id') id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { lu: true },
    });
  }

  @Patch('lire-tout')
  markAllRead() {
    return this.prisma.notification.updateMany({
      where: { lu: false },
      data: { lu: true },
    });
  }

  @Post('test')
  sendTest() {
    this.notifications.emitNotification({
      type: 'INFO',
      titre: 'Test de notification',
      message: 'Les notifications fonctionnent correctement.',
      createdAt: new Date(),
    });
    return { ok: true };
  }
}
