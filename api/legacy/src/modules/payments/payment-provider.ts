import type { PaymentProvider as ProviderName } from '../../generated/prisma/client.js';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

// Erro vindo do gateway. status 400 = dado do comprador recusado (mensagem pode ir para a tela).
export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export type ChargeBuyer = {
  userId: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  gatewayCustomerId: string | null;
};

export type CreateChargeInput = {
  orderId: string;
  amountCents: number;
  description: string;
  expiresAt: Date;
  buyer: ChargeBuyer;
};

export type Charge = {
  providerChargeId: string;
  pixCopyPaste: string;
  pixQrCodeBase64: string; // PNG em base64, sem o prefixo data:
  gatewayCustomerId?: string; // quando o gateway criou o cliente agora
};

// Evento do gateway já traduzido. Só "paid" muda alguma coisa aqui.
export type GatewayEvent = {
  eventId: string;
  type: string;
  chargeId: string | null;
  paid: boolean;
};

// Contrato que todo gateway implementa. Trocar Asaas por iugu = nova classe, nada mais muda.
export interface PaymentGateway {
  readonly name: ProviderName;
  // Asaas exige CPF para cadastrar o cliente: o checkout pede CPF quando isto é true.
  readonly requiresCpf: boolean;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  cancelCharge(providerChargeId: string): Promise<void>;
  // Confere a autenticidade do webhook (token/assinatura) antes de qualquer coisa.
  verifyWebhook(headers: Record<string, string | string[] | undefined>): boolean;
  parseWebhook(body: unknown): GatewayEvent | null;
}
