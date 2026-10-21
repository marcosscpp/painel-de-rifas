import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './auth/dto/login.dto.js';
import { CreateOrderDto } from './orders/dto/create-order.dto.js';
import { CreateRaffleDto, SetPackagesDto } from './raffles/dto/raffle.dto.js';

// Mesmas opções do ValidationPipe global (main.ts).
function errorsOf<T extends object>(cls: new () => T, body: unknown) {
  const obj = plainToInstance(cls, body);
  return validateSync(obj, { whitelist: true, forbidNonWhitelisted: true }).flatMap((e) => [
    e.property,
    ...(e.children ?? []).flatMap((c) => [`${e.property}.${c.property}`, ...(c.children ?? []).map((g) => `${e.property}.${c.property}.${g.property}`)]),
  ]);
}

const order = {
  raffleSlug: 'onix',
  quantity: 3,
  buyer: { name: 'Maria', phone: '11987654321' },
  idempotencyKey: '7f1c3a2e-0000-4000-8000-000000000001',
};

describe('validação de entrada', () => {
  describe('CreateOrderDto', () => {
    it('aceita pedido válido', () => {
      expect(errorsOf(CreateOrderDto, order)).toEqual([]);
    });

    it('recusa campo extra (ex.: tentar mandar o preço ou o status)', () => {
      expect(errorsOf(CreateOrderDto, { ...order, totalCents: 1 })).toContain('totalCents');
    });

    it('recusa números repetidos, negativos ou acima de 1000 por pedido', () => {
      expect(errorsOf(CreateOrderDto, { ...order, quantity: undefined, numbers: [1, 1] })).toContain('numbers');
      expect(errorsOf(CreateOrderDto, { ...order, quantity: undefined, numbers: [-1] })).toContain('numbers');
      const many = Array.from({ length: 1001 }, (_, i) => i);
      expect(errorsOf(CreateOrderDto, { ...order, quantity: undefined, numbers: many })).toContain('numbers');
    });

    it('exige chave de idempotência UUID e slug limpo', () => {
      expect(errorsOf(CreateOrderDto, { ...order, idempotencyKey: '123' })).toContain('idempotencyKey');
      expect(errorsOf(CreateOrderDto, { ...order, raffleSlug: "x' OR 1=1" })).toContain('raffleSlug');
    });

    it('valida o comprador aninhado', () => {
      expect(errorsOf(CreateOrderDto, { ...order, buyer: { name: 'M', phone: '1' } })).toContain('buyer.name');
    });
  });

  describe('CreateRaffleDto', () => {
    const raffle = { title: 'Rifa', description: 'd', saleMode: 'BOTH', totalNumbers: 100, priceCents: 100 };

    it('aceita rifa válida', () => {
      expect(errorsOf(CreateRaffleDto, raffle)).toEqual([]);
    });

    it('limita total de números e preço', () => {
      expect(errorsOf(CreateRaffleDto, { ...raffle, totalNumbers: 5 })).toContain('totalNumbers');
      expect(errorsOf(CreateRaffleDto, { ...raffle, totalNumbers: 1_000_001 })).toContain('totalNumbers');
      expect(errorsOf(CreateRaffleDto, { ...raffle, priceCents: 0 })).toContain('priceCents');
      expect(errorsOf(CreateRaffleDto, { ...raffle, priceCents: 1.5 })).toContain('priceCents');
    });

    it('slug só com letras minúsculas, números e hífen', () => {
      expect(errorsOf(CreateRaffleDto, { ...raffle, slug: 'Rifa Boa' })).toContain('slug');
      expect(errorsOf(CreateRaffleDto, { ...raffle, slug: 'rifa-boa-2' })).toEqual([]);
    });

    it('não aceita status pelo corpo (só pelas ações)', () => {
      expect(errorsOf(CreateRaffleDto, { ...raffle, status: 'ACTIVE' })).toContain('status');
    });
  });

  it('SetPackagesDto: no máximo 12 pacotes', () => {
    const items = Array.from({ length: 13 }, (_, i) => ({ quantity: i + 1 }));
    expect(errorsOf(SetPackagesDto, { items })).toContain('items');
  });

  it('LoginDto: normaliza o e-mail e limita a senha', () => {
    const dto = plainToInstance(LoginDto, { email: '  Admin@X.COM ', password: 'x' });
    expect(dto.email).toBe('admin@x.com');
    expect(errorsOf(LoginDto, { email: 'a@b.com', password: 'x'.repeat(257) })).toContain('password');
  });
});
