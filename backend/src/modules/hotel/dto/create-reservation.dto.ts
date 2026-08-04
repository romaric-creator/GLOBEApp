import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  chambreId: string;

  @IsUUID()
  clientId: string;

  @IsDateString()
  dateArrivee: string;

  @IsDateString()
  dateDepart: string;

  @IsInt()
  @Min(1)
  nbPersonnes: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
