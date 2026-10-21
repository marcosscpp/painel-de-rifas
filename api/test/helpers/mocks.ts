import { vi } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';

// Mock do PrismaService para testes unitários: cada método é um vi.fn().
// $transaction roda a função recebendo o próprio mock como "tx" (ou resolve o array).
export function makePrisma() {
  const model = () => ({
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  });

  const prisma = {
    user: model(),
    raffle: model(),
    rafflePackage: model(),
    prize: model(),
    prizeImage: model(),
    order: model(),
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
