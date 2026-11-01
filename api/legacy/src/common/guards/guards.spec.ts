import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { SESSION_COOKIE } from '../types/auth-user.js';
import { HttpThrottlerGuard } from './http-throttler.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

type Req = { cookies?: Record<string, string>; user?: unknown };

function ctx(req: Req, type: 'http' | 'ws' = 'http', meta: Record<string, unknown> = {}) {
  const handler = () => undefined;
  Object.entries(meta).forEach(([k, v]) => Reflect.defineMetadata(k, v, handler));
  return {
    getType: () => type,
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let prisma: PrismaMock;
  let jwt: { verifyAsync: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = { verifyAsync: vi.fn().mockResolvedValue({ sub: 'a1', role: 'ADMIN', v: 2 }) };
    guard = new JwtAuthGuard(new Reflector(), jwt as never, prisma as never);
    prisma.user.findUnique.mockResolvedValue({ id: 'a1', role: 'ADMIN', sessionVersion: 2 });
  });

  it('rota @Public passa sem cookie', async () => {
    await expect(guard.canActivate(ctx({}, 'http', { [IS_PUBLIC_KEY]: true }))).resolves.toBe(true);
  });

  it('WebSocket não passa por aqui (é validado no gateway)', async () => {
    await expect(guard.canActivate(ctx({}, 'ws'))).resolves.toBe(true);
  });

  it('sem cookie ou com token inválido é 401', async () => {
    await expect(guard.canActivate(ctx({ cookies: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
    jwt.verifyAsync.mockRejectedValueOnce(new Error('assinatura inválida'));
    await expect(guard.canActivate(ctx({ cookies: { [SESSION_COOKIE]: 'x' } }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('sessão derrubada (versão antiga), papel trocado ou usuário removido é 401', async () => {
    const req = () => ctx({ cookies: { [SESSION_COOKIE]: 't' } });
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'a1', role: 'ADMIN', sessionVersion: 3 });
    await expect(guard.canActivate(req())).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'a1', role: 'BUYER', sessionVersion: 2 });
    await expect(guard.canActivate(req())).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(guard.canActivate(req())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sessão válida coloca o usuário na requisição', async () => {
    const req: Req = { cookies: { [SESSION_COOKIE]: 't' } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'a1', role: 'ADMIN' });
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('sem @Roles, libera', () => {
    expect(guard.canActivate(ctx({}))).toBe(true);
  });

  it('com @Roles, exige o papel', () => {
    const meta = { [ROLES_KEY]: ['ADMIN'] };
    expect(guard.canActivate(ctx({ user: { id: 'a', role: 'ADMIN' } }, 'http', meta))).toBe(true);
    expect(() => guard.canActivate(ctx({ user: { id: 'b', role: 'BUYER' } }, 'http', meta))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx({}, 'http', meta))).toThrow(ForbiddenException);
  });
});

describe('HttpThrottlerGuard', () => {
  it('não limita mensagens de WebSocket', async () => {
    const guard = Object.create(HttpThrottlerGuard.prototype) as HttpThrottlerGuard;
    await expect(guard.canActivate(ctx({}, 'ws'))).resolves.toBe(true);
  });
});
