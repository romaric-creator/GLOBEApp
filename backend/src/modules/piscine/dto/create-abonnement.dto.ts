import { IsDateString, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateAbonnementDto {
  @IsString()
  type: string;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;

  @IsNumber()
  @Min(0)
  prix: number;

  @IsUUID()
  clientId: string;
}
