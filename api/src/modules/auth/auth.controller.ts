import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { type AuthUser, SESSION_COOKIE } from '../../common/types/auth-user.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  private readonly cookie: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    // Token só em cookie httpOnly: JavaScript da página nunca enxerga (protege contra XSS).
    this.cookie = {
      httpOnly: true,
      secure: config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api',
      maxAge: config.getOrThrow<number>('SESSION_TTL_MINUTES') * 60_000,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 tentativas por minuto por IP
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    res.cookie(SESSION_COOKIE, token, this.cookie);
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _maxAge, ...opts } = this.cookie;
    res.clearCookie(SESSION_COOKIE, opts);
  }

  @Post('logout-all')
  @HttpCode(204)
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutEverywhere(user.id);
    this.logout(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
