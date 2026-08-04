import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateProduitDto {
  @IsString()
  reference: string;

  @IsString()
  nom: string;

  @IsNumber()
  @Min(0)
  prixAchat: number;

  @IsNumber()
  @Min(0)
  prixVente: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActuel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seuilAlerte?: number;

  @IsOptional()
  @IsString()
  unite?: string;

  @IsUUID()
  categorieId: string;
}
