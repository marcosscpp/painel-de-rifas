import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export type SiteSettings = {
  siteName: string;
  pixFeeCents: number; // taxa do Pix repassada ao comprador, por pedido
  reservationMinutes: number; // tempo para pagar antes dos números voltarem
  minBuyerAge: number;
  supportWhatsapp: string; // só dígitos, com DDD
  whatsappGroupUrl: string; // grupo mostrado depois da compra
  instagramUrl: string;
};

const KEY = 'site';
const CACHE_MS = 15_000;

// Configurações editáveis pelo admin, guardadas numa linha da tabela settings.
// O que não foi salvo ainda vem das variáveis de ambiente (padrão de instalação).
// Cache curto: o checkout lê isso em todo pedido.
@Injectable()
export class SettingsService {
  private cache: { value: SiteSettings; at: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  defaults(): SiteSettings {
    return {
      siteName: 'WinClub',
      pixFeeCents: this.config.get<number>('PIX_FEE_CENTS') ?? 199,
      reservationMinutes: this.config.get<number>('RESERVATION_MINUTES') ?? 15,
      minBuyerAge: this.config.get<number>('MIN_BUYER_AGE') ?? 18,
      supportWhatsapp: '',
      whatsappGroupUrl: '',
      instagramUrl: '',
    };
  }

  async get(): Promise<SiteSettings> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    const value = { ...this.defaults(), ...((row?.value as Partial<SiteSettings> | null) ?? {}) };
    this.cache = { value, at: Date.now() };
    return value;
  }

  async update(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    // O DTO chega com as chaves não enviadas valendo undefined: só aplica o que veio.
    const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const value = { ...(await this.get()), ...changes };
    await this.prisma.setting.upsert({
      where: { key: KEY },
      create: { key: KEY, value },
      update: { value },
    });
    this.cache = { value, at: Date.now() };
    return value;
  }
}
