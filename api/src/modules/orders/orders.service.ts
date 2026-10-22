import { randomInt } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client.js';
import { maskPhone } from '../../common/utils/br.js';
import { PiiCipher } from '../../infra/crypto/pii-cipher.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  GatewayError,
  type GatewayEvent,
  PAYMENT_PROVIDER,
  type PaymentGateway,
} from '../payments/payment-provider.js';
import { RafflesPresenter } from '../raffles/raffles.presenter.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
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

export type PaymentOutcome = 'paid' | 'late-recovered' | 'refund-required' | 'already-confirmed' | 'unknown-charge';

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly simulateAllowed: boolean;
  private expiring = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly raffles: RafflesPresenter,
    private readonly uploads: UploadsService,
    config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly gateway: PaymentGateway,
    private readonly settings: SettingsService,
    private readonly cipher: PiiCipher,
  ) {
    this.simulateAllowed = gateway.name === 'FAKE' && config.get('NODE_ENV') !== 'production';
  }

  // ─── Criação ───────────────────────────────────────────────────────────────
  //
  // Garantias:
  // - número nunca vai para dois pedidos: SELECT ... FOR UPDATE SKIP LOCKED + UPDATE na mesma transação;
  // - pedido nunca duplica: idempotencyKey única (reenvio devolve o mesmo pedido);
  // - rifa pausada no meio da compra: o UPDATE final do contador exige status ACTIVE, senão desfaz tudo;
  // - Pix que não pôde ser gerado: o pedido é cancelado e os números voltam na hora.

  // buyerId: comprador já resolvido pelo controller (cadastro do checkout ou sessão "Comprando como").
  async create(dto: CreateOrderDto, buyerId: string) {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      await this.ensureCharge(existing.id);
      return this.get(existing.id);
    }

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

    const subtotal = qty * raffle.priceCents;
    // Taxa e tempo de reserva vêm das configurações do admin (cache de poucos segundos).
    const { pixFeeCents: feeCents, reservationMinutes } = await this.settings.get();
    const expiresAt = new Date(Date.now() + reservationMinutes * 60_000);

    let result: { orderId: string; picked: number[] };
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.order.create({
            data: {
              raffleId: raffle.id,
              userId: buyerId,
              quantity: qty,
              subtotalCents: subtotal,
              feeCents,
              totalCents: subtotal + feeCents,
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
          await tx.order.update({ where: { id: order.id }, data: { reservedNumbers: picked } });

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
      if (isUniqueViolation(e)) {
        const dup = await this.prisma.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (dup) {
          await this.ensureCharge(dup.id);
          return this.get(dup.id);
        }
      }
      throw e;
    }

    this.realtime.numbersChanged(raffle.slug, 'RESERVED', result.picked);
    this.realtime.progressChanged(raffle.slug, () => this.readProgress(raffle.id));

    await this.ensureCharge(result.orderId);
    return this.get(result.orderId);
  }

  // Gera a cobrança Pix de um pedido pendente que ainda não tem. Chamado na criação e no reenvio.
  // Se o gateway falhar, cancela o pedido para não segurar números de ninguém.
  private async ensureCharge(orderId: string) {
    const o = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: { select: { id: true } }, user: true, raffle: { select: { title: true } } },
    });
    if (!o || o.status !== 'PENDING' || o.payment) return;
    const user = this.cipher.decryptUser(o.user);

    let charge;
    try {
      charge = await this.gateway.createCharge({
        orderId: o.id,
        amountCents: o.totalCents,
        description: `${o.quantity} número(s) - ${o.raffle.title}`,
        expiresAt: o.expiresAt,
        buyer: {
          userId: user.id,
          name: user.name,
          phone: user.phone,
          cpf: user.cpf,
          gatewayCustomerId: user.gatewayCustomerId,
        },
      });
    } catch (e) {
      this.logger.error(`Falha ao gerar Pix do pedido ${o.id}: ${String(e)}`);
      await this.release(o.id, 'CANCELED');
      const userFacing = e instanceof GatewayError && e.status === 400 ? e.message : null;
      throw new BadGatewayException(userFacing ?? 'Não foi possível gerar o Pix agora. Tente de novo em instantes.');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            orderId: o.id,
            provider: this.gateway.name,
            providerChargeId: charge.providerChargeId,
            amountCents: o.totalCents,
            pixCopyPaste: charge.pixCopyPaste,
            pixQrCodeBase64: charge.pixQrCodeBase64,
          },
        }),
        ...(charge.gatewayCustomerId
          ? [this.prisma.user.update({ where: { id: o.user.id }, data: { gatewayCustomerId: charge.gatewayCustomerId } })]
          : []),
      ]);
    } catch (e) {
      // Outra requisição do mesmo pedido gravou a cobrança primeiro: cancela a que sobrou.
      if (isUniqueViolation(e)) {
        await this.gateway.cancelCharge(charge.providerChargeId).catch(() => undefined);
        return;
      }
      throw e;
    }
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

  // ─── Pagamento ─────────────────────────────────────────────────────────────
  //
  // O gateway entrega cada evento "pelo menos uma vez". A tabela webhook_events tem chave
  // única (provider, eventId): o mesmo evento chegando de novo é ignorado. Se o processamento
  // falhar, o registro é apagado para o gateway reenviar e tentar de novo.

  async handleGatewayEvent(ev: GatewayEvent): Promise<PaymentOutcome | 'duplicate' | 'ignored'> {
    try {
      await this.prisma.webhookEvent.create({
        data: { provider: this.gateway.name, eventId: ev.eventId, type: ev.type, payload: ev },
      });
    } catch (e) {
      if (isUniqueViolation(e)) return 'duplicate';
      throw e;
    }

    try {
      const outcome = ev.paid && ev.chargeId ? await this.confirmPayment(ev.chargeId) : 'ignored';
      await this.prisma.webhookEvent.update({
        where: { provider_eventId: { provider: this.gateway.name, eventId: ev.eventId } },
        data: { processedAt: new Date() },
      });
      return outcome;
    } catch (e) {
      await this.prisma.webhookEvent
        .delete({ where: { provider_eventId: { provider: this.gateway.name, eventId: ev.eventId } } })
        .catch(() => undefined);
      throw e;
    }
  }

  // Confirma o Pix de uma cobrança. A linha do pedido é travada (FOR UPDATE) para não
  // cruzar com a expiração: ou o pagamento chega antes e o pedido vira PAID, ou chega
  // depois e entra no caminho do pagamento atrasado.
  async confirmPayment(providerChargeId: string): Promise<PaymentOutcome> {
    const out = await this.prisma.$transaction(async (tx) => {
      const pay = await tx.payment.findUnique({
        where: { provider_providerChargeId: { provider: this.gateway.name, providerChargeId } },
        select: { id: true, status: true, orderId: true },
      });
      if (!pay) return { outcome: 'unknown-charge' as const };
      if (pay.status === 'CONFIRMED') return { outcome: 'already-confirmed' as const };

      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${pay.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: pay.orderId },
        include: { raffle: { select: { id: true, slug: true } } },
      });
      const now = new Date();
      await tx.payment.update({ where: { id: pay.id }, data: { status: 'CONFIRMED', confirmedAt: now } });

      if (order.status === 'PENDING') {
        const paid = await tx.$queryRaw<Array<{ number: number }>>`
          UPDATE raffle_numbers SET status = 'PAID', "reservedUntil" = NULL
           WHERE "orderId" = ${order.id}::uuid AND status = 'RESERVED'
          RETURNING number`;
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: now } });
        await tx.raffle.update({
          where: { id: order.raffleId },
          data: { reservedCount: { decrement: paid.length }, paidCount: { increment: paid.length } },
        });
        return { outcome: 'paid' as const, order, numbers: paid.map((p) => p.number) };
      }

      if (order.status === 'PAID') return { outcome: 'already-confirmed' as const };

      // Pagou depois de expirar/cancelar: se os mesmos números ainda estão livres, devolve-os.
      const free = await tx.$queryRaw<Array<{ number: number }>>`
        SELECT number FROM raffle_numbers
         WHERE "raffleId" = ${order.raffleId}::uuid AND number = ANY(${order.reservedNumbers}::int[])
           AND status = 'AVAILABLE'
         FOR UPDATE`;
      if (order.reservedNumbers.length && free.length === order.reservedNumbers.length) {
        await tx.$executeRaw`
          UPDATE raffle_numbers SET status = 'PAID', "orderId" = ${order.id}::uuid, "reservedUntil" = NULL
           WHERE "raffleId" = ${order.raffleId}::uuid AND number = ANY(${order.reservedNumbers}::int[])`;
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: now } });
        await tx.raffle.update({
          where: { id: order.raffleId },
          data: { paidCount: { increment: free.length } },
        });
        return { outcome: 'late-recovered' as const, order, numbers: order.reservedNumbers };
      }

      // Algum número já foi para outra pessoa: o dinheiro precisa voltar (painel de pedidos).
      await tx.order.update({ where: { id: order.id }, data: { refundRequired: true } });
      return { outcome: 'refund-required' as const, order, numbers: [] as number[] };
    });

    if ('order' in out && out.order && out.outcome !== 'refund-required') {
      const { order, numbers } = out;
      this.realtime.orderStatus(order.id, 'PAID');
      this.realtime.numbersChanged(order.raffle.slug, 'PAID', numbers);
      this.realtime.progressChanged(order.raffle.slug, () => this.readProgress(order.raffle.id));
    }
    if (out.outcome === 'refund-required' && 'order' in out && out.order) {
      this.logger.warn(`Pedido ${out.order.id} pago depois de expirar com números já vendidos: reembolso necessário`);
      this.realtime.orderStatus(out.order.id, out.order.status);
    }
    return out.outcome;
  }

  // Ambiente de desenvolvimento: simula o webhook de pagamento do gateway falso.
  async simulatePayment(orderId: string) {
    if (!this.simulateAllowed) throw new NotFoundException();
    const pay = await this.prisma.payment.findUnique({ where: { orderId }, select: { providerChargeId: true } });
    if (!pay) throw new NotFoundException('Pedido sem cobrança');
    const outcome = await this.handleGatewayEvent({
      eventId: `sim_${orderId}_${Date.now()}`,
      type: 'PAID',
      chargeId: pay.providerChargeId,
      paid: true,
    });
    return { outcome, order: await this.get(orderId) };
  }

  // ─── Leitura ───────────────────────────────────────────────────────────────

  async get(id: string) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        raffle: true,
        user: { select: { name: true, phone: true, cpf: true } },
        numbers: { select: { number: true }, orderBy: { number: 'asc' } },
        payment: true,
      },
    });
    if (!o) throw new NotFoundException('Pedido não encontrado');
    const pending = o.status === 'PENDING';
    const user = this.cipher.decryptUser(o.user);
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
      refundRequired: o.refundRequired,
      // Pedido expirado vem sem números: eles já voltaram para a venda.
      numbers: o.numbers.map((n) => n.number),
      // Quem tem o link do pedido vê só o primeiro nome e dados mascarados (como no Wesley).
      buyer: {
        name: user.name.split(' ')[0],
        phone: user.phone ? maskPhone(user.phone) : null,
        cpf: user.cpf ? user.cpf.slice(0, 3) + '.***.***-**' : null,
      },
      raffle: {
        slug: o.raffle.slug,
        title: o.raffle.title,
        totalNumbers: o.raffle.totalNumbers,
        priceCents: o.raffle.priceCents,
        drawDate: o.raffle.drawDate,
        cover: this.uploads.urls(o.raffle.coverKey),
      },
      // QR Code e copia e cola só enquanto dá para pagar.
      payment: o.payment
        ? {
            status: o.payment.status,
            pixCopyPaste: pending ? o.payment.pixCopyPaste : null,
            pixQrCodeBase64: pending ? o.payment.pixQrCodeBase64 : null,
            canSimulate: pending && this.simulateAllowed,
          }
        : null,
    };
  }

  // "Meus números": compras do comprador, mais recentes primeiro. Pedidos expirados/cancelados
  // aparecem sem números (eles voltaram para a venda).
  async listForBuyer(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        raffle: { select: { slug: true, title: true, status: true, drawDate: true, totalNumbers: true, coverKey: true } },
        numbers: { select: { number: true }, orderBy: { number: 'asc' } },
      },
    });
    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      quantity: o.quantity,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,
      paidAt: o.paidAt,
      refundRequired: o.refundRequired,
      numbers: o.numbers.map((n) => n.number),
      raffle: {
        slug: o.raffle.slug,
        title: o.raffle.title,
        status: o.raffle.status,
        drawDate: o.raffle.drawDate,
        totalNumbers: o.raffle.totalNumbers,
        cover: this.uploads.urls(o.raffle.coverKey),
      },
    }));
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

  // Devolve os números de um pedido pendente para a venda e cancela o Pix no gateway.
  // Seguro rodar em paralelo: só quem conseguir mudar o pedido de PENDING continua.
  async release(orderId: string, to: 'EXPIRED' | 'CANCELED') {
    const out = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { raffleId: true, payment: { select: { providerChargeId: true } } },
      });
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
      if (order.payment) {
        await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'EXPIRED' } });
      }
      return { raffle, numbers: freed.map((f) => f.number), chargeId: order.payment?.providerChargeId };
    });
    if (!out) return;

    // Melhor esforço: se o cancelamento falhar e a pessoa pagar, cai no caminho do pagamento atrasado.
    if (out.chargeId) {
      await this.gateway.cancelCharge(out.chargeId).catch((e: unknown) => {
        this.logger.warn(`Não foi possível cancelar a cobrança ${out.chargeId}: ${String(e)}`);
      });
    }
    this.realtime.orderStatus(orderId, to);
    this.realtime.numbersChanged(out.raffle.slug, 'AVAILABLE', out.numbers);
    this.realtime.progressChanged(out.raffle.slug, () => this.readProgress(out.raffle.id));
  }
}
