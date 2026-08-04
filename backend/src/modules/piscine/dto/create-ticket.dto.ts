import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

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
}
