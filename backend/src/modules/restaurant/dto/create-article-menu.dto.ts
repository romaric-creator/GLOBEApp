import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export enum CategorieArticle {
  BOISSON = 'BOISSON',
  PLAT = 'PLAT',
  DESSERT = 'DESSERT',
  AUTRE = 'AUTRE',
}

export class CreateArticleMenuDto {
  @IsString()
  nom: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CategorieArticle)
  @IsOptional()
  categorie?: CategorieArticle;

  @IsNumber()
  @Min(0)
  prix: number;
}
