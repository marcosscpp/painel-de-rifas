import { ConflictException } from '@nestjs/common';
import { makeCipher, makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { DrawsService, publicWinnerName } from './draws.service.js';

const dto = { contest: '5912', prizes: ['12345', '67890', '24680', '13579', '00042'] };

describe('DrawsService', () => {
  let prisma: PrismaMock & { raffleNumber: Record<string, ReturnType<typeof vi.fn>> };
  let service: DrawsService;

  beforeEach(() => {
    const base = makePrisma();
    prisma = Object.assign(base, {
      raffleNumber: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
    });
    service = new DrawsService(prisma as never, makeCipher());
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

  it('nenhum prêmio vendido: publica sem ganhador', async () => {
    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    const out = await service.confirm('r1', dto);
    expect(out).toMatchObject({ winningNumber: null, method: 'none', winner: null });
    expect(prisma.raffle.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'CLOSED' },
      data: expect.objectContaining({ status: 'DRAWN', winningNumber: null, winnerOrderId: null, winnerPublicName: null }),
    });
  });

  describe('resultado na Caixa', () => {
    const stub = (status: number, body: unknown) =>
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })));
    afterEach(() => vi.unstubAllGlobals());

    it('devolve os 5 prêmios do concurso', async () => {
      stub(200, { numero: 6112, dataApuracao: '24/10/2026', listaDezenas: ['064383', '047006', '015140', '034147', '009305'] });
      await expect(service.federalResult('6112')).resolves.toEqual({
        contest: '6112',
        date: '2026-10-24',
        prizes: ['64383', '47006', '15140', '34147', '09305'],
      });
    });

    it('concurso ainda não sorteado: 404', async () => {
      stub(500, { exceptionMessage: '{"Content":{},"StatusCode":404,"ReasonPhrase":""}' });
      await expect(service.federalResult('6200')).rejects.toThrow('não encontrado');
    });

    it('Caixa fora do ar ou resposta estranha: pede para digitar à mão', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
      await expect(service.federalResult('6112')).rejects.toThrow('à mão');
      stub(503, 'erro');
      await expect(service.federalResult('6112')).rejects.toThrow('à mão');
      stub(200, '<html>');
      await expect(service.federalResult('6112')).rejects.toThrow('à mão');
    });
  });
});
