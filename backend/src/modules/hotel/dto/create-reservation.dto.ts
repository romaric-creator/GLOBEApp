import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { TypeDocument, TypeReservation } from '@prisma/client';

export class CreateReservationDto {
  @IsUUID()
  chambreId: string;

  @IsUUID()
  clientId: string;

  @IsDateString()
  dateArrivee: string;

  // Calculé automatiquement pour NUIT (lendemain 12h) et SIESTE_PROLONGEE (arrivée+8h)
  @IsDateString()
  @IsOptional()
  dateDepart?: string;

  @IsOptional()
  @IsEnum(TypeReservation)
  typeReservation?: TypeReservation;

  // Format "HH:mm" — obligatoire pour sieste/journée
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'heureArrivee doit être au format HH:mm',
  })
  heureArrivee?: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'heureDepart doit être au format HH:mm',
  })
  heureDepart?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  nbNuits?: number;

  @IsInt()
  @Min(1)
  nbPersonnes: number;

  @IsString()
  @IsOptional()
  notes?: string;

  // Informations légales du client (fiche de police hôtelière)
  @IsOptional()
  @IsEnum(TypeDocument)
  typeDocumentClient?: TypeDocument;

  @IsOptional()
  @IsString()
  numeroDocumentClient?: string;

  @IsOptional()
  @IsString()
  nationaliteClient?: string;
}
