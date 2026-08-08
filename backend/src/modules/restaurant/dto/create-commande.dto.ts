import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LigneCommandeDto {
  @IsString() @IsNotEmpty() produitId: string;
  @IsInt() @Min(1) quantite: number;
  @IsString() @IsOptional() notes?: string;
}

export class CreateCommandeDto {
  @IsString() @IsOptional() tableReference?: string;
  @IsUUID() serveurId: string;
  @IsString() @IsOptional() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LigneCommandeDto) lignes: LigneCommandeDto[];
}

export class AjouterLignesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => LigneCommandeDto) lignes: LigneCommandeDto[];
}
