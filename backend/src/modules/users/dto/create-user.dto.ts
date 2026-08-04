import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  nom: string;

  @IsNotEmpty()
  prenom: string;

  @IsOptional()
  telephone?: string;

  @IsUUID()
  roleId: string;
}
