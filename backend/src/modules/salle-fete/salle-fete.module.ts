import { Module } from '@nestjs/common';
import { SalleFeteController } from './salle-fete.controller';
import { SalleFeteService } from './salle-fete.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalleFeteController],
  providers: [SalleFeteService],
})
export class SalleFeteModule {}
