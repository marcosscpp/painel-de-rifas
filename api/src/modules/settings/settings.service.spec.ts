import { makeConfig, makePrisma } from '../../../test/helpers/mocks.js';
import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  it('usa o ambiente como padrão e o que o admin salvou por cima', async () => {
    const prisma = makePrisma() as ReturnType<typeof makePrisma> & { setting: Record<string, ReturnType<typeof vi.fn>> };
    prisma.setting = { findUnique: vi.fn().mockResolvedValue({ value: { pixFeeCents: 149 } }), upsert: vi.fn() };
    const s = new SettingsService(prisma as never, makeConfig({ PIX_FEE_CENTS: 199, RESERVATION_MINUTES: 15, MIN_BUYER_AGE: 18 }) as never);
    expect(await s.get()).toMatchObject({ pixFeeCents: 149, reservationMinutes: 15, minBuyerAge: 18 });
  });

  it('atualizar não apaga o que não foi enviado', async () => {
    const prisma = makePrisma() as ReturnType<typeof makePrisma> & { setting: Record<string, ReturnType<typeof vi.fn>> };
    prisma.setting = { findUnique: vi.fn().mockResolvedValue({ value: { siteName: 'Minha Rifa' } }), upsert: vi.fn() };
    const s = new SettingsService(prisma as never, makeConfig({}) as never);
    const out = await s.update({ pixFeeCents: 99, instagramUrl: undefined });
    expect(out).toMatchObject({ siteName: 'Minha Rifa', pixFeeCents: 99, instagramUrl: '' });
    expect(prisma.setting.upsert.mock.calls[0][0].update.value.siteName).toBe('Minha Rifa');
  });
});
