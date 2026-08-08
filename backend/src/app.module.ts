import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProduitsModule } from './modules/produits/produits.module';
// import { VentesModule } from './modules/ventes/ventes.module'; // desactive CDC v2.0
import { CaisseModule } from './modules/caisse/caisse.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { HotelModule } from './modules/hotel/hotel.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { PiscineModule } from './modules/piscine/piscine.module';
import { SalleFeteModule } from './modules/salle-fete/salle-fete.module';
import { ComptabiliteModule } from './modules/comptabilite/comptabilite.module';
import { RapportsModule } from './modules/rapports/rapports.module';
import { SauvegardeModule } from './modules/sauvegarde/sauvegarde.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ClientsModule,
    ProduitsModule,
    // VentesModule, // desactive CDC v2.0
    CaisseModule,
    PersonnelModule,
    HotelModule,
    RestaurantModule,
    PiscineModule,
    SalleFeteModule,
    ComptabiliteModule,
    RapportsModule,
    SauvegardeModule,
  ],
})
export class AppModule {}
