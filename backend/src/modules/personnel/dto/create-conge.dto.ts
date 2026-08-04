import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum TypeCongeDto {
  ANNUEL = 'ANNUEL',
  MALADIE = 'MALADIE',
  SANS_SOLDE = 'SANS_SOLDE',
  MATERNITE = 'MATERNITE',
  EXCEPTIONNEL = 'EXCEPTIONNEL',
}

export enum StatutCongeDto {
  EN_ATTENTE = 'EN_ATTENTE',
  APPROUVE = 'APPROUVE',
  REFUSE = 'REFUSE',
  ANNULE = 'ANNULE',
}

export class CreateCongeDto {
  @IsUUID()
  employeId: string;

  @IsEnum(TypeCongeDto)
  type: TypeCongeDto;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;

  @IsString()
  @IsOptional()
  motif?: string;
}
