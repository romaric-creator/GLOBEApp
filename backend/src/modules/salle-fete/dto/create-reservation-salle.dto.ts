import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateReservationSalleDto {
  @IsDateString()
  dateEvent: string;

  @IsString()
  heureDebut: string;

  @IsString()
  heureFin: string;

  @IsInt()
  @Min(1)
  nbInvites: number;

  @IsString()
  motif: string;

  @IsNumber()
  @Min(0)
  montant: number;

  @IsUUID()
  clientId: string;

  @IsUUID()
  @IsOptional()
  typeId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
