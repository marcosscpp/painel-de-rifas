import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { Prisma } from '../../generated/prisma/client.js';

// Pool próprio e pequeno para relatórios: uma exportação longa não ocupa as conexões do checkout,
// e o máximo de conexões limita quantas exportações pesadas rodam ao mesmo tempo.
@Injectable()
export class ReportsDatabase implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL'), max: 3 });
  }

  async query<T>(q: Prisma.Sql): Promise<T[]> {
    return (await this.pool.query(q.text, q.values)).rows as T[];
  }

  // Cursor do Postgres dentro de uma transação somente leitura: o banco monta o resultado uma vez
  // e entrega em lotes, com foto consistente dos dados do início ao fim da exportação.
  // Se quem consome parar no meio (cliente fechou o download), o finally desfaz e devolve a conexão.
  async *cursor<T>(q: Prisma.Sql, batch = 2000): AsyncGenerator<T[]> {
    const client = await this.pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await client.query("SET LOCAL statement_timeout = '120s'");
      await client.query(`DECLARE report NO SCROLL CURSOR FOR ${q.text}`, q.values);
      for (;;) {
        const { rows } = await client.query(`FETCH ${batch} FROM report`);
        if (rows.length) yield rows as T[];
        if (rows.length < batch) break;
      }
      await client.query('COMMIT');
      committed = true;
    } finally {
      if (!committed) await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
