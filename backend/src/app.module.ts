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
import { PersonnelModule } from './modules/personnel/personnel.module';

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
    PersonnelModule,
  ],
})
export class AppModule {}
