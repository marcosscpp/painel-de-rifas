import { UnauthorizedException } from '@nestjs/common';
import { makeCipher, makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { hashPassword } from '../../common/utils/password.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let prisma: PrismaMock;
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let service: AuthService;
  let hash: string;

  beforeAll(async () => {
    hash = await hashPassword('senha-correta-123');
  });

  beforeEach(() => {
    prisma = makePrisma();
    jwt = { signAsync: vi.fn().mockResolvedValue('token') };
    service = new AuthService(prisma as never, jwt as never, makeCipher());
  });

  const admin = (over: Record<string, unknown> = {}) => ({
    id: 'a1',
    name: 'Admin',
    email: 'admin@x.com',
    role: 'ADMIN',
    passwordHash: hash,
    sessionVersion: 3,
    ...over,
  });

  it('login certo devolve token com a versão da sessão e não expõe o hash', async () => {
    const cipher = makeCipher();
    prisma.user.findUnique.mockResolvedValue(admin({ email: cipher.encrypt('admin@x.com') }));
    const out = await service.login('admin@x.com', 'senha-correta-123');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { emailHash: cipher.index('email', 'admin@x.com') } });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'a1', role: 'ADMIN', v: 3 });
    expect(out).toEqual({ token: 'token', user: { id: 'a1', name: 'Admin', email: 'admin@x.com', role: 'ADMIN' } });
  });

  it('senha errada, e-mail inexistente e comprador recebem a mesma resposta', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(admin());
    const wrong = await service.login('admin@x.com', 'errada').catch((e: unknown) => e);

    prisma.user.findUnique.mockResolvedValueOnce(null);
    const missing = await service.login('nao@existe.com', 'qualquer').catch((e: unknown) => e);

    prisma.user.findUnique.mockResolvedValueOnce(admin({ role: 'BUYER' }));
    const buyer = await service.login('admin@x.com', 'senha-correta-123').catch((e: unknown) => e);

    for (const e of [wrong, missing, buyer]) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      expect((e as Error).message).toBe('E-mail ou senha inválidos');
    }
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('usuário sem senha (comprador) não faz login', async () => {
    prisma.user.findUnique.mockResolvedValue(admin({ passwordHash: null }));
    await expect(service.login('admin@x.com', 'senha-correta-123')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sair de todos incrementa a versão da sessão', async () => {
    await service.logoutEverywhere('a1');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});
