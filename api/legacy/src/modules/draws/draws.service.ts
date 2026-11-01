import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { maskPhone } from '../../common/utils/br.js';
import { PiiCipher } from '../../infra/crypto/pii-cipher.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { candidates, type DrawOutcome, explain, resolveWinner } from './draw.rules.js';
import type { DrawDto } from './dto/draw.dto.js';
import { CAIXA_FEDERAL_URL, parseFederal } from './federal-result.js';

type Db = PrismaService | Prisma.TransactionClient;

// "Maria S." — o suficiente para o ganhador se reconhecer na página pública.
export const publicWinnerName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
};

const publicWinnerLabel = (w: { name: string; city: string | null; state: string | null }) =>
  [publicWinnerName(w.name), w.city && w.state ? `${w.city}/${w.state}` : null].filter(Boolean).join(' · ');

// Concurso que não existe (ou ainda não foi sorteado) volta como 500 com "StatusCode":404 no corpo.
const caixaNotFound = (res: Response, body: string) => res.status === 404 || /StatusCode\\?":404/.test(body);

@Injectable()
export class DrawsService {
  private readonly logger = new Logger(DrawsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: PiiCipher,
  ) {}

  // Espera antes de cada nova tentativa na Caixa (3 tentativas no total). Os testes zeram.
  retryDelaysMs = [500, 1_500];

  // Busca os 5 prêmios de um concurso na Caixa. O admin ainda confere na prévia antes de publicar.
  // Falha de rede, tempo esgotado e erro 5xx/429 tentam de novo; concurso não encontrado e
  // resposta fora do formato não (repetir não muda nada).
  async federalResult(contest: string) {
    let res: Response | null = null;
    let body = '';
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetch(`${CAIXA_FEDERAL_URL}/${Number(contest)}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4_000),
        });
        body = await res.text();
      } catch (e) {
        res = null;
        this.logger.warn(`Caixa indisponível (tentativa ${attempt + 1}): ${String(e)}`);
      }
      const transient = !res || (!res.ok && !caixaNotFound(res, body) && (res.status >= 500 || res.status === 429));
      if (!transient || attempt >= this.retryDelaysMs.length) break;
      await new Promise((r) => setTimeout(r, this.retryDelaysMs[attempt]));
    }

    if (!res) throw new ServiceUnavailableException('Não foi possível falar com a Caixa agora. Digite os prêmios à mão.');
    if (!res.ok) {
      if (caixaNotFound(res, body)) {
        throw new NotFoundException(`Concurso ${contest} não encontrado na Caixa (ainda não foi sorteado?)`);
      }
      this.logger.warn(`Caixa respondeu ${res.status} para o concurso ${contest}`);
      throw new ServiceUnavailableException('A Caixa não respondeu direito agora. Digite os prêmios à mão.');
    }
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      throw new BadGatewayException('Resposta da Caixa em formato inesperado. Digite os prêmios à mão.');
    }
    const out = parseFederal(json, contest);
    if ('error' in out) throw new BadGatewayException(`${out.error}. Digite os prêmios à mão.`);
    return out;
  }

  // Prévia: calcula o ganhador sem gravar nada (o admin confere antes de publicar).
  async preview(raffleId: string, dto: DrawDto) {
    const raffle = await this.closedRaffle(this.prisma, raffleId);
    const outcome = await this.compute(this.prisma, raffle, dto.prizes);
    return this.present(raffle, outcome, await this.winnerOf(this.prisma, raffle.id, outcome.winningNumber));
  }

  // Publica o resultado. Só uma vez: o UPDATE exige a rifa ainda em CLOSED.
  // Sem ganhador (nenhum prêmio caiu num número vendido) também publica: a rifa fica sorteada, sem ganhador.
  async confirm(raffleId: string, dto: DrawDto) {
    return this.prisma.$transaction(async (tx) => {
      const raffle = await this.closedRaffle(tx, raffleId);
      const outcome = await this.compute(tx, raffle, dto.prizes);
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
    // Busca de uma vez o status dos 5 candidatos, para a regra rodar em memória.
    const sold = new Set(
      (
        await db.raffleNumber.findMany({
          where: { raffleId: raffle.id, status: 'PAID', number: { in: candidates(prizes, raffle.totalNumbers).filter((n) => n < raffle.totalNumbers) } },
          select: { number: true },
        })
      ).map((n) => n.number),
    );
    return resolveWinner(prizes, raffle.totalNumbers, (n) => sold.has(n));
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

