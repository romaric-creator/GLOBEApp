import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min } from 'class-validator';

export enum TypeAccessoire {
  VENTE = 'VENTE',
  LOCATION = 'LOCATION',
  VENTE_ET_LOCATION = 'VENTE_ET_LOCATION',
}

export class CreateAccessoireDto {
  @IsString()
  nom: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TypeAccessoire)
  @IsOptional()
  type?: TypeAccessoire;

  @IsNumber()
  @IsOptional()
  prixVente?: number;

  @IsNumber()
  @IsOptional()
  prixLocation?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;
}

export class CreateTransactionDto {
  @IsString()
  accessoireId: string;

  @IsEnum(['VENTE', 'LOCATION', 'RETOUR'])
  type: 'VENTE' | 'LOCATION' | 'RETOUR';

  @IsInt()
  @Min(1)
  quantite: number;

  @IsNumber()
  prixUnit: number;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
