import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrizeKind } from '../../../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePrizeDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  description?: string;

  @IsEnum(PrizeKind)
  kind: PrizeKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000_00) // R$ 100 milhões
  valueCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  position?: number;
}

export class UpdatePrizeDto extends PartialType(CreatePrizeDto) {}
