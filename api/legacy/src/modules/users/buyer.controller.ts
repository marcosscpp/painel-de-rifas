import { Body, Controller, Get, Header, HttpCode, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { BuyerSessionService } from './buyer-session.service.js';
import { BuyerDto, BuyerLookupDto, UpdateProfileDto } from './dto/buyer.dto.js';
import { UsersService } from './users.service.js';

@Public()
@Controller('buyer')
export class BuyerController {
  constructor(
    private readonly users: UsersService,
    private readonly session: BuyerSessionService,
  ) {}

  // Quem está comprando neste navegador (ou null). Nunca 401, para não sujar o console.
  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@Req() req: Request) {
    const user = await this.session.read(req);
    return { buyer: user ? this.session.publicProfile(user) : null };
  }

  // "Já comprei antes": celular + CPF do mesmo cadastro. Limite baixo contra tentativa e erro.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('lookup')
  @HttpCode(200)
  async lookup(@Body() dto: BuyerLookupDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.users.findBuyer(dto.phone, dto.cpf);
    await this.session.issue(res, user);
    return { buyer: this.session.publicProfile(user) };
  }

  // Tela "Cadastrar" (fora do checkout): cria a conta e já entra.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: BuyerDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.users.registerBuyer(dto);
    await this.session.issue(res, user);
    return { buyer: this.session.publicProfile(user) };
  }

  // "Meus dados"
  @Get('profile')
  @Header('Cache-Control', 'no-store')
  async profile(@Req() req: Request) {
    return { profile: this.session.fullProfile(await requireBuyer(this.session, req)) };
  }

  @Patch('profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = await requireBuyer(this.session, req);
    return { profile: this.session.fullProfile(await this.users.updateProfile(user.id, dto)) };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    this.session.clear(res);
  }
}

// Usado por outros controllers que exigem comprador identificado.
export async function requireBuyer(session: BuyerSessionService, req: Request) {
  const user = await session.read(req);
  if (!user) throw new UnauthorizedException('Identifique-se com celular e CPF');
  return user;
}
