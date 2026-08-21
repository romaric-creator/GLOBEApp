import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @UseGuards(JwtAuthGuard)
  @Post('push')
  async push() {
    return this.syncService.sync();
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status() {
    return this.syncService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    return this.syncService.getLogs(limit ? parseInt(limit) : 10);
  }

  @UseGuards(JwtAuthGuard)
  @Post('test-connection')
  async testConnection(@Body() body: any) {
    const creds =
      body?.host
        ? {
            host: body.host as string,
            port: Number(body.port) || 3306,
            user: body.user as string,
            password: (body.password as string) || '',
            database: body.database as string,
          }
        : undefined;
    return this.syncService.testConnection(creds);
  }
}
