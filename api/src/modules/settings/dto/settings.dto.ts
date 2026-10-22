import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const onlyDigits = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value);

export class UpdateSettingsDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  siteName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000) // até R$ 20
  pixFeeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  reservationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(21)
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
  @MaxLength(300)
  whatsappGroupUrl?: string;

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, v) => v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do Instagram precisa começar com https://' })
  @MaxLength(300)
  instagramUrl?: string;
}
