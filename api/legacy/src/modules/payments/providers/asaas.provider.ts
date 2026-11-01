import { Logger } from '@nestjs/common';
import { safeCompare } from '../../../common/utils/safe-compare.js';
import {
  type Charge,
  type CreateChargeInput,
  GatewayError,
  type GatewayEvent,
  type PaymentGateway,
} from '../payment-provider.js';

// Eventos que significam dinheiro recebido. RECEIVED é o crédito do Pix; CONFIRMED também
// pode chegar primeiro. Os dois confirmam, e a idempotência evita contar duas vezes.
const PAID_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']);

type Fetch = typeof fetch;

// Asaas API v3 (https://docs.asaas.com). Cliente → cobrança PIX → QR Code; webhook autenticado
// pelo header asaas-access-token configurado no painel do Asaas.
export class AsaasGateway implements PaymentGateway {
  readonly name = 'ASAAS' as const;
  readonly requiresCpf = true;
  private readonly logger = new Logger(AsaasGateway.name);

  constructor(
    private readonly apiKey: string,
    private readonly webhookToken: string,
    private readonly baseUrl = 'https://api-sandbox.asaas.com/v3',
    private readonly http: Fetch = fetch,
  ) {}

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const customer = input.buyer.gatewayCustomerId ?? (await this.createCustomer(input));

    const payment = await this.request<{ id: string }>('POST', '/payments', {
      customer,
      billingType: 'PIX',
      value: input.amountCents / 100,
      dueDate: toDateBR(input.expiresAt),
      description: input.description.slice(0, 500),
      externalReference: input.orderId,
    });

    const qr = await this.request<{ encodedImage: string; payload: string }>(
      'GET',
      `/payments/${encodeURIComponent(payment.id)}/pixQrCode`,
    );

    return {
      providerChargeId: payment.id,
      pixCopyPaste: qr.payload,
      pixQrCodeBase64: qr.encodedImage.replace(/^data:image\/\w+;base64,/, ''),
      ...(!input.buyer.gatewayCustomerId && { gatewayCustomerId: customer }),
    };
  }

  async cancelCharge(providerChargeId: string): Promise<void> {
    await this.request('DELETE', `/payments/${encodeURIComponent(providerChargeId)}`);
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>): boolean {
    const token = headers['asaas-access-token'];
    return typeof token === 'string' && !!this.webhookToken && safeCompare(token, this.webhookToken);
  }

  parseWebhook(body: unknown): GatewayEvent | null {
    const b = body as { id?: unknown; event?: unknown; payment?: { id?: unknown } } | null;
    if (typeof b?.id !== 'string' || typeof b.event !== 'string') return null;
    const chargeId = typeof b.payment?.id === 'string' ? b.payment.id : null;
    return { eventId: b.id, type: b.event, chargeId, paid: PAID_EVENTS.has(b.event) && !!chargeId };
  }

  private async createCustomer(input: CreateChargeInput) {
    const { buyer } = input;
    if (!buyer.cpf) throw new GatewayError('CPF é obrigatório para gerar o Pix', 400);
    const c = await this.request<{ id: string }>('POST', '/customers', {
      name: buyer.name,
      cpfCnpj: buyer.cpf,
      ...(buyer.phone && { mobilePhone: buyer.phone }),
      externalReference: buyer.userId,
      notificationDisabled: true, // quem avisa o comprador é o site, não o Asaas
    });
    return c.id;
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.http(`${this.baseUrl}${path}`, {
      method,
      headers: {
        access_token: this.apiKey,
        'User-Agent': 'painel-de-rifas',
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const desc = (data as { errors?: Array<{ description?: string }> } | null)?.errors?.[0]?.description;
      // Nunca loga o corpo da requisição (tem CPF); só método, rota e o erro do Asaas.
      this.logger.warn(`Asaas ${method} ${path.split('/').slice(0, 2).join('/')} → ${res.status} ${desc ?? ''}`);
      throw new GatewayError(desc ?? `Asaas respondeu ${res.status}`, res.status);
    }
    return data as T;
  }
}

// Data no fuso de São Paulo (AAAA-MM-DD), que é o que o Asaas espera no vencimento.
function toDateBR(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}
