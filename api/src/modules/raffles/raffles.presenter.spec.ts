import { RafflesPresenter } from './raffles.presenter.js';

describe('RafflesPresenter', () => {
  const uploads = { urls: (k: string | null) => (k ? { thumb: `${k}-t`, full: `${k}-f` } : null) };
  const present = new RafflesPresenter(uploads as never);

  it('progresso: livres = total - pagos - reservados; percentual só conta pagos, com 1 casa', () => {
    expect(present.progress({ totalNumbers: 3000, paidCount: 1000, reservedCount: 500 })).toEqual({
      paid: 1000,
      reserved: 500,
      available: 1500,
      percent: 33.3,
    });
    expect(present.progress({ totalNumbers: 0, paidCount: 0, reservedCount: 0 }).percent).toBe(0);
  });

  it('detalhe público não expõe id, chaves internas nem dados de rascunho', () => {
    const out = present.publicDetail({
      id: 'r1',
      slug: 's',
      title: 't',
      description: 'd',
      rules: '',
      status: 'ACTIVE',
      saleMode: 'BOTH',
      totalNumbers: 100,
      priceCents: 200,
      minPerOrder: 1,
      maxPerOrder: 10,
      endsAt: null,
      drawDate: null,
      coverKey: 'k',
      paidCount: 0,
      reservedCount: 0,
      lotteryContest: '123',
      winningNumber: 7,
      drawnAt: null,
      packages: [{ id: 'pk', quantity: 5, highlighted: true }],
      prizes: [{ id: 'p', position: 1, title: 'x', description: '', kind: 'ITEM', valueCents: null, images: [{ id: 'i', key: 'img' }] }],
    } as never);

    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('coverKey');
    expect(out.packages).toEqual([{ quantity: 5, highlighted: true, totalCents: 1000 }]);
    expect(out.prizes[0].images).toEqual([{ thumb: 'img-t', full: 'img-f' }]);
    expect(out.result).toBeNull(); // resultado só aparece depois do sorteio
  });
});
