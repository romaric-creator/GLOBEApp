import { Module } from '@nestjs/common';
import { CaisseController } from './caisse.controller';
import { CaisseService } from './caisse.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CaisseController],
  providers: [CaisseService],
  exports: [CaisseService],
})
export class CaisseModule {}
