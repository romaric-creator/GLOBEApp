import { IsEnum } from 'class-validator';

export enum TypeSauvegarde {
  COMPLETE = 'COMPLETE',
  INCREMENTALE = 'INCREMENTALE',
}

export class CreateSauvegardeDto {
  @IsEnum(TypeSauvegarde)
  type: TypeSauvegarde;
}
