import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly MAX_TENTATIVES = 5;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.actif) {
      throw new UnauthorizedException('Compte desactive');
    }

    if (user.tentativesEchouees >= this.MAX_TENTATIVES) {
      throw new UnauthorizedException(
        'Compte verrouille. Contactez un administrateur',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tentativesEchouees: { increment: 1 } },
      });

      await this.logConnexion(user.id, 'ECHEC', ip, userAgent);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { tentativesEchouees: 0, dernierLogin: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role.nom,
    );

    await this.prisma.session.create({
      data: {
        userId: user.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.logConnexion(user.id, 'LOGIN', ip, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role.nom,
        permissions: user.role.permissions.map((rp) => ({
          module: rp.permission.module,
          action: rp.permission.action,
        })),
      },
      ...tokens,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est deja utilise');
    }

    const employeRole = await this.prisma.role.findFirst({
      where: { nom: 'employe' },
    });

    if (!employeRole) {
      throw new BadRequestException('Role employe non configure');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
        roleId: employeRole.id,
      },
      include: { role: true },
    });

    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role.nom,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const passwordValid = await bcrypt.compare(
      dto.ancienMotDePasse,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.nouveauMotDePasse, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Mot de passe modifie avec succes' };
  }

  async refreshToken(refreshToken: string) {
    const session = await this.prisma.session.findFirst({
      where: { refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expiree');
    }

    if (!session.user.actif) {
      await this.prisma.session.deleteMany({
        where: { userId: session.user.id },
      });
      throw new UnauthorizedException('Compte desactive');
    }

    const tokens = await this.generateTokens(
      session.user.id,
      session.user.email,
      session.user.role.nom,
    );

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.logConnexion(session.user.id, 'REFRESH', undefined, undefined);

    return tokens;
  }

  async logout(userId: string, accessToken: string) {
    await this.prisma.session.deleteMany({
      where: { userId, accessToken },
    });

    await this.logConnexion(userId, 'LOGOUT', undefined, undefined);

    return { message: 'Deconnexion reussie' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      role: user.role.nom,
      permissions: user.role.permissions.map((rp) => ({
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async logConnexion(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'ECHEC' | 'REFRESH',
    ip?: string,
    device?: string,
  ) {
    await this.prisma.logConnexion.create({
      data: { userId, action, ip, device },
    });
  }
}
