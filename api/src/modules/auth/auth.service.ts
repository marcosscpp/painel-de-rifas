import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../../common/types/auth-user.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.js';
import { PiiCipher } from '../../infra/crypto/pii-cipher.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class AuthService {
  // Hash falso para gastar o mesmo tempo quando o e-mail não existe (evita enumerar contas).
  private readonly dummyHash = hashPassword('senha-inexistente');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cipher: PiiCipher,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { emailHash: this.cipher.index('email', email) } });

    const hash = user?.passwordHash ?? (await this.dummyHash);
    const ok = await verifyPassword(hash, password);

    if (!user || !user.passwordHash || !ok || user.role !== 'ADMIN') {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const payload: JwtPayload = { sub: user.id, role: user.role, v: user.sessionVersion };
    const token = await this.jwt.signAsync(payload);
    return { token, user: this.toPublic(user) };
  }

  async me(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return this.toPublic(user);
  }

  // Encerra todas as sessões do usuário, em qualquer dispositivo.
  async logoutEverywhere(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { sessionVersion: { increment: 1 } },
    });
  }

  private toPublic(u: { id: string; name: string; email: string | null; role: string }) {
    return { id: u.id, name: u.name, email: this.cipher.decrypt(u.email), role: u.role };
  }
}
