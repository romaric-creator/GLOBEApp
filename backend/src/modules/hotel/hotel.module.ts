import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HotelController } from './hotel.controller';
import { NotificationsController } from './notifications.controller';
import { HotelService } from './hotel.service';
import { HotelScheduler } from './hotel.scheduler';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [HotelController, NotificationsController],
  providers: [HotelService, HotelScheduler, NotificationsGateway],
  exports: [NotificationsGateway],
})
export class HotelModule {}
