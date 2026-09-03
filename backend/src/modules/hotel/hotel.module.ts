import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HotelController } from './hotel.controller';
import { HotelService } from './hotel.service';
import { HotelScheduler } from './hotel.scheduler';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [HotelController],
  providers: [HotelService, HotelScheduler],
})
export class HotelModule {}
