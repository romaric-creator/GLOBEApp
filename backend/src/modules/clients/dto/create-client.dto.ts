import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TypeClient, TypeDocument } from '@prisma/client';

export class CreateClientDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  raisonSociale?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsEnum(TypeClient)
  type?: TypeClient;

  // Informations légales (fiche de police)
  @IsOptional()
  @IsEnum(TypeDocument)
  typeDocument?: TypeDocument;

  @IsOptional()
  @IsString()
  numeroDocument?: string;

  @IsOptional()
  @IsString()
  nationalite?: string;

  @IsOptional()
  @IsString()
  paysProvenance?: string;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
