import { ConflictException } from '@nestjs/common';
import { makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { DrawsService, publicWinnerName } from './draws.service.js';

const dto = { contest: '5912', prizes: ['12345', '67890', '24680', '13579', '00042'] };

describe('DrawsService', () => {
  let prisma: PrismaMock & { raffleNumber: Record<string, ReturnType<typeof vi.fn>> };
  let service: DrawsService;

  beforeEach(() => {
    const base = makePrisma();
    prisma = Object.assign(base, {
      raffleNumber: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn() },
    });
    service = new DrawsService(prisma as never);
    prisma.raffle.findUnique.mockResolvedValue({ id: 'r1', status: 'CLOSED', totalNumbers: 10_000, title: 'Onix' });
  });

  it('nome público: primeiro nome e inicial do último', () => {
    expect(publicWinnerName('maria da silva souza')).toBe('maria S.');
    expect(publicWinnerName('Ana')).toBe('Ana');
  });

  it('só apura rifa com vendas encerradas e ainda sem resultado', async () => {
    prisma.raffle.findUnique.mockResolvedValueOnce({ id: 'r1', status: 'ACTIVE', totalNumbers: 100, title: 'x' });
    await expect(service.preview('r1', dto)).rejects.toThrow('Encerre as vendas');
    prisma.raffle.findUnique.mockResolvedValueOnce({ id: 'r1', status: 'DRAWN', totalNumbers: 100, title: 'x' });
    await expect(service.preview('r1', dto)).rejects.toThrow('já foi publicado');
  });

  it('prévia mostra o ganhador e o passo a passo sem gravar', async () => {
    prisma.raffleNumber.findMany.mockResolvedValue([{ number: 7890 }]);
    prisma.raffleNumber.findUnique.mockResolvedValue({
      orderId: 'o9',
      order: { user: { name: 'Maria Souza', phone: '11987654321', city: 'Campinas', state: 'SP' } },
    });
    const out = await service.preview('r1', dto);
    expect(out.winningLabel).toBe('7890');
    expect(out.steps.map((s) => s.outcome)).toEqual(['not-sold', 'winner', 'skipped', 'skipped', 'skipped']);
    expect(out.winner).toMatchObject({ orderId: 'o9', name: 'Maria Souza', phoneMasked: '(11) 9****-4321' });
    expect(prisma.raffle.updateMany).not.toHaveBeenCalled();
  });

  it('publica uma vez só e guarda o nome público do ganhador', async () => {
    prisma.raffleNumber.findMany.mockResolvedValue([{ number: 2345 }]);
    prisma.raffleNumber.findUnique.mockResolvedValue({
      orderId: 'o1',
      order: { user: { name: 'Maria Souza', phone: '11987654321', city: 'Campinas', state: 'SP' } },
    });
    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.confirm('r1', dto);
    expect(prisma.raffle.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'CLOSED' },
      data: expect.objectContaining({
        status: 'DRAWN',
        winningNumber: 2345,
        winnerOrderId: 'o1',
        winnerPublicName: 'Maria S. · Campinas/SP',
        lotteryPrizes: dto.prizes,
      }),
    });

    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.confirm('r1', dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('sem número vendido não publica', async () => {
    await expect(service.confirm('r1', dto)).rejects.toThrow('Nenhum número vendido');
  });
});
