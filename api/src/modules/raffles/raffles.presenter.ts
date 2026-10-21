import { Injectable } from '@nestjs/common';
import type { Prize, Raffle } from '../../generated/prisma/client.js';
import { UploadsService } from '../uploads/uploads.service.js';
import type { RaffleFull } from './raffles.service.js';

// Formata a rifa para a resposta HTTP: URLs das imagens, progresso e,
// no público, só o que o comprador pode ver.
@Injectable()
export class RafflesPresenter {
  constructor(private readonly uploads: UploadsService) {}

  progress(r: Pick<Raffle, 'totalNumbers' | 'paidCount' | 'reservedCount'>) {
    const available = r.totalNumbers - r.paidCount - r.reservedCount;
    return {
      paid: r.paidCount,
      reserved: r.reservedCount,
      available,
      percent: r.totalNumbers ? Math.floor((r.paidCount / r.totalNumbers) * 1000) / 10 : 0,
    };
  }

  admin(r: RaffleFull) {
    return {
      ...r,
      cover: this.uploads.urls(r.coverKey),
      progress: this.progress(r),
      prizes: r.prizes.map((p) => ({
        ...p,
        images: p.images.map((i) => ({ id: i.id, position: i.position, ...this.uploads.urls(i.key) })),
      })),
    };
  }

  adminListItem(r: Raffle) {
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      saleMode: r.saleMode,
      totalNumbers: r.totalNumbers,
      priceCents: r.priceCents,
      drawDate: r.drawDate,
      createdAt: r.createdAt,
      publishedAt: r.publishedAt,
      cover: this.uploads.urls(r.coverKey),
      progress: this.progress(r),
    };
  }

  publicListItem(r: Raffle & { prizes: Prize[] }) {
    return {
      slug: r.slug,
      title: r.title,
      status: r.status,
      priceCents: r.priceCents,
      totalNumbers: r.totalNumbers,
      drawDate: r.drawDate,
      endsAt: r.endsAt,
      cover: this.uploads.urls(r.coverKey),
      mainPrize: r.prizes[0]?.title ?? null,
      progress: this.progress(r),
    };
  }

  publicDetail(r: RaffleFull) {
    return {
      slug: r.slug,
      title: r.title,
      description: r.description,
      rules: r.rules,
      status: r.status,
      saleMode: r.saleMode,
      totalNumbers: r.totalNumbers,
      priceCents: r.priceCents,
      minPerOrder: r.minPerOrder,
      maxPerOrder: r.maxPerOrder,
      endsAt: r.endsAt,
      drawDate: r.drawDate,
      cover: this.uploads.urls(r.coverKey),
      progress: this.progress(r),
      packages: r.packages.map((p) => ({
        quantity: p.quantity,
        highlighted: p.highlighted,
        totalCents: p.quantity * r.priceCents,
      })),
      prizes: r.prizes.map((p) => ({
        position: p.position,
        title: p.title,
        description: p.description,
        kind: p.kind,
        valueCents: p.valueCents,
        images: p.images.map((i) => this.uploads.urls(i.key)),
      })),
      result:
        r.status === 'DRAWN'
          ? { lotteryContest: r.lotteryContest, winningNumber: r.winningNumber, drawnAt: r.drawnAt }
          : null,
    };
  }
}
