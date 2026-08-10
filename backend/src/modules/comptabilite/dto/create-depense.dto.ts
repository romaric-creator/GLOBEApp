import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';

const CENTRES = [
  'HOTEL',
  'RESTAURANT',
  'PISCINE',
  'SALLE_FETE',
  'GENERAL',
] as const;

export class CreateDepenseDto {
  @IsString()
  libelle: string;

  @IsNumber()
  @IsPositive()
  montant: number;

  @IsIn(CENTRES)
  @IsOptional()
  centre?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
