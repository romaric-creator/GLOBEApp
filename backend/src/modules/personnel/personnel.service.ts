import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeDto, UpdateEmployeDto } from './dto/create-employe.dto';
import {
  CreatePointageDto,
  UpdatePointageDto,
} from './dto/create-pointage.dto';
import { CreateCongeDto } from './dto/create-conge.dto';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // Employes
  // ========================

  async findAllEmployes() {
    return this.prisma.employe.findMany({
      orderBy: { nom: 'asc' },
      include: { user: { select: { email: true } } },
    });
  }

  async findOneEmploye(id: string) {
    const employe = await this.prisma.employe.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!employe) throw new NotFoundException('Employe introuvable');
    return employe;
  }

  async createEmploye(dto: CreateEmployeDto) {
    const existing = await this.prisma.employe.findUnique({
      where: { matricule: dto.matricule },
    });
    if (existing) throw new ConflictException('Matricule deja utilise');

    return this.prisma.employe.create({
      data: {
        matricule: dto.matricule,
        nom: dto.nom,
        prenom: dto.prenom,
        poste: dto.poste,
        salaire: dto.salaire,
        typeContrat: dto.typeContrat,
        userId: dto.userId || null,
      },
    });
  }

  async updateEmploye(id: string, dto: UpdateEmployeDto) {
    await this.findOneEmploye(id);
    return this.prisma.employe.update({
      where: { id },
      data: dto,
    });
  }

  async toggleEmploye(id: string) {
    const employe = await this.findOneEmploye(id);
    return this.prisma.employe.update({
      where: { id },
      data: { actif: !employe.actif },
    });
  }

  // ========================
  // Pointages
  // ========================

  async findPointages(date?: string, employeId?: string) {
    const where: Record<string, unknown> = {};
    if (date) where.date = new Date(date);
    if (employeId) where.employeId = employeId;

    return this.prisma.pointage.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employe: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
  }

  async createPointage(dto: CreatePointageDto) {
    const employe = await this.prisma.employe.findUnique({
      where: { id: dto.employeId },
    });
    if (!employe) throw new NotFoundException('Employe introuvable');

    const existing = await this.prisma.pointage.findFirst({
      where: { employeId: dto.employeId, date: new Date(dto.date) },
    });
    if (existing)
      throw new ConflictException('Pointage deja enregistre pour cette date');

    return this.prisma.pointage.create({
      data: {
        date: new Date(dto.date),
        heureArrivee: dto.heureArrivee
          ? new Date(`1970-01-01T${dto.heureArrivee}:00`)
          : null,
        heureDepart: dto.heureDepart
          ? new Date(`1970-01-01T${dto.heureDepart}:00`)
          : null,
        methode: dto.methode || 'MANUEL',
        employeId: dto.employeId,
      },
      include: {
        employe: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
  }

  async updatePointage(id: string, dto: UpdatePointageDto) {
    const pointage = await this.prisma.pointage.findUnique({ where: { id } });
    if (!pointage) throw new NotFoundException('Pointage introuvable');

    const data: Record<string, unknown> = {};
    if (dto.heureArrivee)
      data.heureArrivee = new Date(`1970-01-01T${dto.heureArrivee}:00`);
    if (dto.heureDepart)
      data.heureDepart = new Date(`1970-01-01T${dto.heureDepart}:00`);

    return this.prisma.pointage.update({
      where: { id },
      data,
      include: {
        employe: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
  }

  async getPresencesJour() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employes = await this.prisma.employe.findMany({
      where: { actif: true },
      select: { id: true, nom: true, prenom: true, matricule: true },
    });

    const pointages = await this.prisma.pointage.findMany({
      where: { date: today },
      select: { employeId: true, heureArrivee: true, heureDepart: true },
    });

    const pointageMap = new Map(pointages.map((p) => [p.employeId, p]));

    return employes.map((emp) => ({
      ...emp,
      present: pointageMap.has(emp.id),
      heureArrivee: pointageMap.get(emp.id)?.heureArrivee || null,
      heureDepart: pointageMap.get(emp.id)?.heureDepart || null,
    }));
  }

  // ========================
  // Conges
  // ========================

  async findConges(employeId?: string, statut?: string) {
    const where: Record<string, unknown> = {};
    if (employeId) where.employeId = employeId;
    if (statut) where.statut = statut;

    return this.prisma.conge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employe: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
  }

  async createConge(dto: CreateCongeDto) {
    const employe = await this.prisma.employe.findUnique({
      where: { id: dto.employeId },
    });
    if (!employe) throw new NotFoundException('Employe introuvable');

    const debut = new Date(dto.dateDebut);
    const fin = new Date(dto.dateFin);
    if (fin <= debut)
      throw new BadRequestException(
        'La date de fin doit etre apres la date de debut',
      );

    return this.prisma.conge.create({
      data: {
        type: dto.type,
        dateDebut: debut,
        dateFin: fin,
        motif: dto.motif || null,
        employeId: dto.employeId,
      },
      include: {
        employe: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
  }

  async approuverConge(id: string) {
    const conge = await this.prisma.conge.findUnique({ where: { id } });
    if (!conge) throw new NotFoundException('Conge introuvable');
    if (conge.statut !== 'EN_ATTENTE')
      throw new BadRequestException('Ce conge ne peut plus etre modifie');

    return this.prisma.conge.update({
      where: { id },
      data: { statut: 'APPROUVE' },
      include: { employe: { select: { nom: true, prenom: true } } },
    });
  }

  async refuserConge(id: string) {
    const conge = await this.prisma.conge.findUnique({ where: { id } });
    if (!conge) throw new NotFoundException('Conge introuvable');
    if (conge.statut !== 'EN_ATTENTE')
      throw new BadRequestException('Ce conge ne peut plus etre modifie');

    return this.prisma.conge.update({
      where: { id },
      data: { statut: 'REFUSE' },
      include: { employe: { select: { nom: true, prenom: true } } },
    });
  }
}
