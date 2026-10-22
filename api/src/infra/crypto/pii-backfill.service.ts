import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PII_FIELDS, PiiCipher } from './pii-cipher.js';

const BATCH = 500;
const select = Object.fromEntries([['id', true], ...PII_FIELDS.map((f) => [f, true])]) as Record<
  'id' | (typeof PII_FIELDS)[number],
  true
>;

// Ao subir a API, cifra o que ainda estiver em texto puro (dados de antes da criptografia)
// e recifra o que estiver com chave antiga (depois de adicionar uma versão nova em PII_KEYS).
// Roda antes de a API aceitar requisições: sem isso, a busca por celular/CPF não acharia
// quem ainda não tem hash. Quando está tudo em dia, é só uma consulta que volta vazia.
@Injectable()
export class PiiBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PiiBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: PiiCipher,
  ) {}

  async onApplicationBootstrap() {
    const done = await this.run();
    if (done) this.logger.log(`Dados pessoais cifrados com a chave v${this.cipher.currentVersion}: ${done} cadastro(s)`);
  }

  async run(): Promise<number> {
    const current = `enc:v${this.cipher.currentVersion}:`;
    const stale: Prisma.UserWhereInput = {
      OR: PII_FIELDS.map((f) => ({ [f]: { not: null }, NOT: { [f]: { startsWith: current } } })),
    };
    let done = 0;
    let after: string | undefined;
    for (;;) {
      const rows = await this.prisma.user.findMany({
        where: { ...stale, ...(after && { id: { gt: after } }) },
        orderBy: { id: 'asc' },
        take: BATCH,
        select,
      });
      if (!rows.length) return done;
      await this.prisma.$transaction(
        rows.map(({ id, ...fields }) =>
          this.prisma.user.update({ where: { id }, data: this.cipher.encryptUser(this.cipher.decryptUser(fields)) }),
        ),
      );
      done += rows.length;
      after = rows[rows.length - 1].id;
    }
  }
}
