import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client.js';
import { maskPhone } from '../../common/utils/br.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RafflesPresenter } from '../raffles/raffles.presenter.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { UsersService } from '../users/users.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

type Tx = Prisma.TransactionClient;

export class NumbersUnavailableException extends ConflictException {
  constructor(numbers: number[]) {
    super({
      statusCode: 409,
      error: 'Conflict',
      message: 'Alguns números acabaram de ser reservados por outra pessoa',
      unavailable: numbers,
    });
  }
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly reservationMs: number;
  private readonly feeCents: number;
  private expiring = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly realtime: RealtimeService,
    private readonly raffles: RafflesPresenter,
    private readonly uploads: UploadsService,
    config: ConfigService,
  ) {
    this.reservationMs = config.getOrThrow<number>('RESERVATION_MINUTES') * 60_000;
    this.feeCents = config.getOrThrow<number>('PIX_FEE_CENTS');
  }

  // ─── Criação ───────────────────────────────────────────────────────────────
  //
  // Garantias:
  // - número nunca vai para dois pedidos: SELECT ... FOR UPDATE SKIP LOCKED + UPDATE na mesma transação;
  // - pedido nunca duplica: idempotencyKey única (reenvio devolve o mesmo pedido);
  // - rifa pausada no meio da compra: o UPDATE final do contador exige status ACTIVE, senão desfaz tudo.

  async create(dto: CreateOrderDto) {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      select: { id: true },
    });
    if (existing) return this.get(existing.id);

    if ((dto.quantity == null) === (dto.numbers == null)) {
      throw new BadRequestException('Informe a quantidade ou os números, um dos dois');
    }

    const raffle = await this.prisma.raffle.findUnique({ where: { slug: dto.raffleSlug } });
    if (!raffle || raffle.status === 'DRAFT') throw new NotFoundException('Rifa não encontrada');
    if (raffle.status !== 'ACTIVE') throw new ConflictException('As vendas desta rifa não estão abertas');
    if (raffle.endsAt && raffle.endsAt <= new Date()) throw new ConflictException('As vendas desta rifa terminaram');

    if (dto.numbers && raffle.saleMode === 'QUANTITY') {
      throw new BadRequestException('Esta rifa não permite escolher números');
    }
    if (dto.quantity != null && raffle.saleMode === 'PICK') {
      throw new BadRequestException('Nesta rifa você escolhe os números na grade');
    }
    const qty = dto.numbers?.length ?? dto.quantity!;
    if (qty < raffle.minPerOrder || qty > raffle.maxPerOrder) {
      throw new BadRequestException(`Escolha de ${raffle.minPerOrder} a ${raffle.maxPerOrder} números`);
    }
    const outOfRange = dto.numbers?.filter((n) => n >= raffle.totalNumbers) ?? [];
    if (outOfRange.length) throw new BadRequestException(`Números inexistentes: ${outOfRange.join(', ')}`);

    const buyer = await this.users.upsertBuyer(dto.buyer);
    const subtotal = qty * raffle.priceCents;
    const expiresAt = new Date(Date.now() + this.reservationMs);

    let result: { orderId: string; picked: number[] };
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.order.create({
            data: {
              raffleId: raffle.id,
              userId: buyer.id,
              quantity: qty,
              subtotalCents: subtotal,
              feeCents: this.feeCents,
              totalCents: subtotal + this.feeCents,
              idempotencyKey: dto.idempotencyKey,
              expiresAt,
            },
            select: { id: true },
          });

          const picked = dto.numbers
            ? await this.lockChosen(tx, raffle.id, dto.numbers)
            : await this.lockRandom(tx, raffle.id, raffle.totalNumbers, qty);

          await tx.$executeRaw`
            UPDATE raffle_numbers
               SET status = 'RESERVED', "orderId" = ${order.id}::uuid, "reservedUntil" = ${expiresAt}
             WHERE "raffleId" = ${raffle.id}::uuid AND number = ANY(${picked}::int[])`;

          // Último comando: segura a linha da rifa pelo menor tempo possível.
          const ok = await tx.$executeRaw`
            UPDATE raffles SET "reservedCount" = "reservedCount" + ${qty}
             WHERE id = ${raffle.id}::uuid AND status = 'ACTIVE'`;
          if (!ok) throw new ConflictException('As vendas desta rifa foram pausadas');

          return { orderId: order.id, picked };
        },
        { maxWait: 5_000, timeout: 15_000 },
      );
    } catch (e) {
      // Mesmo pedido enviado duas vezes ao mesmo tempo: o segundo devolve o primeiro.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const dup = await this.prisma.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (dup) return this.get(dup.id);
      }
      throw e;
    }

    this.realtime.numbersChanged(raffle.slug, 'RESERVED', result.picked);
    this.realtime.progressChanged(raffle.slug, () => this.readProgress(raffle.id));
    return this.get(result.orderId);
  }

  // Escolhidos na grade: trava os que estão livres; se faltar algum, desfaz e diz quais.
  private async lockChosen(tx: Tx, raffleId: string, numbers: number[]) {
    const rows = await tx.$queryRaw<Array<{ number: number }>>`
      SELECT number FROM raffle_numbers
       WHERE "raffleId" = ${raffleId}::uuid AND number = ANY(${numbers}::int[]) AND status = 'AVAILABLE'
       FOR UPDATE SKIP LOCKED`;
    if (rows.length < numbers.length) {
      const got = new Set(rows.map((r) => r.number));
      throw new NumbersUnavailableException(numbers.filter((n) => !got.has(n)));
    }
    return rows.map((r) => r.number);
  }

  // Aleatórios: sorteia candidatos (crypto.randomInt) e trava os livres pela chave primária.
  // Perto de esgotar, completa varrendo os livres a partir de um ponto aleatório.
  private async lockRandom(tx: Tx, raffleId: string, total: number, qty: number) {
    const candidates = new Set<number>();
    const want = Math.min(total, qty * 3 + 20);
    while (candidates.size < want) candidates.add(randomInt(0, total));

    const picked = (
      await tx.$queryRaw<Array<{ number: number }>>`
        SELECT number FROM raffle_numbers
         WHERE "raffleId" = ${raffleId}::uuid AND number = ANY(${[...candidates]}::int[]) AND status = 'AVAILABLE'
         ORDER BY random() -- sem isso o LIMIT pega sempre os menores (ordem do índice)
         LIMIT ${qty}
         FOR UPDATE SKIP LOCKED`
    ).map((r) => r.number);

    if (picked.length < qty) {
      const start = randomInt(0, total);
      for (const range of [
        Prisma.sql`number >= ${start}`,
        Prisma.sql`number < ${start}`,
      ]) {
        const need = qty - picked.length;
        if (!need) break;
        const more = await tx.$queryRaw<Array<{ number: number }>>`
          SELECT number FROM raffle_numbers
           WHERE "raffleId" = ${raffleId}::uuid AND status = 'AVAILABLE' AND ${range}
             AND NOT (number = ANY(${picked}::int[]))
           ORDER BY number
           LIMIT ${need}
           FOR UPDATE SKIP LOCKED`;
        picked.push(...more.map((r) => r.number));
      }
    }

    if (picked.length < qty) {
      throw new ConflictException(
        picked.length ? `Só restam ${picked.length} números disponíveis` : 'Números esgotados',
      );
    }
    return picked;
  }

  // ─── Leitura ───────────────────────────────────────────────────────────────

  async get(id: string) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        raffle: true,
        user: { select: { name: true, phone: true } },
        numbers: { select: { number: true }, orderBy: { number: 'asc' } },
      },
    });
    if (!o) throw new NotFoundException('Pedido não encontrado');
    return {
      id: o.id,
      status: o.status,
      quantity: o.quantity,
      subtotalCents: o.subtotalCents,
      feeCents: o.feeCents,
      totalCents: o.totalCents,
      expiresAt: o.expiresAt,
      paidAt: o.paidAt,
      createdAt: o.createdAt,
      // Pedido expirado vem sem números: eles já voltaram para a venda.
      numbers: o.numbers.map((n) => n.number),
      buyer: { name: o.user.name.split(' ')[0], phone: o.user.phone ? maskPhone(o.user.phone) : null },
      raffle: {
        slug: o.raffle.slug,
        title: o.raffle.title,
        totalNumbers: o.raffle.totalNumbers,
        priceCents: o.raffle.priceCents,
        cover: this.uploads.urls(o.raffle.coverKey),
      },
    };
  }

  private async readProgress(raffleId: string) {
    const r = await this.prisma.raffle.findUniqueOrThrow({
      where: { id: raffleId },
      select: { totalNumbers: true, paidCount: true, reservedCount: true },
    });
    return this.raffles.progress(r);
  }

  // ─── Expiração ─────────────────────────────────────────────────────────────

  @Interval(10_000)
  async expireDue() {
    if (this.expiring) return;
    this.expiring = true;
    try {
      const due = await this.prisma.order.findMany({
        where: { status: 'PENDING', expiresAt: { lt: new Date() } },
        select: { id: true },
        orderBy: { expiresAt: 'asc' },
        take: 200,
      });
      for (const { id } of due) await this.release(id, 'EXPIRED');
      if (due.length) this.logger.log(`${due.length} pedido(s) expirado(s)`);
    } catch (e) {
      this.logger.error(`Falha ao expirar pedidos: ${String(e)}`);
    } finally {
      this.expiring = false;
    }
  }

  // Devolve os números de um pedido pendente para a venda. Seguro rodar em paralelo:
  // só quem conseguir mudar o pedido de PENDING continua.
  async release(orderId: string, to: 'EXPIRED' | 'CANCELED') {
    const out = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { raffleId: true } });
      if (!order) return null;
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: to },
      });
      if (!count) return null;

      const freed = await tx.$queryRaw<Array<{ number: number }>>`
        UPDATE raffle_numbers
           SET status = 'AVAILABLE', "orderId" = NULL, "reservedUntil" = NULL
         WHERE "orderId" = ${orderId}::uuid AND status = 'RESERVED'
        RETURNING number`;

      const raffle = await tx.raffle.update({
        where: { id: order.raffleId },
        data: { reservedCount: { decrement: freed.length } },
        select: { id: true, slug: true },
      });
      return { raffle, numbers: freed.map((f) => f.number) };
    });
    if (!out) return;

    this.realtime.orderStatus(orderId, to);
    this.realtime.numbersChanged(out.raffle.slug, 'AVAILABLE', out.numbers);
    this.realtime.progressChanged(out.raffle.slug, () => this.readProgress(out.raffle.id));
  }
}
