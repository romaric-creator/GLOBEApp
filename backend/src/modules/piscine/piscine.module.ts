import { Module } from '@nestjs/common';
import { PiscineController } from './piscine.controller';
import { PiscineService } from './piscine.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PiscineController],
  providers: [PiscineService],
})
export class PiscineModule {}
