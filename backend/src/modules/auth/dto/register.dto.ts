import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
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
}
