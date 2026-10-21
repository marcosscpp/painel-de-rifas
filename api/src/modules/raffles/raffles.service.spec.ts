import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { makePrisma, type PrismaMock, sqlOf } from '../../../test/helpers/mocks.js';
import type { CreateRaffleDto } from './dto/raffle.dto.js';
import { RafflesService } from './raffles.service.js';

const draft = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  slug: 'onix',
  title: 'Onix',
  status: 'DRAFT',
  saleMode: 'BOTH',
  totalNumbers: 1000,
  priceCents: 199,
  minPerOrder: 1,
  maxPerOrder: 50,
  startsAt: null,
  endsAt: null,
  drawDate: null,
  coverKey: 'raffles/r1/capa',
  packages: [],
  prizes: [{ id: 'p1', images: [{ key: 'raffles/r1/prizes/p1/f1' }] }],
  ...over,
});

const createDto = (over: Partial<CreateRaffleDto> = {}): CreateRaffleDto => ({
  title: 'Rifa do Onix',
  description: 'desc',
  saleMode: 'BOTH',
  totalNumbers: 500,
  priceCents: 199,
  ...over,
});

describe('RafflesService', () => {
  let prisma: PrismaMock;
  let uploads: { saveImage: ReturnType<typeof vi.fn>; deleteImages: ReturnType<typeof vi.fn> };
  let service: RafflesService;

  beforeEach(() => {
    prisma = makePrisma();
    uploads = { saveImage: vi.fn().mockResolvedValue('raffles/r1/nova'), deleteImages: vi.fn() };
    service = new RafflesService(prisma as never, uploads as never);
    prisma.raffle.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(where.id ? draft() : null),
    );
  });

  describe('create', () => {
    it('gera o slug a partir do título e usa padrões de limite por pedido', async () => {
      await service.create(createDto());
      expect(prisma.raffle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'rifa-do-onix', minPerOrder: 1, maxPerOrder: 500, rules: '' }),
        }),
      );
    });

    it('máximo padrão é 1000 em rifas grandes', async () => {
      await service.create(createDto({ totalNumbers: 100_000 }));
      expect(prisma.raffle.create.mock.calls[0][0].data.maxPerOrder).toBe(1000);
    });

    it('slug repetido ganha sufixo', async () => {
      prisma.raffle.findUnique.mockImplementation(({ where }: { where: { slug?: string } }) =>
        Promise.resolve(where.slug === 'rifa-do-onix' || where.slug === 'rifa-do-onix-2' ? { id: 'outra' } : null),
      );
      await service.create(createDto());
      expect(prisma.raffle.create.mock.calls[0][0].data.slug).toBe('rifa-do-onix-3');
    });

    it('recusa mínimo maior que máximo e máximo maior que o total', async () => {
      await expect(service.create(createDto({ minPerOrder: 10, maxPerOrder: 5 }))).rejects.toThrow('Mínimo');
      await expect(service.create(createDto({ maxPerOrder: 600 }))).rejects.toThrow('Máximo');
      expect(prisma.raffle.create).not.toHaveBeenCalled();
    });

    it('converte datas ISO em Date', async () => {
      await service.create(createDto({ drawDate: '2026-12-24T20:00:00.000Z', endsAt: null }));
      const data = prisma.raffle.create.mock.calls[0][0].data;
      expect(data.drawDate).toEqual(new Date('2026-12-24T20:00:00.000Z'));
      expect(data.endsAt).toBeNull();
    });
  });

  describe('update', () => {
    it('rascunho pode mudar tudo', async () => {
      await service.update('r1', { priceCents: 500, totalNumbers: 2000 });
      expect(prisma.raffle.update).toHaveBeenCalled();
    });

    it('publicada não muda preço, total, modo de venda nem slug', async () => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ status: 'ACTIVE' }));
      await expect(service.update('r1', { priceCents: 500 })).rejects.toThrow('priceCents');
      await expect(service.update('r1', { saleMode: 'PICK' })).rejects.toThrow('saleMode');
      await expect(service.update('r1', { slug: 'outro' })).rejects.toThrow('slug');
      expect(prisma.raffle.update).not.toHaveBeenCalled();
    });

    it('publicada aceita reenviar os mesmos valores travados junto com texto novo', async () => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ status: 'ACTIVE' }));
      await service.update('r1', { title: 'Novo título', priceCents: 199, slug: 'onix' });
      expect(prisma.raffle.update).toHaveBeenCalled();
    });

    it.each(['CLOSED', 'DRAWN'])('rifa %s não é editada', async (status) => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ status }));
      await expect(service.update('r1', { title: 'x' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('valida limites contra os valores atuais', async () => {
      await expect(service.update('r1', { maxPerOrder: 2000 })).rejects.toThrow('Máximo');
    });

    it('rifa inexistente é 404', async () => {
      prisma.raffle.findUnique.mockResolvedValue(null);
      await expect(service.update('x', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('apaga o rascunho e as imagens dele', async () => {
      await service.remove('r1');
      expect(prisma.raffle.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
      expect(uploads.deleteImages).toHaveBeenCalledWith(['raffles/r1/capa', 'raffles/r1/prizes/p1/f1']);
    });

    it('rifa publicada não é apagada', async () => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ status: 'ACTIVE' }));
      await expect(service.remove('r1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.raffle.delete).not.toHaveBeenCalled();
    });
  });

  describe('setPackages', () => {
    it('substitui os pacotes mantendo a ordem enviada', async () => {
      await service.setPackages('r1', { items: [{ quantity: 10 }, { quantity: 50, highlighted: true }] });
      expect(prisma.rafflePackage.deleteMany).toHaveBeenCalledWith({ where: { raffleId: 'r1' } });
      expect(prisma.rafflePackage.createMany).toHaveBeenCalledWith({
        data: [
          { raffleId: 'r1', quantity: 10, highlighted: false, position: 0 },
          { raffleId: 'r1', quantity: 50, highlighted: true, position: 1 },
        ],
      });
    });

    it('recusa quantidade repetida e fora do limite por pedido', async () => {
      await expect(service.setPackages('r1', { items: [{ quantity: 10 }, { quantity: 10 }] })).rejects.toThrow('repetida');
      await expect(service.setPackages('r1', { items: [{ quantity: 100 }] })).rejects.toThrow('fora do limite');
    });
  });

  describe('setCover', () => {
    it('grava a nova capa e apaga a antiga', async () => {
      await service.setCover('r1', { buffer: Buffer.from('x'), mimetype: 'image/png', size: 1 });
      expect(prisma.raffle.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { coverKey: 'raffles/r1/nova' } });
      expect(uploads.deleteImages).toHaveBeenCalledWith(['raffles/r1/capa']);
    });

    it('rifa sorteada não troca capa', async () => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ status: 'DRAWN' }));
      await expect(service.setCover('r1', undefined)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('transition', () => {
    it('recusa transição inválida', async () => {
      await expect(service.transition('r1', 'pause')).rejects.toThrow('Não é possível');
    });

    it('pausa só se o status ainda for o lido (duas abas clicando juntas)', async () => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ status: 'ACTIVE' }));
      prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.transition('r1', 'pause');
      expect(prisma.raffle.updateMany).toHaveBeenCalledWith({
        where: { id: 'r1', status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });

      prisma.raffle.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.transition('r1', 'pause')).rejects.toThrow('recarregue');
    });

    it('publicar sem capa e sem prêmio lista o que falta', async () => {
      prisma.raffle.findUnique.mockResolvedValue(draft({ coverKey: null, prizes: [] }));
      const err = await service.transition('r1', 'publish').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        message: ['Envie a imagem de capa', 'Cadastre pelo menos um prêmio'],
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('publicar ativa a rifa e gera os números 0..total-1 na mesma transação', async () => {
      prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.transition('r1', 'publish');
      expect(prisma.raffle.updateMany).toHaveBeenCalledWith({
        where: { id: 'r1', status: 'DRAFT' },
        data: { status: 'ACTIVE', publishedAt: expect.any(Date) },
      });
      const call = prisma.$executeRaw.mock.calls[0];
      expect(sqlOf(call)).toContain('generate_series(0, ?)');
      expect(call).toContain(999);
    });

    it('publicação concorrente: a segunda não gera números de novo', async () => {
      prisma.raffle.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.transition('r1', 'publish')).rejects.toThrow('já foi publicada');
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('leitura pública', () => {
    it('rascunho não aparece pelo slug', async () => {
      prisma.raffle.findFirst.mockResolvedValue(null);
      await expect(service.getPublic('onix')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.raffle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'onix', status: { not: 'DRAFT' } } }),
      );
    });

    it('lista à venda primeiro, depois pausadas, encerradas e sorteadas', async () => {
      prisma.raffle.findMany.mockResolvedValue([
        { slug: 'a', status: 'DRAWN' },
        { slug: 'b', status: 'ACTIVE' },
        { slug: 'c', status: 'CLOSED' },
        { slug: 'd', status: 'PAUSED' },
      ]);
      const out = await service.listPublic();
      expect(out.map((r) => r.slug)).toEqual(['b', 'd', 'c', 'a']);
    });

    it('grade: codifica status e limita a faixa ao total de números', async () => {
      prisma.raffle.findFirst.mockResolvedValue({ id: 'r1', totalNumbers: 10 });
      prisma.$queryRaw.mockResolvedValue([
        { number: 8, status: 'AVAILABLE' },
        { number: 9, status: 'PAID' },
      ]);
      const out = await service.numbersPage('onix', 8, 500);
      expect(out).toEqual({ from: 8, size: 2, total: 10, statuses: '02' });
    });
  });
});
