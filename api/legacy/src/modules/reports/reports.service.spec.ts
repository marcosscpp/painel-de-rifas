import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { periodSql, ReportsService } from './reports.service.js';

const RAFFLE = '7f1c3a2e-0000-4000-8000-000000000001';

describe('ReportsService', () => {
  let db: { query: ReturnType<typeof vi.fn>; cursor: ReturnType<typeof vi.fn> };
  let reader: { reveal: ReturnType<typeof vi.fn> };
  let service: ReportsService;

  beforeEach(() => {
    db = { query: vi.fn().mockResolvedValue([]), cursor: vi.fn() };
    // Simula a descriptografia: marca o valor como aberto.
    reader = {
      reveal: vi.fn((rows: Record<string, unknown>[], keys: string[]) =>
        rows.map((r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, `dec(${String(r[k])})`])) })),
      ),
    };
    service = new ReportsService(db as never, reader as never);
  });

  const sqlOf = (call: unknown[]) => call[0] as Prisma.Sql;

  it('catálogo lista os cinco relatórios', () => {
    expect(service.catalog().map((r) => r.type)).toEqual(['sales-by-raffle', 'sales-by-day', 'orders', 'buyers', 'numbers']);
    expect(service.catalog().find((r) => r.type === 'numbers')?.needsRaffle).toBe(true);
  });

  it('valida tipo, rifa obrigatória e período', () => {
    expect(() => service.definition('nope', {})).toThrow(NotFoundException);
    expect(() => service.definition('numbers', {})).toThrow(BadRequestException);
    expect(() => service.definition('orders', { from: '2026-10-10', to: '2026-10-01' })).toThrow(BadRequestException);
    expect(service.definition('orders', { from: '2026-10-01', to: '2026-10-01' }).title).toBe('Pedidos');
  });

  it('período em dias de Brasília vira parâmetros, não texto no SQL', () => {
    const sql = periodSql('o."paidAt"', { from: '2026-10-01', to: '2026-10-31' });
    expect(sql.text).toContain(`o."paidAt" >= (($1::date)::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
    expect(sql.text).toContain(`o."paidAt" < (($2::date + 1)::timestamp`);
    expect(sql.values).toEqual(['2026-10-01', '2026-10-31']);
    expect(periodSql('o."paidAt"', {}).text).toBe('');
  });

  it('prévia limita a 100 linhas, aplica filtros e descriptografa', async () => {
    db.query.mockResolvedValue(
      Array.from({ length: 101 }, (_, i) => ({
        id: `o${i}`,
        created_at: new Date('2026-10-01T12:00:00Z'),
        status: 'PAID',
        title: 'Rifa',
        name: 'Ana',
        phone: 'enc:1',
        cpf: 'enc:2',
        email: 'enc:3',
        quantity: 2,
        subtotal: 500,
        fee: 199,
        total: 699,
        paid_at: null,
        refund_required: true,
        refunded_at: null,
      })),
    );
    const res = await service.preview('orders', { raffleId: RAFFLE, status: 'PAID' });
    const sql = sqlOf(db.query.mock.calls[0]);
    expect(sql.text).toContain('o.status = $1::"OrderStatus"');
    expect(sql.values).toEqual(['PAID', RAFFLE, 101]);
    expect(res.rows).toHaveLength(100);
    expect(res.truncated).toBe(true);
    expect(res.rows[0]).toEqual([
      'o0', expect.any(Date), 'Pago', 'Rifa', 'Ana', 'dec(enc:1)', 'dec(enc:2)', 'dec(enc:3)', 2, 500, 199, 699, null, 'Pendente',
    ]);
    expect(reader.reveal.mock.calls[0][1]).toEqual(['phone', 'cpf', 'email']);
  });

  it('relatórios sem dado pessoal não passam pelo leitor', async () => {
    db.query.mockResolvedValue([{ day: '2026-10-01', orders: 3, numbers: 30, buyers: 2, revenue: 7500, fees: 597 }]);
    const res = await service.preview('sales-by-day', {});
    expect(res.rows).toEqual([['2026-10-01', 3, 30, 2, 7500, 597]]);
    expect(reader.reveal).not.toHaveBeenCalled();
  });

  it('vendas por rifa calcula % vendido e ticket médio', async () => {
    db.query.mockResolvedValue([
      { title: 'R', status: 'ACTIVE', price: 100, total: 1000, paid: 250, orders: 4, numbers: 250, buyers: 3, revenue: 25000, fees: 796 },
    ]);
    const [row] = (await service.preview('sales-by-raffle', {})).rows;
    expect(row).toEqual(['R', 'Ativa', 100, 1000, 0.25, 4, 250, 3, 25000, 796, 6250]);
  });

  it('exportação percorre o cursor lote a lote', async () => {
    db.cursor.mockImplementation(async function* () {
      yield [{ number: '0001', name: 'A', phone: 'p', cpf: 'c', order_id: 'o1', paid_at: new Date() }];
      yield [{ number: '0002', name: 'B', phone: 'p', cpf: 'c', order_id: 'o2', paid_at: new Date() }];
    });
    const out: unknown[] = [];
    for await (const r of service.rows('numbers', { raffleId: RAFFLE })) out.push(r[0]);
    expect(out).toEqual(['0001', '0002']);
    expect(sqlOf(db.cursor.mock.calls[0]).text).toContain('ORDER BY rn.number');
    expect(reader.reveal).toHaveBeenCalledTimes(2);
  });
});
