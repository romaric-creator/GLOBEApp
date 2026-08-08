import { IsOptional, IsString } from 'class-validator';

export class QueryReservationDto {
  @IsString()
  @IsOptional()
  statut?: string;
}
