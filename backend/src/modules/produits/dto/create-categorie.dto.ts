import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
