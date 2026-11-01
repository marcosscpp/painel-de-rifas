import { Injectable } from '@nestjs/common';
import { PiiCipher } from '../../infra/crypto/pii-cipher.js';

export type ReportRow = Record<string, unknown>;

// Ponto único onde os relatórios leem dados pessoais do comprador (celular, CPF, e-mail, cidade, UF).
// Essas colunas ficam cifradas no banco, então nenhum relatório filtra ou ordena por elas no SQL:
// só as lê e descriptografa aqui, lote a lote.
@Injectable()
export class BuyerDataReader {
  constructor(private readonly cipher: PiiCipher) {}

  reveal(rows: ReportRow[], keys: readonly string[]): ReportRow[] {
    // No relatório de números o mesmo comprador se repete em milhares de linhas: decifra uma vez por lote.
    const memo = new Map<string, string | null>();
    const open = (v: unknown) => {
      if (typeof v !== 'string') return v ?? null;
      let plain = memo.get(v);
      if (plain === undefined) memo.set(v, (plain = this.cipher.decrypt(v)));
      return plain;
    };
    return rows.map((r) => {
      const out = { ...r };
      for (const k of keys) out[k] = open(r[k]);
      return out;
    });
  }
}
