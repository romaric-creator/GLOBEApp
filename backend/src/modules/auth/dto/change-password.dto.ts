import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  ancienMotDePasse: string;

  @IsNotEmpty()
  @MinLength(6)
  nouveauMotDePasse: string;
}
