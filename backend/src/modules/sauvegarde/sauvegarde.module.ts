import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SauvegardeController } from './sauvegarde.controller';
import { SauvegardeService } from './sauvegarde.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SauvegardeController],
  providers: [SauvegardeService],
})
export class SauvegardeModule {}
