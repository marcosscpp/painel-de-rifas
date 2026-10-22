// Regra de apuração pela Loteria Federal (funções puras, testadas em draw.rules.spec.ts).
//
// A Federal sorteia 5 prêmios de 5 dígitos (00000 a 99999). A rifa precisa de D dígitos,
// onde D = quantidade de dígitos do maior número (total - 1). Ex.: 10.000 números → 0000 a 9999 → D = 4.
//
// Candidatos, em ordem (1º prêmio primeiro):
// - D ≤ 5: os últimos D dígitos de cada prêmio.
// - D = 6 ou 7: o prêmio inteiro com o último dígito do(s) prêmio(s) seguinte(s) na frente.
//   Ex. D = 6: candidato 1 = último dígito do 2º prêmio + 1º prêmio.
// Ganha o primeiro candidato que existe na rifa e foi vendido (pago). Se nenhum dos 5 servir,
// vale o primeiro número vendido acima do 1º candidato (voltando ao 0 no fim).
//
// Essa é a regra padrão do sistema. Ela precisa estar escrita igual no regulamento de cada rifa.

export const PRIZE_RE = /^\d{5}$/;

export const digitsFor = (totalNumbers: number) => String(Math.max(totalNumbers - 1, 0)).length;

export function candidates(prizes: string[], totalNumbers: number): number[] {
  const d = digitsFor(totalNumbers);
  return prizes.map((p, i) => {
    if (d <= 5) return Number(p.slice(-d));
    // D = 6: + último dígito do prêmio seguinte; D = 7: + dos dois seguintes (na ordem).
    const extra = Array.from({ length: d - 5 }, (_, k) => prizes[(i + 1 + k) % prizes.length].slice(-1)).join('');
    return Number(extra + p);
  });
}

export type DrawStep = { prize: number; candidate: number; outcome: 'winner' | 'out-of-range' | 'not-sold' | 'skipped' };

export type DrawOutcome = {
  digits: number;
  steps: DrawStep[];
  winningNumber: number | null;
  // 'prize' = saiu direto de um prêmio; 'next-sold' = nenhum prêmio serviu, foi o próximo vendido
  method: 'prize' | 'next-sold' | 'none';
};

// isSold: se o número foi pago. nextSold: primeiro número pago >= n (com volta ao início), ou null.
export function resolveWinner(
  prizes: string[],
  totalNumbers: number,
  isSold: (n: number) => boolean,
  nextSold: (from: number) => number | null,
): DrawOutcome {
  const cands = candidates(prizes, totalNumbers);
  const steps: DrawStep[] = [];
  let winner: number | null = null;

  cands.forEach((c, i) => {
    if (winner !== null) return steps.push({ prize: i + 1, candidate: c, outcome: 'skipped' });
    if (c >= totalNumbers) return steps.push({ prize: i + 1, candidate: c, outcome: 'out-of-range' });
    if (!isSold(c)) return steps.push({ prize: i + 1, candidate: c, outcome: 'not-sold' });
    winner = c;
    steps.push({ prize: i + 1, candidate: c, outcome: 'winner' });
  });

  if (winner !== null) return { digits: digitsFor(totalNumbers), steps, winningNumber: winner, method: 'prize' };
  const fallback = nextSold(cands[0] % totalNumbers);
  return {
    digits: digitsFor(totalNumbers),
    steps,
    winningNumber: fallback,
    method: fallback === null ? 'none' : 'next-sold',
  };
}

// Texto curto para o público entender de onde saiu o número.
export function explain(o: DrawOutcome, pad: (n: number) => string): string {
  if (o.winningNumber === null) return 'Nenhum número vendido.';
  if (o.method === 'prize') {
    const step = o.steps.find((s) => s.outcome === 'winner')!;
    return `Número ${pad(o.winningNumber)}, formado pelo ${step.prize}º prêmio da Loteria Federal.`;
  }
  return `Nenhum dos 5 prêmios caiu num número vendido; vale o próximo número vendido: ${pad(o.winningNumber)}.`;
}
