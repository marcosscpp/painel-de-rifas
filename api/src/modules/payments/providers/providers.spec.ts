import { GatewayError } from '../payment-provider.js';
import { AsaasGateway } from './asaas.provider.js';
import { FakeGateway } from './fake.provider.js';

const input = (over: Record<string, unknown> = {}) => ({
  orderId: 'o1',
  amountCents: 2990,
  description: '15 número(s) - Onix',
  expiresAt: new Date('2026-10-22T02:30:00Z'), // 23:30 em São Paulo do dia 21
  buyer: { userId: 'u1', name: 'Maria', phone: '11987654321', cpf: '52998224725', gatewayCustomerId: null },
  ...over,
});

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('AsaasGateway', () => {
  let http: ReturnType<typeof vi.fn>;
  let asaas: AsaasGateway;

  beforeEach(() => {
    http = vi.fn();
    asaas = new AsaasGateway('chave', 'token-do-webhook-123456789', 'https://sandbox/v3', http as never);
  });

  it('cria cliente, cobrança PIX e busca o QR Code', async () => {
    http
      .mockReturnValueOnce(json(200, { id: 'cus_1' }))
      .mockReturnValueOnce(json(200, { id: 'pay_1' }))
      .mockReturnValueOnce(json(200, { encodedImage: 'data:image/png;base64,QUJD', payload: '000201...' }));

    const charge = await asaas.createCharge(input());

    expect(charge).toEqual({ providerChargeId: 'pay_1', pixCopyPaste: '000201...', pixQrCodeBase64: 'QUJD', gatewayCustomerId: 'cus_1' });
    const [customerUrl, customerReq] = http.mock.calls[0];
    expect(customerUrl).toBe('https://sandbox/v3/customers');
    expect(customerReq.headers.access_token).toBe('chave');
    expect(JSON.parse(customerReq.body)).toMatchObject({ name: 'Maria', cpfCnpj: '52998224725', notificationDisabled: true });

    const payment = JSON.parse(http.mock.calls[1][1].body);
    expect(payment).toEqual({
      customer: 'cus_1',
      billingType: 'PIX',
      value: 29.9,
      dueDate: '2026-10-21', // fuso de São Paulo, não UTC
      description: '15 número(s) - Onix',
      externalReference: 'o1',
    });
    expect(http.mock.calls[2][0]).toBe('https://sandbox/v3/payments/pay_1/pixQrCode');
  });

  it('reaproveita o cliente já cadastrado', async () => {
    http
      .mockReturnValueOnce(json(200, { id: 'pay_1' }))
      .mockReturnValueOnce(json(200, { encodedImage: 'QUJD', payload: 'x' }));
    const charge = await asaas.createCharge(input({ buyer: { ...input().buyer, gatewayCustomerId: 'cus_9' } }));
    expect(http).toHaveBeenCalledTimes(2);
    expect(JSON.parse(http.mock.calls[0][1].body).customer).toBe('cus_9');
    expect(charge.gatewayCustomerId).toBeUndefined();
  });

  it('sem CPF não chama o Asaas', async () => {
    await expect(asaas.createCharge(input({ buyer: { ...input().buyer, cpf: null } }))).rejects.toThrow(GatewayError);
    expect(http).not.toHaveBeenCalled();
  });

  it('traduz o erro do Asaas com status', async () => {
    http.mockReturnValueOnce(json(400, { errors: [{ code: 'invalid_cpfCnpj', description: 'CPF inválido' }] }));
    const err = await asaas.createCharge(input()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err).toMatchObject({ message: 'CPF inválido', status: 400 });
  });

  it('cancela a cobrança com DELETE', async () => {
    http.mockReturnValueOnce(json(200, { deleted: true }));
    await asaas.cancelCharge('pay_1');
    expect(http.mock.calls[0][0]).toBe('https://sandbox/v3/payments/pay_1');
    expect(http.mock.calls[0][1].method).toBe('DELETE');
  });

  it('só aceita webhook com o token configurado', () => {
    expect(asaas.verifyWebhook({ 'asaas-access-token': 'token-do-webhook-123456789' })).toBe(true);
    expect(asaas.verifyWebhook({ 'asaas-access-token': 'errado' })).toBe(false);
    expect(asaas.verifyWebhook({})).toBe(false);
    expect(new AsaasGateway('k', '').verifyWebhook({ 'asaas-access-token': '' })).toBe(false);
  });

  it('interpreta eventos: só recebido/confirmado contam como pago', () => {
    const base = { id: 'evt_1', payment: { object: 'payment', id: 'pay_1' } };
    expect(asaas.parseWebhook({ ...base, event: 'PAYMENT_RECEIVED' })).toEqual({
      eventId: 'evt_1',
      type: 'PAYMENT_RECEIVED',
      chargeId: 'pay_1',
      paid: true,
    });
    expect(asaas.parseWebhook({ ...base, event: 'PAYMENT_CONFIRMED' })?.paid).toBe(true);
    expect(asaas.parseWebhook({ ...base, event: 'PAYMENT_CREATED' })?.paid).toBe(false);
    expect(asaas.parseWebhook({ ...base, event: 'PAYMENT_REFUNDED' })?.paid).toBe(false);
    expect(asaas.parseWebhook({ event: 'PAYMENT_RECEIVED' })).toBeNull();
    expect(asaas.parseWebhook(null)).toBeNull();
  });
});

describe('FakeGateway', () => {
  it('gera QR Code PNG de verdade e copia e cola com o pedido', async () => {
    const charge = await new FakeGateway().createCharge(input());
    expect(charge.providerChargeId).toMatch(/^fake_/);
    expect(charge.pixCopyPaste).toContain('pedido=o1');
    expect(Buffer.from(charge.pixQrCodeBase64, 'base64').subarray(1, 4).toString()).toBe('PNG');
  });

  it('webhook falso também exige token', () => {
    const fake = new FakeGateway('segredo');
    expect(fake.verifyWebhook({ 'x-fake-token': 'segredo' })).toBe(true);
    expect(fake.verifyWebhook({ 'x-fake-token': 'outro' })).toBe(false);
  });
});
