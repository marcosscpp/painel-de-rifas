import { ageOn, maskPhone, normalizeCpf, normalizePhone, normalizeZip, parseDateOnly } from './br.js';

describe('br utils', () => {
  it('normaliza telefone', () => {
    expect(normalizePhone('(11) 98765-4321')).toBe('11987654321');
    expect(normalizePhone('+55 11 98765-4321')).toBe('11987654321');
    expect(normalizePhone('1132654321')).toBe('1132654321');
    expect(normalizePhone('11 88765-4321')).toBeNull(); // 11 dígitos sem 9
    expect(normalizePhone('0198765432')).toBeNull(); // DDD inválido
    expect(normalizePhone('123')).toBeNull();
  });

  it('valida CPF', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(normalizeCpf('529.982.247-24')).toBeNull();
    expect(normalizeCpf('111.111.111-11')).toBeNull();
  });

  it('mascara telefone', () => {
    expect(maskPhone('11987654321')).toBe('(11) 9****-4321');
  });

  it('lê data de nascimento e recusa data impossível', () => {
    expect(parseDateOnly('2000-02-29')).toEqual(new Date(Date.UTC(2000, 1, 29)));
    expect(parseDateOnly('2001-02-29')).toBeNull();
    expect(parseDateOnly('29/02/2000')).toBeNull();
  });

  it('calcula idade completa (aniversário conta no próprio dia)', () => {
    const birth = new Date(Date.UTC(2008, 9, 22));
    expect(ageOn(birth, new Date(Date.UTC(2026, 9, 21)))).toBe(17);
    expect(ageOn(birth, new Date(Date.UTC(2026, 9, 22)))).toBe(18);
  });

  it('normaliza CEP', () => {
    expect(normalizeZip('01310-100')).toBe('01310100');
    expect(normalizeZip('1234')).toBeNull();
  });
});
