import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TypeTicketDto {
  JOURNALIER = 'JOURNALIER',
  ABONNEMENT_MENSUEL = 'ABONNEMENT_MENSUEL',
  ABONNEMENT_ANNUEL = 'ABONNEMENT_ANNUEL',
}

export class CreateTicketPiscineDto {
  @IsEnum(TypeTicketDto)
  type: TypeTicketDto;

  @IsNumber()
  @Min(0)
  prix: number;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  @IsOptional()
  dateFin?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  emplacementNumero?: string;
}

export class AccessoireCheckoutDto {
  @IsString()
  accessoireId: string;

  @IsEnum(['VENTE', 'LOCATION'])
  type: 'VENTE' | 'LOCATION';

  @IsInt()
  @Min(1)
  quantite: number;
}

export class CheckoutPiscineDto extends CreateTicketPiscineDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccessoireCheckoutDto)
  @IsOptional()
  accessoires?: AccessoireCheckoutDto[];
}
