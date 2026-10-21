import { maskPhone, normalizeCpf, normalizePhone } from './br.js';

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
});
