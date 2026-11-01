import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request, Response } from 'express';
import type { JwtPayload } from '../../common/types/auth-user.js';
import { maskPhone } from '../../common/utils/br.js';
import type { User } from '../../generated/prisma/client.js';
import { type DecryptedUser, PiiCipher } from '../../infra/crypto/pii-cipher.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export const BUYER_COOKIE = 'rifas_buyer';

type BuyerUser = { id: string; role: string; name: string; socialName: string | null; phone: string | null; sessionVersion: number };

// Sessão do comprador, sem senha: depois da primeira compra (ou de "Já comprei antes" com
// celular + CPF) o site lembra a pessoa por um cookie httpOnly separado do cookie do admin.
@Injectable()
export class BuyerSessionService {
  private readonly cookie: CookieOptions;
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly cipher: PiiCipher,
    config: ConfigService,
  ) {
    this.ttlSeconds = (config.get<number>('BUYER_SESSION_DAYS') ?? 90) * 86_400;
    this.cookie = {
      httpOnly: true,
      secure: config.get('NODE_ENV') === 'production',
      sameSite: 'lax', // volta do link compartilhado no WhatsApp já reconhece a pessoa
      path: '/api',
      maxAge: this.ttlSeconds * 1000,
    };
  }

  async issue(res: Response, user: Pick<BuyerUser, 'id' | 'sessionVersion'>) {
    const payload: JwtPayload = { sub: user.id, role: 'BUYER', v: user.sessionVersion };
    res.cookie(BUYER_COOKIE, await this.jwt.signAsync(payload, { expiresIn: this.ttlSeconds }), this.cookie);
  }

  clear(res: Response) {
    const { maxAge: _maxAge, ...opts } = this.cookie;
    res.clearCookie(BUYER_COOKIE, opts);
  }

  // Comprador da sessão, ou null se não houver/expirou/foi derrubada.
  async read(req: Request): Promise<DecryptedUser<User> | null> {
    const token = req.cookies?.[BUYER_COOKIE] as string | undefined;
    if (!token) return null;
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
    if (payload.role !== 'BUYER') return null;
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== 'BUYER' || user.sessionVersion !== payload.v) return null;
    return this.cipher.decryptUser(user);
  }

  // O que a tela pode mostrar: primeiro nome e celular mascarado.
  publicProfile(user: Pick<BuyerUser, 'name' | 'socialName' | 'phone'>) {
    return {
      name: (user.socialName || user.name).split(' ')[0],
      phone: user.phone ? maskPhone(user.phone) : null,
    };
  }

  // "Meus dados": tudo que a pessoa cadastrou, com CPF e celular mascarados.
  fullProfile(user: DecryptedUser<User>) {
    return {
      name: user.name,
      socialName: user.socialName,
      firstName: (user.socialName || user.name).split(' ')[0],
      email: user.email,
      phone: user.phone ? maskPhone(user.phone) : null,
      cpf: user.cpf ? `${user.cpf.slice(0, 3)}.***.***-**` : null,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
      address: user.zipCode
        ? {
            zipCode: user.zipCode,
            street: user.street,
            number: user.streetNumber,
            district: user.district,
            city: user.city,
            state: user.state,
            complement: user.complement,
            reference: user.reference,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
