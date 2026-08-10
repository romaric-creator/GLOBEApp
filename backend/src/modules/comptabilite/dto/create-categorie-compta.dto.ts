import { IsString, IsEnum } from 'class-validator';

export enum TypeCategorieCompta {
  RECETTE = 'RECETTE',
  DEPENSE = 'DEPENSE',
  TRANSFERT = 'TRANSFERT',
}

export class CreateCategorieComptaDto {
  @IsString()
  nom: string;

  @IsEnum(TypeCategorieCompta)
  type: TypeCategorieCompta;
}
