import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateAvoirDto {
  @IsUUID()
  venteId: string;

  @IsString()
  motif: string;

  @IsNumber()
  @Min(1)
  montant: number;
}
