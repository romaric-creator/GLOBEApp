import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        actif: true,
        dernierLogin: true,
        createdAt: true,
        role: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        actif: true,
        tentativesEchouees: true,
        dernierLogin: true,
        createdAt: true,
        role: { select: { id: true, nom: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est deja utilise');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: { select: { id: true, nom: true } },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        actif: true,
        role: { select: { id: true, nom: true } },
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { actif: false },
    });
  }

  async unlock(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { tentativesEchouees: 0 },
    });
  }
}
