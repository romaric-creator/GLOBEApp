import { IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateEcritureDto {
  @IsNumber()
  montant: number;

  @IsString()
  libelle: string;

  @IsUUID()
  compteDebitId: string;

  @IsUUID()
  compteCreditId: string;

  @IsUUID()
  categorieComptaId: string;
}
