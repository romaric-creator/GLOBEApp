import { IsString, IsEnum } from 'class-validator';

export enum TypeCompte {
  ACTIF = 'ACTIF',
  PASSIF = 'PASSIF',
  CHARGE = 'CHARGE',
  PRODUIT = 'PRODUIT',
}

export class CreateCompteDto {
  @IsString()
  nom: string;

  @IsEnum(TypeCompte)
  type: TypeCompte;
}
