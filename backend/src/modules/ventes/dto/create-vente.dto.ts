import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ModePaiementDto {
  ESPECES = 'ESPECES',
  CARTE = 'CARTE',
  VIREMENT = 'VIREMENT',
  CREDIT = 'CREDIT',
  MIXTE = 'MIXTE',
}

export class CreateLigneVenteDto {
  @IsUUID()
  produitId: string;

  @IsNumber()
  @Min(1)
  quantite: number;

  @IsNumber()
  @Min(0)
  prixUnitaire: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remise?: number;
}

export class CreateVenteDto {
  @IsEnum(ModePaiementDto)
  modePaiement: ModePaiementDto;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remise?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLigneVenteDto)
  lignes: CreateLigneVenteDto[];
}
