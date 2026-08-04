import { IsOptional, IsEmail, IsUUID, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  nom?: string;

  @IsOptional()
  prenom?: string;

  @IsOptional()
  telephone?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
