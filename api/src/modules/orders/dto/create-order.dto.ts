import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_TOTAL_NUMBERS } from '../../raffles/raffle.rules.js';
import { BuyerDto } from '../../users/dto/buyer.dto.js';

export { BuyerDto };

export const MAX_NUMBERS_PER_ORDER = 1000;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

// Informe "quantity" (números aleatórios) ou "numbers" (escolhidos na grade), nunca os dois.
export class CreateOrderDto {
  @Matches(/^[a-z0-9-]{1,80}$/)
  raffleSlug: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TOTAL_NUMBERS)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_NUMBERS_PER_ORDER)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  numbers?: number[];

  // Sem "buyer": usa o comprador da sessão ("Comprando como..."). Com "buyer": cadastra/atualiza.
  @IsOptional()
  @ValidateNested()
  @Type(() => BuyerDto)
  buyer?: BuyerDto;

  // Gerada pelo navegador ao abrir a compra: reenvio (clique duplo, rede ruim) devolve o mesmo pedido.
  @IsUUID()
  idempotencyKey: string;
}
