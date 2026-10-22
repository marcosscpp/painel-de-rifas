import { candidates, digitsFor, explain, resolveWinner } from './draw.rules.js';

const prizes = ['12345', '67890', '24680', '13579', '00042'];

describe('draw.rules', () => {
  it('dígitos pelo tamanho da rifa', () => {
    expect(digitsFor(100)).toBe(2); // 00-99
    expect(digitsFor(10_000)).toBe(4);
    expect(digitsFor(100_000)).toBe(5);
    expect(digitsFor(1_000_000)).toBe(6);
    expect(digitsFor(10_000_000)).toBe(7);
  });

  it('candidatos: últimos dígitos de cada prêmio (até 5 dígitos)', () => {
    expect(candidates(prizes, 10_000)).toEqual([2345, 7890, 4680, 3579, 42]);
    expect(candidates(prizes, 100)).toEqual([45, 90, 80, 79, 42]);
    expect(candidates(prizes, 100_000)).toEqual([12345, 67890, 24680, 13579, 42]);
  });

  it('candidatos com 6 dígitos: último dígito do prêmio seguinte na frente', () => {
    // 1º: "0"(2º=67890) + 12345 ; 5º: "5"(1º=12345) + 00042
    const c = candidates(prizes, 1_000_000);
    expect(c[0]).toBe(Number('0' + '12345'));
    expect(c[2]).toBe(Number('9' + '24680'));
    expect(c[4]).toBe(Number('5' + '00042'));
    // 7 dígitos: últimos dígitos do 2º e do 3º prêmio na frente do 1º
    expect(candidates(prizes, 10_000_000)[0]).toBe(Number('00' + '12345'));
    expect(candidates(prizes, 10_000_000)[1]).toBe(Number('09' + '67890'));
  });

  it('ganha o primeiro prêmio que caiu num número vendido', () => {
    const sold = new Set([7890, 3579]);
    const o = resolveWinner(prizes, 10_000, (n) => sold.has(n), () => null);
    expect(o.winningNumber).toBe(7890);
    expect(o.method).toBe('prize');
    expect(o.steps.map((s) => s.outcome)).toEqual(['not-sold', 'winner', 'skipped', 'skipped', 'skipped']);
  });

  it('número fora da rifa é pulado (rifa de 5.000 com prêmio 7890)', () => {
    const o = resolveWinner(prizes, 5_000, () => true, () => null);
    // 5.000 números → 4 dígitos: 2345 vale
    expect(o.winningNumber).toBe(2345);
    const o2 = resolveWinner(['99999', '98765', '12345', '00000', '11111'], 5_000, () => true, () => null);
    expect(o2.steps[0].outcome).toBe('out-of-range');
    expect(o2.winningNumber).toBe(2345);
  });

  it('nenhum prêmio vendido: vale o próximo número vendido acima do 1º candidato', () => {
    const o = resolveWinner(prizes, 10_000, () => false, (from) => (from === 2345 ? 2400 : null));
    expect(o).toMatchObject({ winningNumber: 2400, method: 'next-sold' });
    expect(explain(o, (n) => String(n).padStart(4, '0'))).toContain('próximo número vendido: 2400');
  });

  it('nada vendido', () => {
    expect(resolveWinner(prizes, 10_000, () => false, () => null)).toMatchObject({ winningNumber: null, method: 'none' });
  });
});
