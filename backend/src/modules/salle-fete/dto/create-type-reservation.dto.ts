import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateTypeReservationDto {
  @IsString()
  nom: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  inclusions?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  prixBase?: number;
}
