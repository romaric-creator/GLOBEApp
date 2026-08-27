import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TypeMouvementCaisse } from '@prisma/client';

export class CreateMouvementCaisseDto {
  @IsEnum(TypeMouvementCaisse)
  type: TypeMouvementCaisse;

  @IsNumber()
  @Min(1)
  montant: number;

  @IsString()
  motif: string;
}

export class FermerSessionDto {
  @IsNumber()
  @Min(0)
  totalReel: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
