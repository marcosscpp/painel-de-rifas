import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { maskPhone } from '../../common/utils/br.js';
import { PiiCipher } from '../../infra/crypto/pii-cipher.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { candidates, type DrawOutcome, explain, resolveWinner } from './draw.rules.js';
import type { DrawDto } from './dto/draw.dto.js';

type Db = PrismaService | Prisma.TransactionClient;

// "Maria S." — o suficiente para o ganhador se reconhecer na página pública.
export const publicWinnerName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

const publicWinnerLabel = (w: { name: string; city: string | null; state: string | null }) =>
  [publicWinnerName(w.name), w.city && w.state ? `${w.city}/${w.state}` : null].filter(Boolean).join(' · ');

@Injectable()
export class DrawsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: PiiCipher,
  ) {}

  // Prévia: calcula o ganhador sem gravar nada (o admin confere antes de publicar).
  async preview(raffleId: string, dto: DrawDto) {
    const raffle = await this.closedRaffle(this.prisma, raffleId);
    const outcome = await this.compute(this.prisma, raffle, dto.prizes);
    return this.present(raffle, outcome, await this.winnerOf(this.prisma, raffle.id, outcome.winningNumber));
  }

  // Publica o resultado. Só uma vez: o UPDATE exige a rifa ainda em CLOSED.
  async confirm(raffleId: string, dto: DrawDto) {
    return this.prisma.$transaction(async (tx) => {
      const raffle = await this.closedRaffle(tx, raffleId);
      const outcome = await this.compute(tx, raffle, dto.prizes);
      if (outcome.winningNumber === null) throw new ConflictException('Nenhum número vendido: não há ganhador');
      const winner = await this.winnerOf(tx, raffle.id, outcome.winningNumber);
      const pad = (n: number) => String(n).padStart(outcome.digits, '0');

      const { count } = await tx.raffle.updateMany({
        where: { id: raffle.id, status: 'CLOSED' },
        data: {
          status: 'DRAWN',
          lotteryContest: dto.contest,
          lotteryPrizes: dto.prizes,
          lotteryResult: explain(outcome, pad),
          winningNumber: outcome.winningNumber,
          winnerOrderId: winner?.orderId ?? null,
          winnerPublicName: winner ? publicWinnerLabel(winner) : null,
          drawnAt: new Date(),
        },
      });
      if (!count) throw new ConflictException('O resultado desta rifa já foi publicado');
      return this.present(raffle, outcome, winner);
    });
  }

  private async closedRaffle(db: Db, id: string) {
    const raffle = await db.raffle.findUnique({ where: { id }, select: { id: true, status: true, totalNumbers: true, title: true } });
    if (!raffle) throw new NotFoundException('Rifa não encontrada');
    if (raffle.status === 'DRAWN') throw new ConflictException('O resultado desta rifa já foi publicado');
    if (raffle.status !== 'CLOSED') throw new ConflictException('Encerre as vendas antes de apurar o resultado');
    return raffle;
  }

  private async compute(db: Db, raffle: { id: string; totalNumbers: number }, prizes: string[]): Promise<DrawOutcome> {
    // Busca de uma vez o status dos 5 candidatos e o próximo vendido, para a regra rodar em memória.
    const sold = new Set(
      (
        await db.raffleNumber.findMany({
          where: { raffleId: raffle.id, status: 'PAID', number: { in: candidates(prizes, raffle.totalNumbers).filter((n) => n < raffle.totalNumbers) } },
          select: { number: true },
        })
      ).map((n) => n.number),
    );
    const nextSoldCache = new Map<number, number | null>();
    const nextSold = async (from: number) => {
      if (nextSoldCache.has(from)) return nextSoldCache.get(from)!;
      const above = await db.raffleNumber.findFirst({
        where: { raffleId: raffle.id, status: 'PAID', number: { gte: from } },
        orderBy: { number: 'asc' },
        select: { number: true },
      });
      const found =
        above?.number ??
        (
          await db.raffleNumber.findFirst({
            where: { raffleId: raffle.id, status: 'PAID' },
            orderBy: { number: 'asc' },
            select: { number: true },
          })
        )?.number ??
        null;
      nextSoldCache.set(from, found);
      return found;
    };
    // resolveWinner é síncrono: pré-carrega o "próximo vendido" do 1º candidato (o único que ele consulta).
    await nextSold(candidates(prizes, raffle.totalNumbers)[0] % raffle.totalNumbers);
    return resolveWinner(prizes, raffle.totalNumbers, (n) => sold.has(n), (from) => nextSoldCache.get(from) ?? null);
  }

  private async winnerOf(db: Db, raffleId: string, number: number | null) {
    if (number === null) return null;
    const row = await db.raffleNumber.findUnique({
      where: { raffleId_number: { raffleId, number } },
      select: { orderId: true, order: { select: { user: { select: { name: true, phone: true, city: true, state: true } } } } },
    });
    if (!row?.orderId || !row.order) return null;
    const u = this.cipher.decryptUser(row.order.user);
    return { orderId: row.orderId, name: u.name, phone: u.phone, city: u.city, state: u.state };
  }

  private present(
    raffle: { id: string; title: string; totalNumbers: number },
    outcome: DrawOutcome,
    winner: Awaited<ReturnType<DrawsService['winnerOf']>>,
  ) {
    const pad = (n: number) => String(n).padStart(outcome.digits, '0');
    return {
      raffle: { id: raffle.id, title: raffle.title, totalNumbers: raffle.totalNumbers },
      digits: outcome.digits,
      method: outcome.method,
      steps: outcome.steps.map((s) => ({ ...s, candidateLabel: pad(s.candidate) })),
      winningNumber: outcome.winningNumber,
      winningLabel: outcome.winningNumber === null ? null : pad(outcome.winningNumber),
      explanation: explain(outcome, pad),
      // Admin vê o contato completo para avisar o ganhador.
      winner: winner && {
        orderId: winner.orderId,
        name: winner.name,
        phone: winner.phone,
        phoneMasked: winner.phone ? maskPhone(winner.phone) : null,
        city: winner.city,
        state: winner.state,
      },
    };
  }
}

