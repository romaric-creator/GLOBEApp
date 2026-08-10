import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  numero: number;

  @IsInt()
  @Min(1)
  capacite: number;

  @IsString()
  @IsOptional()
  zone?: string;
}

export class UpdateTableDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  capacite?: number;

  @IsString()
  @IsOptional()
  zone?: string;
}
