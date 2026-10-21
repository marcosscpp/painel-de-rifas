import { lockedFieldsTouched, nextStatus, publishProblems, slugify } from './raffle.rules.js';

describe('raffle.rules', () => {
  it('só permite transições válidas', () => {
    expect(nextStatus('DRAFT', 'publish')).toBe('ACTIVE');
    expect(nextStatus('ACTIVE', 'pause')).toBe('PAUSED');
    expect(nextStatus('PAUSED', 'resume')).toBe('ACTIVE');
    expect(nextStatus('PAUSED', 'close')).toBe('CLOSED');
    expect(nextStatus('ACTIVE', 'publish')).toBeNull();
    expect(nextStatus('CLOSED', 'resume')).toBeNull();
    expect(nextStatus('DRAFT', 'close')).toBeNull();
  });

  it('detecta campos travados alterados', () => {
    const current = { priceCents: 1000, totalNumbers: 100, title: 'A' };
    expect(lockedFieldsTouched(current, { title: 'B' })).toEqual([]);
    expect(lockedFieldsTouched(current, { priceCents: 1000 })).toEqual([]);
    expect(lockedFieldsTouched(current, { priceCents: 500, totalNumbers: 200 })).toEqual([
      'totalNumbers',
      'priceCents',
    ]);
  });

  it('lista o que falta para publicar', () => {
    const ok = {
      coverKey: 'x',
      totalNumbers: 100,
      priceCents: 100,
      minPerOrder: 1,
      maxPerOrder: 50,
      endsAt: null,
      drawDate: null,
      prizeCount: 1,
    };
    expect(publishProblems(ok)).toEqual([]);
    expect(publishProblems({ ...ok, coverKey: null, prizeCount: 0 })).toHaveLength(2);
    expect(publishProblems({ ...ok, maxPerOrder: 500 })).toEqual([
      'Máximo por pedido maior que o total de números',
    ]);
  });

  it('gera slug sem acento nem símbolo', () => {
    expect(slugify('  Rifa do Carrão 0km — Edição #2! ')).toBe('rifa-do-carrao-0km-edicao-2');
  });
});
