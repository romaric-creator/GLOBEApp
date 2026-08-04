import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { TypeClient } from '@prisma/client';

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
}
