import { IsNumber, Min } from 'class-validator';

export class OuvrirCaisseDto {
  @IsNumber()
  @Min(0)
  montantOuverture: number;
}

export class CloturerCaisseDto {
  @IsNumber()
  @Min(0)
  montantCloture: number;
}
