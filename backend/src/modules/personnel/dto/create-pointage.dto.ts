import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum MethodePointageDto {
  BIOMETRIQUE = 'BIOMETRIQUE',
  MANUEL = 'MANUEL',
}

export class CreatePointageDto {
  @IsUUID()
  employeId: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  heureArrivee?: string;

  @IsString()
  @IsOptional()
  heureDepart?: string;

  @IsEnum(MethodePointageDto)
  @IsOptional()
  methode?: MethodePointageDto;
}

export class UpdatePointageDto {
  @IsString()
  @IsOptional()
  heureArrivee?: string;

  @IsString()
  @IsOptional()
  heureDepart?: string;
}
