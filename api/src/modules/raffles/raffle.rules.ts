import type { RaffleStatus } from '../../generated/prisma/client.js';

// Regras puras da rifa (sem banco), testadas em raffle.rules.spec.ts.

export const MAX_TOTAL_NUMBERS = 1_000_000;

export type RaffleAction = 'publish' | 'pause' | 'resume' | 'close';

const TRANSITIONS: Record<RaffleAction, { from: RaffleStatus[]; to: RaffleStatus }> = {
  publish: { from: ['DRAFT'], to: 'ACTIVE' },
  pause: { from: ['ACTIVE'], to: 'PAUSED' },
  resume: { from: ['PAUSED'], to: 'ACTIVE' },
  close: { from: ['ACTIVE', 'PAUSED'], to: 'CLOSED' },
};

export function nextStatus(current: RaffleStatus, action: RaffleAction): RaffleStatus | null {
  const t = TRANSITIONS[action];
  return t.from.includes(current) ? t.to : null;
}

// Depois de publicada, o que define a venda não muda mais: quem já comprou
// pagou por aquele preço, naquela quantidade de números.
export const LOCKED_AFTER_PUBLISH = ['slug', 'totalNumbers', 'priceCents', 'saleMode', 'startsAt'] as const;

export function lockedFieldsTouched(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): string[] {
  return LOCKED_AFTER_PUBLISH.filter((k) => {
    if (patch[k] === undefined) return false;
    const a = current[k] instanceof Date ? (current[k] as Date).getTime() : current[k];
    const b = patch[k] instanceof Date ? (patch[k] as Date).getTime() : patch[k];
    return a !== b;
  });
}

export const isFinished = (s: RaffleStatus) => s === 'CLOSED' || s === 'DRAWN';

type PublishCheck = {
  coverKey: string | null;
  totalNumbers: number;
  priceCents: number;
  minPerOrder: number;
  maxPerOrder: number;
  endsAt: Date | null;
  drawDate: Date | null;
  prizeCount: number;
};

// Lista do que falta para publicar (vazia = pode publicar).
export function publishProblems(r: PublishCheck, now = new Date()): string[] {
  const p: string[] = [];
  if (!r.coverKey) p.push('Envie a imagem de capa');
  if (r.prizeCount === 0) p.push('Cadastre pelo menos um prêmio');
  if (r.priceCents <= 0) p.push('Defina o preço do número');
  if (r.minPerOrder > r.maxPerOrder) p.push('Mínimo por pedido maior que o máximo');
  if (r.maxPerOrder > r.totalNumbers) p.push('Máximo por pedido maior que o total de números');
  if (r.endsAt && r.endsAt <= now) p.push('Data de encerramento já passou');
  if (r.endsAt && r.drawDate && r.drawDate < r.endsAt) p.push('Sorteio antes do encerramento das vendas');
  return p;
}

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}
