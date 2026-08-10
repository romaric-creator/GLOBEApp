import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PersonnelService } from './personnel.service';
import { CreateEmployeDto, UpdateEmployeDto } from './dto/create-employe.dto';
import {
  CreatePointageDto,
  UpdatePointageDto,
} from './dto/create-pointage.dto';
import { CreateCongeDto } from './dto/create-conge.dto';

@Controller('personnel')
@UseGuards(JwtAuthGuard)
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  // Employes
  @Get('employes')
  findAllEmployes() {
    return this.personnelService.findAllEmployes();
  }

  @Get('employes/:id')
  findOneEmploye(@Param('id') id: string) {
    return this.personnelService.findOneEmploye(id);
  }

  @Post('employes')
  createEmploye(@Body() dto: CreateEmployeDto) {
    return this.personnelService.createEmploye(dto);
  }

  @Patch('employes/:id')
  updateEmploye(@Param('id') id: string, @Body() dto: UpdateEmployeDto) {
    return this.personnelService.updateEmploye(id, dto);
  }

  @Patch('employes/:id/toggle')
  toggleEmploye(@Param('id') id: string) {
    return this.personnelService.toggleEmploye(id);
  }

  // Pointages
  @Get('pointages')
  findPointages(
    @Query('date') date?: string,
    @Query('employeId') employeId?: string,
  ) {
    return this.personnelService.findPointages(
      date || undefined,
      employeId || undefined,
    );
  }

  @Get('pointages/presences')
  getPresencesJour() {
    return this.personnelService.getPresencesJour();
  }

  @Post('pointages')
  createPointage(@Body() dto: CreatePointageDto) {
    return this.personnelService.createPointage(dto);
  }

  @Patch('pointages/:id')
  updatePointage(@Param('id') id: string, @Body() dto: UpdatePointageDto) {
    return this.personnelService.updatePointage(id, dto);
  }

  // Conges
  @Get('conges')
  findConges(
    @Query('employeId') employeId?: string,
    @Query('statut') statut?: string,
  ) {
    return this.personnelService.findConges(
      employeId || undefined,
      statut || undefined,
    );
  }

  @Post('conges')
  createConge(@Body() dto: CreateCongeDto) {
    return this.personnelService.createConge(dto);
  }

  @Patch('conges/:id/approuver')
  approuverConge(@Param('id') id: string) {
    return this.personnelService.approuverConge(id);
  }

  @Patch('conges/:id/refuser')
  refuserConge(@Param('id') id: string) {
    return this.personnelService.refuserConge(id);
  }
}
