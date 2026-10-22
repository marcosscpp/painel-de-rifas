import { vi } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';

// Mock do PrismaService para testes unitários: cada método é um vi.fn().
// $transaction roda a função recebendo o próprio mock como "tx" (ou resolve o array).
export function makePrisma() {
  // Como o Prisma de verdade, todo método devolve uma Promise (por padrão, de undefined).
  const fn = () => vi.fn().mockResolvedValue(undefined);
  const model = () => ({
    findUnique: fn(),
    findUniqueOrThrow: fn(),
    findFirst: fn(),
    findMany: fn(),
    count: fn(),
    create: fn(),
    createMany: fn(),
    update: fn(),
    updateMany: fn(),
    upsert: fn(),
    delete: fn(),
    deleteMany: fn(),
  });

  const prisma = {
    user: model(),
    raffle: model(),
    rafflePackage: model(),
    prize: model(),
    prizeImage: model(),
    order: model(),
    payment: model(),
    webhookEvent: model(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: typeof prisma) => unknown)(prisma) : Promise.all(arg as unknown[]),
  );
  return prisma;
}

export type PrismaMock = ReturnType<typeof makePrisma>;

// ConfigService mínimo a partir de um objeto.
export const makeConfig = (values: Record<string, unknown>) => ({
  get: vi.fn((k: string) => values[k]),
  getOrThrow: vi.fn((k: string) => {
    if (values[k] === undefined) throw new Error(`config ausente: ${k}`);
    return values[k];
  }),
});

export const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

// Texto do SQL de uma chamada de $queryRaw/$executeRaw feita com template literal.
export const sqlOf = (call: unknown[]) => (call[0] as TemplateStringsArray).join('?');

// SettingsService com os valores padrão da instalação.
export const makeSettings = (over: Record<string, unknown> = {}) => ({
  get: vi.fn().mockResolvedValue({
    siteName: 'WinClub',
    pixFeeCents: 199,
    reservationMinutes: 15,
    minBuyerAge: 18,
    supportWhatsapp: '',
    whatsappGroupUrl: '',
    instagramUrl: '',
    ...over,
  }),
  update: vi.fn(),
});
