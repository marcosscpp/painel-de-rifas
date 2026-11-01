import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const onlyDigits = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value);

export class UpdateSettingsDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Nome do site inválido' })
  @MinLength(2, { message: 'Nome do site: mínimo de 2 caracteres' })
  @MaxLength(40, { message: 'Nome do site: até 40 caracteres' })
  siteName?: string;

  @IsOptional()
  @IsInt({ message: 'Taxa do Pix: valor em centavos' })
  @Min(0, { message: 'Taxa do Pix: de R$ 0,00 a R$ 20,00' })
  @Max(2000, { message: 'Taxa do Pix: de R$ 0,00 a R$ 20,00' }) // até R$ 20
  pixFeeCents?: number;

  @IsOptional()
  @IsInt({ message: 'Tempo para pagar: número inteiro de minutos' })
  @Min(5, { message: 'Tempo para pagar: de 5 a 60 minutos' })
  @Max(60, { message: 'Tempo para pagar: de 5 a 60 minutos' })
  reservationMinutes?: number;

  @IsOptional()
  @IsInt({ message: 'Idade mínima: número inteiro' })
  @Min(16, { message: 'Idade mínima: de 16 a 21 anos' })
  @Max(21, { message: 'Idade mínima: de 16 a 21 anos' })
  minBuyerAge?: number;

  @IsOptional()
  @Transform(onlyDigits)
  @ValidateIf((_, v) => v !== '')
  @Matches(/^\d{10,13}$/, { message: 'WhatsApp de suporte: DDD + número' })
  supportWhatsapp?: string;

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, v) => v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do grupo precisa começar com https://' })
  @MaxLength(300, { message: 'Link do grupo: até 300 caracteres' })
  whatsappGroupUrl?: string;

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, v) => v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do Instagram precisa começar com https://' })
  @MaxLength(300, { message: 'Link do Instagram: até 300 caracteres' })
  instagramUrl?: string;
}
