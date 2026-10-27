import { parseFederal } from './federal-result.js';

// Trecho real da resposta da Caixa (concurso 6112, 24/10/2026).
const caixa = {
  numero: 6112,
  dataApuracao: '24/10/2026',
  listaDezenas: ['064383', '047006', '015140', '034147', '009305'],
  listaDezenasSegundoSorteio: null,
};

describe('parseFederal', () => {
  it('converte a resposta da Caixa em concurso, data e 5 prêmios de 5 dígitos', () => {
    expect(parseFederal(caixa, '6112')).toEqual({
      contest: '6112',
      date: '2026-10-24',
      prizes: ['64383', '47006', '15140', '34147', '09305'],
    });
    expect(parseFederal(caixa, '06112')).toMatchObject({ contest: '6112' });
  });

  it('recusa outro concurso, duas séries e formato inesperado', () => {
    expect(parseFederal(caixa, '6111')).toEqual({ error: 'A Caixa devolveu outro concurso' });
    expect(parseFederal({ ...caixa, listaDezenasSegundoSorteio: ['012345'] }, '6112')).toHaveProperty('error');
    expect(parseFederal({ ...caixa, listaDezenas: ['164383', '047006', '015140', '034147', '009305'] }, '6112')).toHaveProperty('error');
    expect(parseFederal({ ...caixa, listaDezenas: ['064383'] }, '6112')).toHaveProperty('error');
    expect(parseFederal({ ...caixa, dataApuracao: null }, '6112')).toHaveProperty('error');
    expect(parseFederal(null, '6112')).toHaveProperty('error');
  });
});
