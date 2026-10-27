// Resultado da Loteria Federal pela API que o próprio site da Caixa usa
// (servicebus2.caixa.gov.br/portaldeloterias/api/federal/<concurso>). Não é uma API documentada:
// o formato pode mudar sem aviso, então a resposta é conferida campo a campo e, se algo não
// bater, o admin digita os prêmios à mão.

export const CAIXA_FEDERAL_URL = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/federal';

export type FederalResult = { contest: string; date: string; prizes: string[] };

type CaixaFederal = {
  numero?: unknown;
  dataApuracao?: unknown;
  listaDezenas?: unknown;
  listaDezenasSegundoSorteio?: unknown;
};

// A Caixa devolve cada bilhete com 6 caracteres ("064383"); o bilhete da Federal tem 5 dígitos.
const toPrize = (v: unknown) => (typeof v === 'string' && /^0?\d{5}$/.test(v) ? v.slice(-5) : null);

// { error } = concurso diferente, duas séries ou resposta fora do formato esperado.
export function parseFederal(raw: unknown, contest: string): FederalResult | { error: string } {
  const d = (raw ?? {}) as CaixaFederal;
  if (String(d.numero) !== String(Number(contest))) return { error: 'A Caixa devolveu outro concurso' };
  if (Array.isArray(d.listaDezenasSegundoSorteio) && d.listaDezenasSegundoSorteio.length) {
    return { error: 'Concurso com duas séries: digite os prêmios da série do regulamento' };
  }
  const prizes = Array.isArray(d.listaDezenas) ? d.listaDezenas.map(toPrize) : [];
  if (prizes.length !== 5 || prizes.some((p) => p === null)) return { error: 'Resposta da Caixa em formato inesperado' };
  const m = typeof d.dataApuracao === 'string' ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.dataApuracao) : null;
  if (!m) return { error: 'Resposta da Caixa sem data do sorteio' };
  return { contest: String(d.numero), date: `${m[3]}-${m[2]}-${m[1]}`, prizes: prizes as string[] };
}
