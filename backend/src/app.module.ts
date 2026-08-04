import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProduitsModule } from './modules/produits/produits.module';
import { VentesModule } from './modules/ventes/ventes.module';
import { CaisseModule } from './modules/caisse/caisse.module';
import { HotelModule } from './modules/hotel/hotel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ClientsModule,
    ProduitsModule,
    VentesModule,
    CaisseModule,
    HotelModule,
  ],
})
export class AppModule {}
