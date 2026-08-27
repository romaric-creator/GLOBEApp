import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum TypeChambreDto {
  STANDARD = 'STANDARD',
  JUNIOR = 'JUNIOR',
  JUNIOR_PLUS = 'JUNIOR_PLUS',
  SENIOR = 'SENIOR',
  STUDIO = 'STUDIO',
  APPARTEMENT = 'APPARTEMENT',
}

export class CreateChambreDto {
  @IsString()
  numero: string;

  @IsEnum(TypeChambreDto)
  type: TypeChambreDto;

  @IsNumber()
  @Min(0)
  prixNuit: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  prixSieste?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  prixJournee?: number;

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

  @IsNumber()
  @Min(0)
  @IsOptional()
  prixSieste?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  prixJournee?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacite?: number;

  @IsInt()
  @IsOptional()
  etage?: number;
}
