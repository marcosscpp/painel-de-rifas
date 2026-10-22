import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { makeConfig, makePrisma, type PrismaMock, sqlOf, uniqueViolation } from '../../../test/helpers/mocks.js';
import { GatewayError } from '../payments/payment-provider.js';
import { RafflesPresenter } from '../raffles/raffles.presenter.js';
import { OrdersService } from './orders.service.js';

const PENDING_ORDER = {
  id: 'o1',
  status: 'PENDING',
  quantity: 2,
  totalCents: 597,
  expiresAt: new Date('2026-10-21T12:15:00Z'),
  raffleId: 'r1',
  reservedNumbers: [7, 42],
  payment: null,
  user: { id: 'u1', name: 'Maria', phone: '11987654321', cpf: null, gatewayCustomerId: null },
  raffle: { id: 'r1', slug: 'onix', title: 'Onix 0km' },
};

function setup({ gatewayName = 'FAKE', env = 'development' } = {}) {
  const prisma = makePrisma();
  const realtime = { numbersChanged: vi.fn(), progressChanged: vi.fn(), orderStatus: vi.fn() };
  const gateway = {
    name: gatewayName,
    requiresCpf: gatewayName === 'ASAAS',
    createCharge: vi.fn().mockResolvedValue({ providerChargeId: 'ch1', pixCopyPaste: 'copia', pixQrCodeBase64: 'qr' }),
    cancelCharge: vi.fn().mockResolvedValue(undefined),
  };
  const uploads = { urls: vi.fn().mockReturnValue(null) };
  const service = new OrdersService(
    prisma as never,
    realtime as never,
    new RafflesPresenter(uploads as never),
    uploads as never,
    makeConfig({ RESERVATION_MINUTES: 15, PIX_FEE_CENTS: 199, NODE_ENV: env }) as never,
    gateway as never,
  );
  return { prisma, realtime, gateway, service };
}

// Acesso aos privados só no teste.
const ensureCharge = (s: OrdersService, id: string) =>
  (s as unknown as { ensureCharge(id: string): Promise<void> }).ensureCharge(id);

describe('OrdersService: cobrança Pix', () => {
  let prisma: PrismaMock;
  let gateway: ReturnType<typeof setup>['gateway'];
  let service: OrdersService;

  beforeEach(() => {
    ({ prisma, gateway, service } = setup());
    prisma.order.findUnique.mockResolvedValue(PENDING_ORDER);
  });

  it('gera o Pix com o total do pedido e grava a cobrança', async () => {
    await ensureCharge(service, 'o1');
    expect(gateway.createCharge).toHaveBeenCalledWith({
      orderId: 'o1',
      amountCents: 597,
      description: '2 número(s) - Onix 0km',
      expiresAt: PENDING_ORDER.expiresAt,
      buyer: { userId: 'u1', name: 'Maria', phone: '11987654321', cpf: null, gatewayCustomerId: null },
    });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 'o1',
        provider: 'FAKE',
        providerChargeId: 'ch1',
        amountCents: 597,
        pixCopyPaste: 'copia',
        pixQrCodeBase64: 'qr',
      },
    });
  });

  it('guarda o id do cliente criado no gateway para as próximas compras', async () => {
    gateway.createCharge.mockResolvedValueOnce({ providerChargeId: 'ch1', pixCopyPaste: 'c', pixQrCodeBase64: 'q', gatewayCustomerId: 'cus_1' });
    await ensureCharge(service, 'o1');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { gatewayCustomerId: 'cus_1' } });
  });

  it('não gera de novo se o pedido já tem cobrança ou não está pendente', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({ ...PENDING_ORDER, payment: { id: 'p' } });
    await ensureCharge(service, 'o1');
    prisma.order.findUnique.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'EXPIRED' });
    await ensureCharge(service, 'o1');
    expect(gateway.createCharge).not.toHaveBeenCalled();
  });

  it('gateway fora do ar: cancela o pedido (números voltam) e devolve erro amigável', async () => {
    gateway.createCharge.mockRejectedValueOnce(new Error('timeout'));
    const release = vi.spyOn(service, 'release').mockResolvedValue();
    await expect(ensureCharge(service, 'o1')).rejects.toThrow(BadGatewayException);
    expect(release).toHaveBeenCalledWith('o1', 'CANCELED');
  });

  it('dado recusado pelo gateway (400) aparece para o comprador', async () => {
    gateway.createCharge.mockRejectedValueOnce(new GatewayError('CPF inválido', 400));
    vi.spyOn(service, 'release').mockResolvedValue();
    await expect(ensureCharge(service, 'o1')).rejects.toThrow('CPF inválido');
  });

  it('duas requisições criando cobrança juntas: a que perdeu cancela a cobrança extra', async () => {
    prisma.payment.create.mockRejectedValueOnce(uniqueViolation());
    await ensureCharge(service, 'o1');
    expect(gateway.cancelCharge).toHaveBeenCalledWith('ch1');
  });
});

describe('OrdersService: webhook e confirmação', () => {
  let prisma: PrismaMock;
  let realtime: ReturnType<typeof setup>['realtime'];
  let service: OrdersService;

  const ev = { eventId: 'evt_1', type: 'PAYMENT_RECEIVED', chargeId: 'ch1', paid: true };

  beforeEach(() => {
    ({ prisma, realtime, service } = setup());
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay1', status: 'PENDING', orderId: 'o1' });
    prisma.order.findUniqueOrThrow.mockResolvedValue({ ...PENDING_ORDER });
    prisma.$queryRaw.mockResolvedValue([]);
  });

  describe('handleGatewayEvent', () => {
    it('evento repetido (mesmo id) é ignorado sem tocar no pedido', async () => {
      prisma.webhookEvent.create.mockRejectedValueOnce(uniqueViolation());
      await expect(service.handleGatewayEvent(ev)).resolves.toBe('duplicate');
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('evento que não é pagamento só é registrado', async () => {
      await expect(service.handleGatewayEvent({ ...ev, paid: false, type: 'PAYMENT_CREATED' })).resolves.toBe('ignored');
      expect(prisma.webhookEvent.update).toHaveBeenCalled();
    });

    it('se a confirmação falhar, apaga o registro para o gateway reenviar', async () => {
      vi.spyOn(service, 'confirmPayment').mockRejectedValueOnce(new Error('db caiu'));
      await expect(service.handleGatewayEvent(ev)).rejects.toThrow('db caiu');
      expect(prisma.webhookEvent.delete).toHaveBeenCalledWith({
        where: { provider_eventId: { provider: 'FAKE', eventId: 'evt_1' } },
      });
    });
  });

  describe('confirmPayment', () => {
    it('pedido pendente: vira pago, números viram pagos e os contadores mudam de reservado para pago', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // FOR UPDATE no pedido
        .mockResolvedValueOnce([{ number: 7 }, { number: 42 }]); // UPDATE ... RETURNING

      await expect(service.confirmPayment('ch1')).resolves.toBe('paid');

      expect(sqlOf(prisma.$queryRaw.mock.calls[0])).toContain('FOR UPDATE');
      expect(sqlOf(prisma.$queryRaw.mock.calls[1])).toContain("SET status = 'PAID'");
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'PAID', paidAt: expect.any(Date) } });
      expect(prisma.raffle.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { reservedCount: { decrement: 2 }, paidCount: { increment: 2 } },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay1' },
        data: { status: 'CONFIRMED', confirmedAt: expect.any(Date) },
      });
      expect(realtime.orderStatus).toHaveBeenCalledWith('o1', 'PAID');
      expect(realtime.numbersChanged).toHaveBeenCalledWith('onix', 'PAID', [7, 42]);
    });

    it('cobrança já confirmada não conta de novo', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce({ id: 'pay1', status: 'CONFIRMED', orderId: 'o1' });
      await expect(service.confirmPayment('ch1')).resolves.toBe('already-confirmed');
      expect(prisma.raffle.update).not.toHaveBeenCalled();
    });

    it('cobrança desconhecida não quebra o webhook', async () => {
      prisma.payment.findUnique.mockResolvedValueOnce(null);
      await expect(service.confirmPayment('x')).resolves.toBe('unknown-charge');
    });

    it('pagou depois de expirar e os números ainda estão livres: devolve os mesmos números', async () => {
      prisma.order.findUniqueOrThrow.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'EXPIRED' });
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // FOR UPDATE no pedido
        .mockResolvedValueOnce([{ number: 7 }, { number: 42 }]); // números ainda livres

      await expect(service.confirmPayment('ch1')).resolves.toBe('late-recovered');
      expect(sqlOf(prisma.$executeRaw.mock.calls[0])).toContain("SET status = 'PAID'");
      expect(prisma.raffle.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { paidCount: { increment: 2 } } });
      expect(realtime.numbersChanged).toHaveBeenCalledWith('onix', 'PAID', [7, 42]);
    });

    it('pagou depois de expirar e algum número já foi vendido: marca para reembolso', async () => {
      prisma.order.findUniqueOrThrow.mockResolvedValueOnce({ ...PENDING_ORDER, status: 'EXPIRED' });
      prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ number: 7 }]);

      await expect(service.confirmPayment('ch1')).resolves.toBe('refund-required');
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { refundRequired: true } });
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(realtime.numbersChanged).not.toHaveBeenCalled();
    });
  });

  describe('simulatePayment', () => {
    it('só existe com gateway falso fora de produção', async () => {
      const prod = setup({ env: 'production' });
      await expect(prod.service.simulatePayment('o1')).rejects.toBeInstanceOf(NotFoundException);
      const asaas = setup({ gatewayName: 'ASAAS' });
      await expect(asaas.service.simulatePayment('o1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('OrdersService: expiração cancela o Pix', () => {
  it('marca a cobrança como expirada e cancela no gateway', async () => {
    const { prisma, gateway, service } = setup();
    prisma.order.findUnique.mockResolvedValue({ raffleId: 'r1', payment: { providerChargeId: 'ch1' } });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.$queryRaw.mockResolvedValue([{ number: 7 }]);
    prisma.raffle.update.mockResolvedValue({ id: 'r1', slug: 'onix' });

    await service.release('o1', 'EXPIRED');
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'o1', status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    expect(gateway.cancelCharge).toHaveBeenCalledWith('ch1');
  });

  it('falha ao cancelar no gateway não impede a expiração', async () => {
    const { prisma, gateway, realtime, service } = setup();
    prisma.order.findUnique.mockResolvedValue({ raffleId: 'r1', payment: { providerChargeId: 'ch1' } });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.raffle.update.mockResolvedValue({ id: 'r1', slug: 'onix' });
    gateway.cancelCharge.mockRejectedValueOnce(new Error('fora do ar'));

    await service.release('o1', 'EXPIRED');
    expect(realtime.orderStatus).toHaveBeenCalledWith('o1', 'EXPIRED');
  });
});
