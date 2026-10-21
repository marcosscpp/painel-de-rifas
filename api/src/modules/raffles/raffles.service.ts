import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type RaffleStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { type UploadedImage, UploadsService } from '../uploads/uploads.service.js';
import type { CreateRaffleDto, ListRafflesQuery, SetPackagesDto, UpdateRaffleDto } from './dto/raffle.dto.js';
import {
  isFinished,
  lockedFieldsTouched,
  nextStatus,
  publishProblems,
  type RaffleAction,
  slugify,
} from './raffle.rules.js';

const fullInclude = {
  packages: { orderBy: { quantity: 'asc' } },
  prizes: {
    orderBy: { position: 'asc' },
    include: { images: { orderBy: { position: 'asc' } } },
  },
} satisfies Prisma.RaffleInclude;

export type RaffleFull = Prisma.RaffleGetPayload<{ include: typeof fullInclude }>;

const toDate = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : new Date(v);

@Injectable()
export class RafflesService {
  private readonly logger = new Logger(RafflesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  // ─── Leitura ───────────────────────────────────────────────────────────────

  async list(q: ListRafflesQuery) {
    const where: Prisma.RaffleWhereInput = {
      status: q.status,
      ...(q.q && {
        OR: [
          { title: { contains: q.q, mode: 'insensitive' } },
          { slug: { contains: q.q.toLowerCase() } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.raffle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.raffle.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async get(id: string): Promise<RaffleFull> {
    const r = await this.prisma.raffle.findUnique({ where: { id }, include: fullInclude });
    if (!r) throw new NotFoundException('Rifa não encontrada');
    return r;
  }

  // Público: nunca mostra rascunho.
  async getPublic(slug: string): Promise<RaffleFull> {
    const r = await this.prisma.raffle.findFirst({
      where: { slug, status: { not: 'DRAFT' } },
      include: fullInclude,
    });
    if (!r) throw new NotFoundException('Rifa não encontrada');
    return r;
  }

  async listPublic() {
    const order: Record<RaffleStatus, number> = { ACTIVE: 0, PAUSED: 1, CLOSED: 2, DRAWN: 3, DRAFT: 9 };
    const items = await this.prisma.raffle.findMany({
      where: { status: { not: 'DRAFT' } },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: { prizes: { orderBy: { position: 'asc' }, take: 1 } },
    });
    return items.sort((a, b) => order[a.status] - order[b.status]);
  }

  // Página da grade: status de cada número como texto compacto (0 livre, 1 reservado, 2 pago).
  // Varre a chave primária por faixa, então custa o mesmo com 1 mil ou 1 milhão de números.
  async numbersPage(slug: string, from: number, size: number) {
    const r = await this.prisma.raffle.findFirst({
      where: { slug, status: { not: 'DRAFT' } },
      select: { id: true, totalNumbers: true },
    });
    if (!r) throw new NotFoundException('Rifa não encontrada');
    const start = Math.min(Math.max(0, from), r.totalNumbers);
    const end = Math.min(start + size, r.totalNumbers);
    const rows = await this.prisma.$queryRaw<Array<{ number: number; status: string }>>`
      SELECT number, status::text AS status FROM raffle_numbers
       WHERE "raffleId" = ${r.id}::uuid AND number >= ${start} AND number < ${end}
       ORDER BY number`;
    const code: Record<string, string> = { AVAILABLE: '0', RESERVED: '1', PAID: '2' };
    return { from: start, size: end - start, total: r.totalNumbers, statuses: rows.map((x) => code[x.status]).join('') };
  }

  // ─── Escrita ───────────────────────────────────────────────────────────────

  async create(dto: CreateRaffleDto) {
    const slug = await this.uniqueSlug(dto.slug || slugify(dto.title));
    const min = dto.minPerOrder ?? 1;
    const max = dto.maxPerOrder ?? Math.min(1000, dto.totalNumbers);
    this.assertLimits(min, max, dto.totalNumbers);

    return this.prisma.raffle.create({
      data: {
        ...dto,
        slug,
        rules: dto.rules ?? '',
        minPerOrder: min,
        maxPerOrder: max,
        startsAt: toDate(dto.startsAt),
        endsAt: toDate(dto.endsAt),
        drawDate: toDate(dto.drawDate),
      },
      include: fullInclude,
    });
  }

  async update(id: string, dto: UpdateRaffleDto) {
    const current = await this.get(id);
    if (isFinished(current.status)) {
      throw new ConflictException('Rifa encerrada não pode ser editada');
    }

    const data = {
      ...dto,
      startsAt: toDate(dto.startsAt),
      endsAt: toDate(dto.endsAt),
      drawDate: toDate(dto.drawDate),
    };

    if (current.status !== 'DRAFT') {
      const touched = lockedFieldsTouched(current, data);
      if (touched.length) {
        throw new ConflictException(`Não pode mudar depois de publicada: ${touched.join(', ')}`);
      }
    }
    if (data.slug && data.slug !== current.slug) data.slug = await this.uniqueSlug(data.slug, id);

    this.assertLimits(
      data.minPerOrder ?? current.minPerOrder,
      data.maxPerOrder ?? current.maxPerOrder,
      data.totalNumbers ?? current.totalNumbers,
    );

    return this.prisma.raffle.update({ where: { id }, data, include: fullInclude });
  }

  async remove(id: string) {
    const r = await this.get(id);
    if (r.status !== 'DRAFT') {
      throw new ConflictException('Só rascunhos podem ser excluídos; encerre a rifa');
    }
    await this.prisma.raffle.delete({ where: { id } });
    await this.uploads.deleteImages([r.coverKey, ...r.prizes.flatMap((p) => p.images.map((i) => i.key))]);
  }

  async setPackages(id: string, dto: SetPackagesDto) {
    const r = await this.get(id);
    if (isFinished(r.status)) throw new ConflictException('Rifa encerrada');

    const quantities = dto.items.map((i) => i.quantity);
    if (new Set(quantities).size !== quantities.length) {
      throw new BadRequestException('Pacotes com quantidade repetida');
    }
    const out = quantities.filter((q) => q < r.minPerOrder || q > r.maxPerOrder);
    if (out.length) {
      throw new BadRequestException(
        `Pacotes fora do limite por pedido (${r.minPerOrder} a ${r.maxPerOrder}): ${out.join(', ')}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.rafflePackage.deleteMany({ where: { raffleId: id } }),
      this.prisma.rafflePackage.createMany({
        data: dto.items.map((i, position) => ({
          raffleId: id,
          quantity: i.quantity,
          highlighted: !!i.highlighted,
          position,
        })),
      }),
    ]);
    return this.get(id);
  }

  async setCover(id: string, file: UploadedImage | undefined) {
    const r = await this.get(id);
    if (r.status === 'DRAWN') throw new ConflictException('Rifa já sorteada');
    const key = await this.uploads.saveImage(file, `raffles/${id}`);
    await this.prisma.raffle.update({ where: { id }, data: { coverKey: key } });
    await this.uploads.deleteImages([r.coverKey]);
    return this.get(id);
  }

  async transition(id: string, action: RaffleAction) {
    const r = await this.get(id);
    const to = nextStatus(r.status, action);
    if (!to) throw new ConflictException(`Não é possível "${action}" com a rifa em ${r.status}`);

    if (action === 'publish') return this.publish(r);

    // updateMany com o status atual no filtro: se duas abas clicarem juntas, só uma vence.
    const { count } = await this.prisma.raffle.updateMany({
      where: { id, status: r.status },
      data: { status: to },
    });
    if (!count) throw new ConflictException('A rifa mudou enquanto você editava; recarregue');
    return this.get(id);
  }

  // Publicar = travar a rifa e gerar uma linha por número (0 até total-1), tudo ou nada.
  private async publish(r: RaffleFull) {
    const problems = publishProblems({ ...r, prizeCount: r.prizes.length });
    if (problems.length) throw new BadRequestException(problems);

    const started = Date.now();
    await this.prisma.$transaction(
      async (tx) => {
        const { count } = await tx.raffle.updateMany({
          where: { id: r.id, status: 'DRAFT' },
          data: { status: 'ACTIVE', publishedAt: new Date() },
        });
        if (!count) throw new ConflictException('A rifa já foi publicada');

        await tx.$executeRaw`
          INSERT INTO raffle_numbers ("raffleId", "number")
          SELECT ${r.id}::uuid, n FROM generate_series(0, ${r.totalNumbers - 1}) AS n`;
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
    this.logger.log(`Rifa ${r.slug} publicada com ${r.totalNumbers} números em ${Date.now() - started} ms`);
    return this.get(r.id);
  }

  // ─── Auxiliares ────────────────────────────────────────────────────────────

  private assertLimits(min: number, max: number, total: number) {
    if (min > max) throw new BadRequestException('Mínimo por pedido maior que o máximo');
    if (max > total) throw new BadRequestException('Máximo por pedido maior que o total de números');
  }

  private async uniqueSlug(base: string, ignoreId?: string) {
    const root = base || 'rifa';
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? root : `${root}-${i + 1}`;
      const hit = await this.prisma.raffle.findUnique({ where: { slug }, select: { id: true } });
      if (!hit || hit.id === ignoreId) return slug;
    }
    throw new ConflictException('Não foi possível gerar um slug único');
  }
}
