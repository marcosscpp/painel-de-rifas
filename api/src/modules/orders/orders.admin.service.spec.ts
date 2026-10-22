import { ConflictException, NotFoundException } from '@nestjs/common';
import { makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { csvCell, OrdersAdminService } from './orders.admin.service.js';

describe('OrdersAdminService', () => {
  let prisma: PrismaMock;
  let orders: { release: ReturnType<typeof vi.fn>; listForBuyer: ReturnType<typeof vi.fn> };
  let service: OrdersAdminService;

  beforeEach(() => {
    prisma = makePrisma();
    orders = { release: vi.fn(), listForBuyer: vi.fn().mockResolvedValue([]) };
    service = new OrdersAdminService(prisma as never, orders as never, { urls: () => null } as never);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.order.count.mockResolvedValue(0);
  });

  it('busca por id do pedido quando o texto é um UUID', async () => {
    const id = '7f1c3a2e-0000-4000-8000-000000000001';
    await service.list({ q: id, page: 1, pageSize: 20 });
    expect(prisma.order.findMany.mock.calls[0][0].where).toMatchObject({ id });
  });

  it('busca por nome, e-mail, celular e CPF', async () => {
    await service.list({ q: '(11) 98765', page: 1, pageSize: 20 });
    const or = prisma.order.findMany.mock.calls[0][0].where.user.OR;
    expect(or).toEqual(
      expect.arrayContaining([{ phone: { contains: '1198765' } }, { cpf: { contains: '1198765' } }]),
    );
  });

  it('filtro de reembolso pendente', async () => {
    await service.list({ refundPending: true, page: 1, pageSize: 20 });
    expect(prisma.order.findMany.mock.calls[0][0].where).toMatchObject({ refundRequired: true, refundedAt: null });
  });

  it('só cancela pedido aguardando pagamento', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({ status: 'PAID' });
    await expect(service.cancel('o1')).rejects.toBeInstanceOf(ConflictException);
    prisma.order.findUnique.mockResolvedValueOnce(null);
    await expect(service.cancel('o1')).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.release).not.toHaveBeenCalled();
  });

  it('reembolso só uma vez e só se estava pendente', async () => {
    prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.markRefunded('o1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('CSV: escapa aspas e ponto e vírgula e neutraliza fórmulas', () => {
    expect(csvCell('Maria')).toBe('Maria');
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+5511')).toBe("'+5511");
    expect(csvCell(null)).toBe('');
  });

  it('CSV tem BOM e cabeçalho', async () => {
    const csv = await service.exportCsv({});
    expect(csv.startsWith('﻿pedido;criado_em;status')).toBe(true);
  });
});
