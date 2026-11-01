import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { ReportQuery, ReportType } from './dto/reports.dto.js';
import { REPORT_TYPES } from './dto/reports.dto.js';
import type { Cell, ReportColumn } from './report-writers.js';
import { BuyerDataReader, type ReportRow as Row } from './buyer-data.reader.js';
import { ReportsDatabase } from './reports.database.js';

const PREVIEW_ROWS = 100;
const BUYER_PII = ['phone', 'cpf', 'email'] as const;

type ReportDef = {
  title: string;
  // Explica na tela qual data o filtro de período usa.
  periodOf: string;
  columns: ReportColumn[];
  needsRaffle?: boolean;
  // Colunas do SQL com dado pessoal do comprador: passam pelo BuyerDataReader antes de virar linha.
  pii?: readonly string[];
  sql: (f: ReportQuery) => Prisma.Sql;
  row: (r: Row) => Cell[];
};

const ORDER_STATUS: Record<string, string> = {
  PAID: 'Pago',
  PENDING: 'Aguardando pagamento',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
};
const RAFFLE_STATUS: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  CLOSED: 'Encerrada',
  DRAWN: 'Sorteada',
};

// Colunas timestamp guardam UTC sem fuso; "AT TIME ZONE 'UTC'" devolve timestamptz e o driver
// entrega um Date correto. Somas saem como float8 (exato até 2^53) para chegarem como number.
const utc = (col: string) => Prisma.raw(`(${col} AT TIME ZONE 'UTC')`);

// Período em dias de Brasília, convertido para UTC no próprio SQL (a coluna continua indexável).
export function periodSql(col: string, f: ReportQuery): Prisma.Sql {
  const c = Prisma.raw(col);
  const parts: Prisma.Sql[] = [];
  if (f.from) parts.push(Prisma.sql`AND ${c} >= ((${f.from}::date)::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'`);
  if (f.to) parts.push(Prisma.sql`AND ${c} < ((${f.to}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'`);
  return parts.length ? Prisma.join(parts, ' ') : Prisma.empty;
}

const raffleSql = (col: string, f: ReportQuery) =>
  f.raffleId ? Prisma.sql`AND ${Prisma.raw(col)} = ${f.raffleId}::uuid` : Prisma.empty;

const num = (v: unknown) => (v == null ? 0 : Number(v));

const REPORTS: Record<ReportType, ReportDef> = {
  'sales-by-raffle': {
    title: 'Vendas por rifa',
    periodOf: 'data do pagamento',
    columns: [
      { key: 'raffle', label: 'Rifa', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'price', label: 'Preço do número', type: 'money' },
      { key: 'totalNumbers', label: 'Total de números', type: 'int' },
      { key: 'soldPercent', label: '% vendido (geral)', type: 'percent' },
      { key: 'orders', label: 'Pedidos pagos', type: 'int', total: true },
      { key: 'numbers', label: 'Números vendidos', type: 'int', total: true },
      { key: 'buyers', label: 'Compradores', type: 'int' },
      { key: 'revenue', label: 'Faturamento', type: 'money', total: true },
      { key: 'fees', label: 'Taxas Pix', type: 'money', total: true },
      { key: 'avgTicket', label: 'Ticket médio', type: 'money' },
    ],
    sql: (f) => Prisma.sql`
      SELECT r.title, r.status::text AS status, r."priceCents" AS price, r."totalNumbers" AS total, r."paidCount" AS paid,
             COUNT(o.id)::float8 AS orders, COALESCE(SUM(o.quantity), 0)::float8 AS numbers,
             COUNT(DISTINCT o."userId")::float8 AS buyers, COALESCE(SUM(o."subtotalCents"), 0)::float8 AS revenue,
             COALESCE(SUM(o."totalCents" - o."subtotalCents"), 0)::float8 AS fees
        FROM raffles r
        LEFT JOIN orders o ON o."raffleId" = r.id AND o.status = 'PAID' ${periodSql('o."paidAt"', f)}
       WHERE r.status <> 'DRAFT' ${raffleSql('r.id', f)}
       GROUP BY r.id
       ORDER BY r."createdAt" DESC`,
    row: (r) => [
      r.title as string,
      RAFFLE_STATUS[r.status as string] ?? (r.status as string),
      num(r.price),
      num(r.total),
      num(r.total) ? num(r.paid) / num(r.total) : 0,
      num(r.orders),
      num(r.numbers),
      num(r.buyers),
      num(r.revenue),
      num(r.fees),
      num(r.orders) ? Math.round(num(r.revenue) / num(r.orders)) : 0,
    ],
  },

  'sales-by-day': {
    title: 'Vendas por dia',
    periodOf: 'data do pagamento',
    columns: [
      { key: 'day', label: 'Dia', type: 'date' },
      { key: 'orders', label: 'Pedidos pagos', type: 'int', total: true },
      { key: 'numbers', label: 'Números vendidos', type: 'int', total: true },
      { key: 'buyers', label: 'Compradores', type: 'int' },
      { key: 'revenue', label: 'Faturamento', type: 'money', total: true },
      { key: 'fees', label: 'Taxas Pix', type: 'money', total: true },
    ],
    sql: (f) => Prisma.sql`
      SELECT to_char((o."paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
             COUNT(*)::float8 AS orders, SUM(o.quantity)::float8 AS numbers, COUNT(DISTINCT o."userId")::float8 AS buyers,
             SUM(o."subtotalCents")::float8 AS revenue, SUM(o."totalCents" - o."subtotalCents")::float8 AS fees
        FROM orders o
       WHERE o.status = 'PAID' ${periodSql('o."paidAt"', f)} ${raffleSql('o."raffleId"', f)}
       GROUP BY 1
       ORDER BY 1`,
    row: (r) => [r.day as string, num(r.orders), num(r.numbers), num(r.buyers), num(r.revenue), num(r.fees)],
  },

  orders: {
    title: 'Pedidos',
    periodOf: 'data de criação do pedido',
    pii: BUYER_PII,
    columns: [
      { key: 'id', label: 'Pedido', type: 'text' },
      { key: 'createdAt', label: 'Criado em', type: 'datetime' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'raffle', label: 'Rifa', type: 'text' },
      { key: 'buyer', label: 'Comprador', type: 'text' },
      { key: 'phone', label: 'Celular', type: 'text' },
      { key: 'cpf', label: 'CPF', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'text' },
      { key: 'quantity', label: 'Números', type: 'int', total: true },
      { key: 'subtotal', label: 'Subtotal', type: 'money', total: true },
      { key: 'fee', label: 'Taxa Pix', type: 'money', total: true },
      { key: 'total', label: 'Total', type: 'money', total: true },
      { key: 'paidAt', label: 'Pago em', type: 'datetime' },
      { key: 'refund', label: 'Reembolso', type: 'text' },
    ],
    sql: (f) => Prisma.sql`
      SELECT o.id, ${utc('o."createdAt"')} AS created_at, o.status::text AS status, r.title, u.name, u.phone, u.cpf, u.email,
             o.quantity, o."subtotalCents" AS subtotal, o."feeCents" AS fee, o."totalCents" AS total,
             ${utc('o."paidAt"')} AS paid_at, o."refundRequired" AS refund_required, o."refundedAt" AS refunded_at
        FROM orders o
        JOIN raffles r ON r.id = o."raffleId"
        JOIN users u ON u.id = o."userId"
       WHERE TRUE ${f.status ? Prisma.sql`AND o.status = ${f.status}::"OrderStatus"` : Prisma.empty}
             ${raffleSql('o."raffleId"', f)} ${periodSql('o."createdAt"', f)}
       ORDER BY o."createdAt" DESC`,
    row: (r) => [
      r.id as string,
      r.created_at as Date,
      ORDER_STATUS[r.status as string] ?? (r.status as string),
      r.title as string,
      r.name as string,
      r.phone as string | null,
      r.cpf as string | null,
      r.email as string | null,
      num(r.quantity),
      num(r.subtotal),
      num(r.fee),
      num(r.total),
      (r.paid_at as Date | null) ?? null,
      r.refund_required ? (r.refunded_at ? 'Feito' : 'Pendente') : null,
    ],
  },

  buyers: {
    title: 'Compradores',
    periodOf: 'data do pagamento',
    pii: [...BUYER_PII, 'city', 'state'],
    columns: [
      { key: 'name', label: 'Comprador', type: 'text' },
      { key: 'phone', label: 'Celular', type: 'text' },
      { key: 'cpf', label: 'CPF', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'text' },
      { key: 'city', label: 'Cidade', type: 'text' },
      { key: 'state', label: 'UF', type: 'text' },
      { key: 'orders', label: 'Pedidos pagos', type: 'int', total: true },
      { key: 'numbers', label: 'Números', type: 'int', total: true },
      { key: 'spent', label: 'Total gasto', type: 'money', total: true },
      { key: 'firstAt', label: 'Primeira compra', type: 'datetime' },
      { key: 'lastAt', label: 'Última compra', type: 'datetime' },
    ],
    sql: (f) => Prisma.sql`
      SELECT u.name, u.phone, u.cpf, u.email, u.city, u.state, s.orders, s.numbers, s.spent,
             s.first_at AT TIME ZONE 'UTC' AS first_at, s.last_at AT TIME ZONE 'UTC' AS last_at
        FROM (SELECT o."userId", COUNT(*)::float8 AS orders, SUM(o.quantity)::float8 AS numbers,
                     SUM(o."totalCents")::float8 AS spent, MIN(o."paidAt") AS first_at, MAX(o."paidAt") AS last_at
                FROM orders o
               WHERE o.status = 'PAID' ${periodSql('o."paidAt"', f)} ${raffleSql('o."raffleId"', f)}
               GROUP BY o."userId") s
        JOIN users u ON u.id = s."userId"
       ORDER BY s.spent DESC, u.name`,
    row: (r) => [
      r.name as string,
      r.phone as string | null,
      r.cpf as string | null,
      r.email as string | null,
      r.city as string | null,
      r.state as string | null,
      num(r.orders),
      num(r.numbers),
      num(r.spent),
      r.first_at as Date,
      r.last_at as Date,
    ],
  },

  numbers: {
    title: 'Números vendidos',
    periodOf: 'data do pagamento',
    needsRaffle: true,
    pii: ['phone', 'cpf'],
    columns: [
      { key: 'number', label: 'Número', type: 'text' },
      { key: 'buyer', label: 'Comprador', type: 'text' },
      { key: 'phone', label: 'Celular', type: 'text' },
      { key: 'cpf', label: 'CPF', type: 'text' },
      { key: 'order', label: 'Pedido', type: 'text' },
      { key: 'paidAt', label: 'Pago em', type: 'datetime' },
    ],
    // Percorre a chave primária (raffleId, number): já sai em ordem, sem ordenar milhões de linhas.
    sql: (f) => Prisma.sql`
      SELECT lpad(rn.number::text, length(greatest(r."totalNumbers" - 1, 0)::text), '0') AS number,
             u.name, u.phone, u.cpf, o.id AS order_id, ${utc('o."paidAt"')} AS paid_at
        FROM raffle_numbers rn
        JOIN raffles r ON r.id = rn."raffleId"
        JOIN orders o ON o.id = rn."orderId"
        JOIN users u ON u.id = o."userId"
       WHERE rn."raffleId" = ${f.raffleId}::uuid AND rn.status = 'PAID' ${periodSql('o."paidAt"', f)}
       ORDER BY rn.number`,
    row: (r) => [r.number as string, r.name as string, r.phone as string | null, r.cpf as string | null, r.order_id as string, r.paid_at as Date],
  },
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly db: ReportsDatabase,
    private readonly buyers: BuyerDataReader,
  ) {}

  private reveal(def: ReportDef, rows: Row[]) {
    return def.pii ? this.buyers.reveal(rows, def.pii) : rows;
  }

  // Lista para a tela montar o seletor de relatórios.
  catalog() {
    return REPORT_TYPES.map((type) => {
      const { title, periodOf, columns, needsRaffle = false } = REPORTS[type];
      return { type, title, periodOf, needsRaffle, usesStatus: type === 'orders', columns };
    });
  }

  // Valida antes de qualquer byte ir para o cliente: depois dos cabeçalhos não dá mais para responder 400.
  definition(type: string, f: ReportQuery): ReportDef {
    const def = REPORTS[type as ReportType];
    if (!def) throw new NotFoundException('Relatório não encontrado');
    if (def.needsRaffle && !f.raffleId) throw new BadRequestException('Escolha uma rifa para este relatório');
    if (f.from && f.to && f.from > f.to) throw new BadRequestException('A data inicial é depois da final');
    return def;
  }

  // Primeiras linhas para conferir na tela antes de exportar.
  async preview(type: string, f: ReportQuery) {
    const def = this.definition(type, f);
    const raw = await this.db.query<Row>(Prisma.sql`${def.sql(f)} LIMIT ${PREVIEW_ROWS + 1}`);
    const rows = this.reveal(def, raw.slice(0, PREVIEW_ROWS));
    return {
      type,
      title: def.title,
      columns: def.columns,
      rows: rows.map(def.row),
      truncated: raw.length > PREVIEW_ROWS,
    };
  }

  // Todas as linhas, lote a lote, para o CSV/XLSX em streaming.
  async *rows(type: string, f: ReportQuery): AsyncGenerator<Cell[]> {
    const def = this.definition(type, f);
    for await (const batch of this.db.cursor<Row>(def.sql(f))) {
      for (const r of this.reveal(def, batch)) yield def.row(r);
    }
  }
}
