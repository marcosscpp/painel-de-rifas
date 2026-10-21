import { validateEnv } from './env.validation.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@db:5432/x',
  JWT_SECRET: 'a'.repeat(32),
  S3_ENDPOINT: 'http://minio:9000',
  S3_PUBLIC_URL: 'http://localhost:9000/rifas',
  S3_BUCKET: 'rifas',
  S3_ACCESS_KEY: 'k',
  S3_SECRET_KEY: 's',
};

describe('validateEnv', () => {
  it('aplica padrões e converte números', () => {
    const env = validateEnv({ ...base, PORT: '4000' });
    expect(env.PORT).toBe(4000);
    expect(env.RESERVATION_MINUTES).toBe(15);
    expect(env.PIX_FEE_CENTS).toBe(199);
    expect(env.PAYMENT_PROVIDER).toBe('FAKE');
  });

  it('lista tudo o que falta de uma vez', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*S3_BUCKET/);
  });

  it('recusa JWT_SECRET curto', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'curto' })).toThrow('32 caracteres');
  });

  it('recusa reserva fora de 1 a 120 minutos', () => {
    expect(() => validateEnv({ ...base, RESERVATION_MINUTES: '0' })).toThrow('RESERVATION_MINUTES');
    expect(() => validateEnv({ ...base, RESERVATION_MINUTES: '500' })).toThrow('RESERVATION_MINUTES');
  });

  describe('produção', () => {
    const prod = { ...base, NODE_ENV: 'production', PAYMENT_PROVIDER: 'ASAAS', PAYMENT_API_KEY: 'chave', PAYMENT_WEBHOOK_TOKEN: 't'.repeat(24) };

    it('aceita configuração completa', () => {
      expect(() => validateEnv(prod)).not.toThrow();
    });

    it('gateway real exige chave de API', () => {
      expect(() => validateEnv({ ...prod, PAYMENT_API_KEY: undefined })).toThrow('PAYMENT_API_KEY');
    });

    it('não sobe com gateway falso', () => {
      expect(() => validateEnv({ ...prod, PAYMENT_PROVIDER: 'FAKE' })).toThrow('FAKE');
    });

    it('não sobe sem token de webhook forte', () => {
      expect(() => validateEnv({ ...prod, PAYMENT_WEBHOOK_TOKEN: undefined })).toThrow('PAYMENT_WEBHOOK_TOKEN');
      expect(() => validateEnv({ ...prod, PAYMENT_WEBHOOK_TOKEN: 'curto' })).toThrow('PAYMENT_WEBHOOK_TOKEN');
    });
  });
});
