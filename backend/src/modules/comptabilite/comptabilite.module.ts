import { Module } from '@nestjs/common';
import { ComptabiliteController } from './comptabilite.controller';
import { ComptabiliteService } from './comptabilite.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComptabiliteController],
  providers: [ComptabiliteService],
  exports: [ComptabiliteService],
})
export class ComptabiliteModule {}
