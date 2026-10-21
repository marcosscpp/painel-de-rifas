import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { makeConfig, makePrisma, type PrismaMock, sqlOf, uniqueViolation } from '../../../test/helpers/mocks.js';
import { RafflesPresenter } from '../raffles/raffles.presenter.js';
import { NumbersUnavailableException, OrdersService } from './orders.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

const RAFFLE = {
  id: 'r1',
  slug: 'onix',
  title: 'Onix 0km',
  status: 'ACTIVE',
  saleMode: 'QUANTITY',
  totalNumbers: 1000,
  priceCents: 199,
  minPerOrder: 1,
  maxPerOrder: 50,
  endsAt: null,
  coverKey: null,
  paidCount: 0,
  reservedCount: 0,
};

const ORDER_ROW = {
  id: 'o1',
  status: 'PENDING',
  quantity: 2,
  subtotalCents: 398,
  feeCents: 199,
  totalCents: 597,
  expiresAt: new Date(),
  paidAt: null,
  createdAt: new Date(),
  raffle: RAFFLE,
  user: { name: 'Maria da Silva', phone: '11987654321' },
  numbers: [{ number: 7 }, { number: 42 }],
  payment: { id: 'pay1', status: 'PENDING', pixCopyPaste: 'copia', pixQrCodeBase64: 'qr' },
};

const dto = (over: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
  raffleSlug: 'onix',
  quantity: 2,
  buyer: { name: 'Maria da Silva', phone: '11987654321' },
  idempotencyKey: '7f1c3a2e-0000-4000-8000-000000000001',
  ...over,
});

describe('OrdersService', () => {
  let prisma: PrismaMock;
  let users: { upsertBuyer: ReturnType<typeof vi.fn> };
  let realtime: { numbersChanged: ReturnType<typeof vi.fn>; progressChanged: ReturnType<typeof vi.fn>; orderStatus: ReturnType<typeof vi.fn> };
  let uploads: { urls: ReturnType<typeof vi.fn> };
  let gateway: { name: string; requiresCpf: boolean; createCharge: ReturnType<typeof vi.fn>; cancelCharge: ReturnType<typeof vi.fn> };
  let service: OrdersService;

  beforeEach(() => {
    prisma = makePrisma();
    users = { upsertBuyer: vi.fn().mockResolvedValue({ id: 'u1' }) };
    realtime = { numbersChanged: vi.fn(), progressChanged: vi.fn(), orderStatus: vi.fn() };
    uploads = { urls: vi.fn().mockReturnValue(null) };
    gateway = { name: 'FAKE', requiresCpf: false, createCharge: vi.fn(), cancelCharge: vi.fn().mockResolvedValue(undefined) };
    service = new OrdersService(
      prisma as never,
      users as never,
      realtime as never,
      new RafflesPresenter(uploads as never),
      uploads as never,
      makeConfig({ RESERVATION_MINUTES: 15, PIX_FEE_CENTS: 199 }) as never,
      gateway as never,
    );

    // Padrão: chave nova, rifa ativa, pedido criado, contador atualizado.
    prisma.order.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(where.id ? ORDER_ROW : null),
    );
    prisma.raffle.findUnique.mockResolvedValue(RAFFLE);
    prisma.order.create.mockResolvedValue({ id: 'o1' });
    prisma.$executeRaw.mockResolvedValue(1);
  });

  describe('create: validações antes de reservar', () => {
    it('reenvio com a mesma chave devolve o pedido existente sem criar outro', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({ id: 'o1' }).mockResolvedValueOnce(ORDER_ROW);
      const out = await service.create(dto());
      expect(out.id).toBe('o1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(users.upsertBuyer).not.toHaveBeenCalled();
    });

    it('exige quantidade OU números, não os dois nem nenhum', async () => {
      await expect(service.create(dto({ numbers: [1] }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(dto({ quantity: undefined }))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rifa inexistente ou em rascunho é 404', async () => {
      prisma.raffle.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(dto())).rejects.toBeInstanceOf(NotFoundException);
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, status: 'DRAFT' });
      await expect(service.create(dto())).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each(['PAUSED', 'CLOSED', 'DRAWN'])('rifa %s não vende', async (status) => {
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, status });
      await expect(service.create(dto())).rejects.toBeInstanceOf(ConflictException);
    });

    it('não vende depois do fim das vendas', async () => {
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, endsAt: new Date(Date.now() - 1000) });
      await expect(service.create(dto())).rejects.toThrow('terminaram');
    });

    it('respeita o modo de venda da rifa', async () => {
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, saleMode: 'QUANTITY' });
      await expect(service.create(dto({ quantity: undefined, numbers: [1] }))).rejects.toThrow('não permite escolher');
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, saleMode: 'PICK' });
      await expect(service.create(dto())).rejects.toThrow('escolhe os números');
    });

    it('respeita mínimo e máximo por pedido', async () => {
      await expect(service.create(dto({ quantity: 51 }))).rejects.toThrow('Escolha de 1 a 50');
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, minPerOrder: 5 });
      await expect(service.create(dto({ quantity: 2 }))).rejects.toThrow('Escolha de 5 a 50');
    });

    it('recusa número que não existe na rifa', async () => {
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, saleMode: 'PICK' });
      await expect(service.create(dto({ quantity: undefined, numbers: [3, 1000] }))).rejects.toThrow(
        'Números inexistentes: 1000',
      );
    });

    it('nada é reservado se a validação falhar', async () => {
      await expect(service.create(dto({ quantity: 999 }))).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('create: reserva', () => {
    it('por quantidade: cria o pedido com taxa e expiração, reserva e avisa em tempo real', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-21T12:00:00Z') });
      prisma.$queryRaw.mockResolvedValueOnce([{ number: 7 }, { number: 42 }]);

      const out = await service.create(dto());

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            raffleId: 'r1',
            userId: 'u1',
            quantity: 2,
            subtotalCents: 398,
            feeCents: 199,
            totalCents: 597,
            expiresAt: new Date('2026-10-21T12:15:00Z'),
          }),
        }),
      );
      // trava com SKIP LOCKED e em ordem aleatória (sem viés para os menores números)
      const lockSql = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(lockSql).toContain('FOR UPDATE SKIP LOCKED');
      expect(lockSql).toContain('ORDER BY random()');
      // marca os números e soma no contador da rifa, só se ela ainda estiver ACTIVE
      expect(sqlOf(prisma.$executeRaw.mock.calls[0])).toContain("SET status = 'RESERVED'");
      expect(sqlOf(prisma.$executeRaw.mock.calls[1])).toContain("status = 'ACTIVE'");

      expect(realtime.numbersChanged).toHaveBeenCalledWith('onix', 'RESERVED', [7, 42]);
      expect(realtime.progressChanged).toHaveBeenCalledWith('onix', expect.any(Function));
      expect(out.numbers).toEqual([7, 42]);
      vi.useRealTimers();
    });

    it('por quantidade: completa varrendo a partir de um ponto aleatório quando os candidatos não bastam', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ number: 7 }]) // candidatos
        .mockResolvedValueOnce([{ number: 900 }]); // varredura >= início
      await service.create(dto());
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(realtime.numbersChanged).toHaveBeenCalledWith('onix', 'RESERVED', [7, 900]);
    });

    it('por quantidade: avisa quantos restam quando não há números suficientes', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValueOnce([{ number: 3 }]);
      await expect(service.create(dto())).rejects.toThrow('Só restam 1 números');
      expect(realtime.numbersChanged).not.toHaveBeenCalled();
    });

    it('por quantidade: esgotado', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await expect(service.create(dto())).rejects.toThrow('Números esgotados');
    });

    it('escolhendo: reserva exatamente os números pedidos', async () => {
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, saleMode: 'PICK' });
      prisma.$queryRaw.mockResolvedValueOnce([{ number: 3 }, { number: 9 }]);
      await service.create(dto({ quantity: undefined, numbers: [3, 9] }));
      expect(realtime.numbersChanged).toHaveBeenCalledWith('onix', 'RESERVED', [3, 9]);
    });

    it('escolhendo: se algum foi pego por outra pessoa, desfaz e diz quais', async () => {
      prisma.raffle.findUnique.mockResolvedValueOnce({ ...RAFFLE, saleMode: 'PICK' });
      prisma.$queryRaw.mockResolvedValueOnce([{ number: 3 }]);
      const err = await service.create(dto({ quantity: undefined, numbers: [3, 9, 12] })).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NumbersUnavailableException);
      expect((err as NumbersUnavailableException).getResponse()).toMatchObject({ unavailable: [9, 12] });
      // nada foi marcado como reservado
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('rifa pausada no meio da compra: o contador não atualiza e tudo é desfeito', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ number: 7 }, { number: 42 }]);
      prisma.$executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
      await expect(service.create(dto())).rejects.toThrow('pausadas');
      expect(realtime.numbersChanged).not.toHaveBeenCalled();
    });

    it('dois envios simultâneos da mesma chave: o segundo devolve o pedido do primeiro', async () => {
      prisma.order.findUnique
        .mockResolvedValueOnce(null) // checagem inicial: ainda não existe
        .mockResolvedValueOnce({ id: 'o1' }) // depois do conflito de chave única
        .mockResolvedValueOnce(ORDER_ROW); // get()
      prisma.order.create.mockRejectedValueOnce(uniqueViolation());
      const out = await service.create(dto());
      expect(out.id).toBe('o1');
    });

    it('outros erros do banco sobem sem ser engolidos', async () => {
      prisma.order.create.mockRejectedValueOnce(new Error('conexão caiu'));
      await expect(service.create(dto())).rejects.toThrow('conexão caiu');
    });
  });

  describe('get', () => {
    it('mostra só o primeiro nome e o telefone mascarado', async () => {
      const out = await service.get('o1');
      expect(out.buyer).toEqual({ name: 'Maria', phone: '(11) 9****-4321' });
      expect(out.numbers).toEqual([7, 42]);
    });

    it('pedido inexistente é 404', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);
      await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('release / expiração', () => {
    beforeEach(() => {
      prisma.order.findUnique.mockResolvedValue({ raffleId: 'r1' });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      prisma.$queryRaw.mockResolvedValue([{ number: 7 }, { number: 42 }]);
      prisma.raffle.update.mockResolvedValue({ id: 'r1', slug: 'onix' });
    });

    it('devolve os números, desconta o contador e avisa o pedido e a grade', async () => {
      await service.release('o1', 'EXPIRED');
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'o1', status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
      expect(sqlOf(prisma.$queryRaw.mock.calls[0])).toContain("SET status = 'AVAILABLE'");
      expect(prisma.raffle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { reservedCount: { decrement: 2 } } }),
      );
      expect(realtime.orderStatus).toHaveBeenCalledWith('o1', 'EXPIRED');
      expect(realtime.numbersChanged).toHaveBeenCalledWith('onix', 'AVAILABLE', [7, 42]);
    });

    it('pedido que já não está pendente (pago ou expirado por outro processo) não é mexido', async () => {
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await service.release('o1', 'EXPIRED');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.raffle.update).not.toHaveBeenCalled();
      expect(realtime.orderStatus).not.toHaveBeenCalled();
    });

    it('expireDue libera cada pedido vencido', async () => {
      prisma.order.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
      const spy = vi.spyOn(service, 'release').mockResolvedValue();
      await service.expireDue();
      expect(spy).toHaveBeenCalledWith('a', 'EXPIRED');
      expect(spy).toHaveBeenCalledWith('b', 'EXPIRED');
    });

    it('expireDue não roda duas vezes ao mesmo tempo', async () => {
      let finish!: () => void;
      prisma.order.findMany.mockReturnValueOnce(new Promise((r) => (finish = () => r([])))) ;
      const first = service.expireDue();
      await service.expireDue(); // segunda chamada enquanto a primeira roda
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
      finish();
      await first;
    });

    it('expireDue não derruba o processo se o banco falhar', async () => {
      prisma.order.findMany.mockRejectedValueOnce(new Error('db fora'));
      await expect(service.expireDue()).resolves.toBeUndefined();
    });
  });
});
