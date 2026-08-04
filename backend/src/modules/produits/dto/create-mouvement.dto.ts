import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, Min } from 'class-validator';
import { TypeMouvement } from '@prisma/client';

export class CreateMouvementDto {
  @IsEnum(TypeMouvement)
  type: TypeMouvement;

  @IsNumber()
  @Min(1)
  quantite: number;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsUUID()
  produitId: string;
}
