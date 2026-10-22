import { makeCipher, makeConfig, makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { BUYER_COOKIE, BuyerSessionService } from './buyer-session.service.js';

describe('BuyerSessionService', () => {
  let prisma: PrismaMock;
  let jwt: { signAsync: ReturnType<typeof vi.fn>; verifyAsync: ReturnType<typeof vi.fn> };
  let session: BuyerSessionService;
  const user = { id: 'u1', role: 'BUYER', name: 'Maria Souza', socialName: null, phone: '11987654321', sessionVersion: 2 };

  beforeEach(() => {
    prisma = makePrisma();
    jwt = { signAsync: vi.fn().mockResolvedValue('tok'), verifyAsync: vi.fn().mockResolvedValue({ sub: 'u1', role: 'BUYER', v: 2 }) };
    session = new BuyerSessionService(jwt as never, prisma as never, makeCipher(), makeConfig({ NODE_ENV: 'production', BUYER_SESSION_DAYS: 90 }) as never);
    prisma.user.findUnique.mockResolvedValue(user);
  });

  it('emite cookie httpOnly, seguro, com validade de 90 dias e só para /api', async () => {
    const res = { cookie: vi.fn() };
    await session.issue(res as never, user);
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', role: 'BUYER', v: 2 }, { expiresIn: 90 * 86_400 });
    expect(res.cookie).toHaveBeenCalledWith(
      BUYER_COOKIE,
      'tok',
      expect.objectContaining({ httpOnly: true, secure: true, path: '/api', maxAge: 90 * 86_400_000 }),
    );
  });

  it('lê o comprador do cookie', async () => {
    await expect(session.read({ cookies: { [BUYER_COOKIE]: 'tok' } } as never)).resolves.toMatchObject({ id: 'u1' });
  });

  it('sem cookie, token inválido, token de admin ou sessão derrubada: ninguém', async () => {
    await expect(session.read({ cookies: {} } as never)).resolves.toBeNull();

    jwt.verifyAsync.mockRejectedValueOnce(new Error('expirado'));
    await expect(session.read({ cookies: { [BUYER_COOKIE]: 'x' } } as never)).resolves.toBeNull();

    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'a1', role: 'ADMIN', v: 0 });
    await expect(session.read({ cookies: { [BUYER_COOKIE]: 'x' } } as never)).resolves.toBeNull();

    prisma.user.findUnique.mockResolvedValueOnce({ ...user, sessionVersion: 3 });
    await expect(session.read({ cookies: { [BUYER_COOKIE]: 'x' } } as never)).resolves.toBeNull();
  });

  it('perfil público mostra só o primeiro nome (ou nome social) e celular mascarado', () => {
    expect(session.publicProfile(user)).toEqual({ name: 'Maria', phone: '(11) 9****-4321' });
    expect(session.publicProfile({ ...user, socialName: 'Mari Souza' }).name).toBe('Mari');
  });
});
