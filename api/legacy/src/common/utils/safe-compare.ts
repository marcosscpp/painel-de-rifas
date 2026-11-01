import { createHash, timingSafeEqual } from 'node:crypto';

// Compara segredos (ex.: token do webhook) sem vazar informação pelo tempo de resposta.
export function safeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
