import { BuyerDataReader } from './buyer-data.reader.js';

describe('BuyerDataReader', () => {
  it('descriptografa só as colunas pedidas, uma vez por valor no lote', () => {
    const cipher = { decrypt: vi.fn((v: string) => v.replace('enc:', '')) };
    const reader = new BuyerDataReader(cipher as never);
    const rows = reader.reveal(
      [
        { name: 'Ana', phone: 'enc:119', cpf: null },
        { name: 'Ana', phone: 'enc:119', cpf: 'enc:123' },
      ],
      ['phone', 'cpf'],
    );
    expect(rows).toEqual([
      { name: 'Ana', phone: '119', cpf: null },
      { name: 'Ana', phone: '119', cpf: '123' },
    ]);
    expect(cipher.decrypt).toHaveBeenCalledTimes(2);
  });
});
