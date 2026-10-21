import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { safeCompare } from '../../../common/utils/safe-compare.js';
import type { Charge, CreateChargeInput, GatewayEvent, PaymentGateway } from '../payment-provider.js';

// Gateway de desenvolvimento: gera um QR Code de verdade (com um texto que não é Pix válido)
// e só "paga" pelo botão de simulação. A validação de env impede usá-lo em produção.
export class FakeGateway implements PaymentGateway {
  readonly name = 'FAKE' as const;
  readonly requiresCpf = false;

  constructor(private readonly webhookToken = 'fake-dev-token') {}

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const providerChargeId = `fake_${randomUUID()}`;
    const pixCopyPaste = `PIX-DE-TESTE|pedido=${input.orderId}|valor=${(input.amountCents / 100).toFixed(2)}`;
    const dataUrl = await QRCode.toDataURL(pixCopyPaste, { margin: 1, width: 320 });
    return { providerChargeId, pixCopyPaste, pixQrCodeBase64: dataUrl.replace(/^data:image\/png;base64,/, '') };
  }

  async cancelCharge(): Promise<void> {}

  verifyWebhook(headers: Record<string, string | string[] | undefined>): boolean {
    const token = headers['x-fake-token'];
    return typeof token === 'string' && safeCompare(token, this.webhookToken);
  }

  parseWebhook(body: unknown): GatewayEvent | null {
    const b = body as { id?: unknown; chargeId?: unknown } | null;
    if (typeof b?.id !== 'string' || typeof b.chargeId !== 'string') return null;
    return { eventId: b.id, type: 'PAID', chargeId: b.chargeId, paid: true };
  }
}
