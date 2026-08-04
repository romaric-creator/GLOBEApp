import { Module } from '@nestjs/common';
import { VentesController } from './ventes.controller';
import { VentesService } from './ventes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VentesController],
  providers: [VentesService],
  exports: [VentesService],
})
export class VentesModule {}
