import { Module } from '@nestjs/common';
import { RapportsController } from './rapports.controller';
import { RapportsService } from './rapports.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RapportsController],
  providers: [RapportsService],
})
export class RapportsModule {}
