import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum TypeChambreDto {
  SIMPLE = 'SIMPLE',
  DOUBLE = 'DOUBLE',
  SUITE = 'SUITE',
  VIP = 'VIP',
}

export class CreateChambreDto {
  @IsString()
  numero: string;

  @IsEnum(TypeChambreDto)
  type: TypeChambreDto;

  @IsNumber()
  @Min(0)
  prixNuit: number;

  @IsInt()
  @Min(1)
  capacite: number;

  @IsInt()
  @IsOptional()
  etage?: number;
}

export class UpdateChambreDto {
  @IsEnum(TypeChambreDto)
  @IsOptional()
  type?: TypeChambreDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  prixNuit?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacite?: number;

  @IsInt()
  @IsOptional()
  etage?: number;
}
