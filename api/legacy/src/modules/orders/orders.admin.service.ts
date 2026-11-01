import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { normalizeCpf, normalizePhone } from '../../common/utils/br.js';
import { PiiCipher } from '../../infra/crypto/pii-cipher.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import type { AdminBuyersQuery, AdminOrdersQuery } from './dto/admin-orders.dto.js';
import { OrdersService } from './orders.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXPORT_LIMIT = 50_000;

// Busca livre: id do pedido, parte do nome, ou e-mail, celular e CPF completos.
// Esses três são cifrados no banco: a busca compara o hash do valor inteiro, sem trecho.
function buyerSearch(cipher: PiiCipher, q: string): Prisma.UserWhereInput {
  const phone = normalizePhone(q);
  const cpf = normalizeCpf(q);
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      ...(q.includes('@') ? [{ emailHash: cipher.index('email', q.trim().toLowerCase()) }] : []),
      ...(phone ? [{ phoneHash: cipher.index('phone', phone) }] : []),
      ...(cpf ? [{ cpfHash: cipher.index('cpf', cpf) }] : []),
    ],
  };
}

// Célula de CSV segura: aspas escapadas e sem fórmula (Excel executa células que começam com = + - @).
export function csvCell(v: unknown): string {
  let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class OrdersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly uploads: UploadsService,
    private readonly cipher: PiiCipher,
  ) {}

  private where(q: Partial<AdminOrdersQuery>): Prisma.OrderWhereInput {
    return {
      status: q.status,
      raffleId: q.raffleId,
      ...(q.refundPending && { refundRequired: true, refundedAt: null }),
      ...(q.q && (UUID.test(q.q) ? { id: q.q } : { user: buyerSearch(this.cipher, q.q) })),
    };
  }

  async list(q: AdminOrdersQuery) {
    const where = this.where(q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          raffle: { select: { id: true, title: true, slug: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map((o) => ({
        id: o.id,
        status: o.status,
        quantity: o.quantity,
        totalCents: o.totalCents,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        refundRequired: o.refundRequired,
        refundedAt: o.refundedAt,
        buyer: this.cipher.decryptUser(o.user),
        raffle: o.raffle,
      })),
    };
  }

  async detail(id: string) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        raffle: { select: { id: true, title: true, slug: true, totalNumbers: true } },
        payment: { select: { provider: true, providerChargeId: true, status: true, confirmedAt: true, amountCents: true } },
        numbers: { select: { number: true }, orderBy: { number: 'asc' } },
      },
    });
    if (!o) throw new NotFoundException('Pedido não encontrado');
    const u = this.cipher.decryptUser(o.user);
    return {
      id: o.id,
      status: o.status,
      quantity: o.quantity,
      subtotalCents: o.subtotalCents,
      feeCents: o.feeCents,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,
      paidAt: o.paidAt,
      refundRequired: o.refundRequired,
      refundedAt: o.refundedAt,
      // Expirado/cancelado: os números que tinham sido reservados, para conferência.
      numbers: o.numbers.length ? o.numbers.map((n) => n.number) : o.reservedNumbers,
      numbersReleased: !o.numbers.length,
      raffle: o.raffle,
      payment: o.payment,
      buyer: {
        id: u.id,
        name: u.name,
        socialName: u.socialName,
        phone: u.phone,
        cpf: u.cpf,
        email: u.email,
        birthDate: u.birthDate,
        address: u.zipCode
          ? { zipCode: u.zipCode, street: u.street, number: u.streetNumber, district: u.district, city: u.city, state: u.state, complement: u.complement, reference: u.reference }
          : null,
      },
    };
  }

  // Cancela um pedido pendente: os números voltam para a venda e o Pix é cancelado no gateway.
  async cancel(id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!o) throw new NotFoundException('Pedido não encontrado');
    if (o.status !== 'PENDING') throw new ConflictException('Só pedidos aguardando pagamento podem ser cancelados');
    await this.orders.release(id, 'CANCELED');
    return this.detail(id);
  }

  // O reembolso é feito fora do sistema (Pix de volta pelo gateway); aqui só fica registrado.
  async markRefunded(id: string) {
    const { count } = await this.prisma.order.updateMany({
      where: { id, refundRequired: true, refundedAt: null },
      data: { refundedAt: new Date() },
    });
    if (!count) throw new ConflictException('Este pedido não tem reembolso pendente');
    await this.prisma.payment.updateMany({ where: { orderId: id }, data: { status: 'REFUNDED' } });
    return this.detail(id);
  }

  // CSV para planilha (separador ";" e BOM para o Excel em português abrir certo).
  async exportCsv(q: Partial<AdminOrdersQuery>) {
    const rows = await this.prisma.order.findMany({
      where: this.where(q),
      orderBy: { createdAt: 'desc' },
      take: EXPORT_LIMIT,
      include: {
        user: { select: { name: true, phone: true, cpf: true, email: true } },
        raffle: { select: { title: true } },
        numbers: { select: { number: true }, orderBy: { number: 'asc' } },
      },
    });
    const header = ['pedido', 'criado_em', 'status', 'rifa', 'comprador', 'celular', 'cpf', 'email', 'quantidade', 'subtotal', 'taxa', 'total', 'pago_em', 'reembolso', 'numeros'];
    const money = (c: number) => (c / 100).toFixed(2).replace('.', ',');
    const lines = rows.map((o) => {
      const u = this.cipher.decryptUser(o.user);
      return [
        o.id,
        o.createdAt,
        o.status,
        o.raffle.title,
        u.name,
        u.phone,
        u.cpf,
        u.email,
        o.quantity,
        money(o.subtotalCents),
        money(o.feeCents),
        money(o.totalCents),
        o.paidAt,
        o.refundRequired ? (o.refundedAt ? 'feito' : 'pendente') : '',
        o.numbers.map((n) => n.number).join(' '),
      ]
        .map(csvCell)
        .join(';');
    });
    return '﻿' + [header.join(';'), ...lines].join('\r\n');
  }

  // ─── Compradores ───────────────────────────────────────────────────────────

  async buyers(q: AdminBuyersQuery) {
    const where: Prisma.UserWhereInput = { role: 'BUYER', ...(q.q && buyerSearch(this.cipher, q.q)) };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: { id: true, name: true, phone: true, cpf: true, email: true, city: true, state: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    // Totais pagos de cada comprador da página, numa consulta só.
    const stats = users.length
      ? await this.prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: users.map((u) => u.id) }, status: 'PAID' },
          _count: { _all: true },
          _sum: { quantity: true, totalCents: true },
        })
      : [];
    const byUser = new Map(stats.map((s) => [s.userId, s]));
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: users.map((u) => {
        const s = byUser.get(u.id);
        return {
          ...this.cipher.decryptUser(u),
          paidOrders: s?._count._all ?? 0,
          paidNumbers: s?._sum.quantity ?? 0,
          spentCents: s?._sum.totalCents ?? 0,
        };
      }),
    };
  }

  async buyer(id: string) {
    const u = this.cipher.decryptUser(await this.prisma.user.findFirst({ where: { id, role: 'BUYER' } }));
    if (!u) throw new NotFoundException('Comprador não encontrado');
    return {
      id: u.id,
      name: u.name,
      socialName: u.socialName,
      phone: u.phone,
      cpf: u.cpf,
      email: u.email,
      birthDate: u.birthDate,
      createdAt: u.createdAt,
      address: u.zipCode
        ? { zipCode: u.zipCode, street: u.street, number: u.streetNumber, district: u.district, city: u.city, state: u.state, complement: u.complement, reference: u.reference }
        : null,
      orders: await this.orders.listForBuyer(u.id),
    };
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  async dashboard() {
    const [byStatus, refundsPending, buyers, raffles, perRaffle, daily, today] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true }, _sum: { totalCents: true, subtotalCents: true } }),
      this.prisma.order.count({ where: { refundRequired: true, refundedAt: null } }),
      this.prisma.user.count({ where: { role: 'BUYER' } }),
      this.prisma.raffle.findMany({
        where: { status: { in: ['ACTIVE', 'PAUSED', 'CLOSED'] } },
        orderBy: { publishedAt: 'desc' },
        select: { id: true, title: true, slug: true, status: true, totalNumbers: true, paidCount: true, reservedCount: true, priceCents: true, drawDate: true, coverKey: true },
      }),
      this.prisma.order.groupBy({ by: ['raffleId'], where: { status: 'PAID' }, _sum: { subtotalCents: true }, _count: { _all: true } }),
      // Faturamento dos últimos 30 dias, por dia no horário de Brasília (paidAt é gravado em UTC).
      this.prisma.$queryRaw<Array<{ day: string; revenue: bigint; orders: bigint }>>`
        SELECT to_char(date_trunc('day', ("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS day,
               SUM("subtotalCents")::bigint AS revenue, COUNT(*)::bigint AS orders
          FROM orders
         WHERE status = 'PAID' AND "paidAt" >= now() - interval '30 days'
         GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<Array<{ revenue: bigint | null; orders: bigint }>>`
        SELECT SUM("subtotalCents")::bigint AS revenue, COUNT(*)::bigint AS orders
          FROM orders
         WHERE status = 'PAID'
           AND (("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date`,
    ]);

    const status = Object.fromEntries(byStatus.map((s) => [s.status, s]));
    const revenue = new Map(perRaffle.map((p) => [p.raffleId, p]));
    return {
      // Faturamento = valor dos números (a taxa do Pix vai para o gateway).
      revenueCents: status.PAID?._sum.subtotalCents ?? 0,
      feesCents: (status.PAID?._sum.totalCents ?? 0) - (status.PAID?._sum.subtotalCents ?? 0),
      paidOrders: status.PAID?._count._all ?? 0,
      pendingOrders: status.PENDING?._count._all ?? 0,
      expiredOrders: (status.EXPIRED?._count._all ?? 0) + (status.CANCELED?._count._all ?? 0),
      refundsPending,
      buyers,
      today: { revenueCents: Number(today[0]?.revenue ?? 0), orders: Number(today[0]?.orders ?? 0) },
      daily: daily.map((d) => ({ day: d.day, revenueCents: Number(d.revenue), orders: Number(d.orders) })),
      raffles: raffles.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        status: r.status,
        drawDate: r.drawDate,
        totalNumbers: r.totalNumbers,
        paid: r.paidCount,
        reserved: r.reservedCount,
        percent: r.totalNumbers ? Math.floor((r.paidCount / r.totalNumbers) * 1000) / 10 : 0,
        revenueCents: revenue.get(r.id)?._sum.subtotalCents ?? 0,
        paidOrders: revenue.get(r.id)?._count._all ?? 0,
        cover: this.uploads.urls(r.coverKey),
      })),
    };
  }
}
