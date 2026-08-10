import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  Min,
} from 'class-validator';
import { TypeMouvement } from '@prisma/client';

export class CreateMouvementDto {
  @IsEnum(TypeMouvement)
  type: TypeMouvement;

  // INVENTAIRE accepte 0 (produit épuisé), AJUSTEMENT accepte négatif (décrémentation)
  @IsNumber()
  @Min(-999999)
  quantite: number;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsUUID()
  produitId: string;
}
