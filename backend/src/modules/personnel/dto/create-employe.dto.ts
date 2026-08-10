import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum TypeContratDto {
  CDI = 'CDI',
  CDD = 'CDD',
  STAGE = 'STAGE',
  FREELANCE = 'FREELANCE',
}

export class CreateEmployeDto {
  @IsString()
  matricule: string;

  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsString()
  poste: string;

  @IsNumber()
  @Min(0)
  salaire: number;

  @IsEnum(TypeContratDto)
  typeContrat: TypeContratDto;

  @IsUUID()
  @IsOptional()
  userId?: string;
}

export class UpdateEmployeDto {
  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  prenom?: string;

  @IsString()
  @IsOptional()
  poste?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salaire?: number;

  @IsEnum(TypeContratDto)
  @IsOptional()
  typeContrat?: TypeContratDto;
}
