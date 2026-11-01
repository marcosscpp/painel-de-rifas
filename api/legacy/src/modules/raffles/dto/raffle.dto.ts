import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RaffleStatus, SaleMode } from '../../../generated/prisma/client.js';
import { MAX_TOTAL_NUMBERS } from '../raffle.rules.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateRaffleDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug: só letras minúsculas, números e hífen' })
  @MaxLength(60)
  slug?: string;

  @IsString()
  @MaxLength(10_000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  rules?: string;

  @IsEnum(SaleMode)
  saleMode: SaleMode;

  @IsInt()
  @Min(10)
  @Max(MAX_TOTAL_NUMBERS)
  totalNumbers: number;

  @IsInt()
  @Min(1)
  @Max(1_000_000) // R$ 10.000 por número
  priceCents: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minPerOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TOTAL_NUMBERS)
  maxPerOrder?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  drawDate?: string | null;
}

export class UpdateRaffleDto extends PartialType(CreateRaffleDto) {}

export class PackageItemDto {
  @IsInt()
  @Min(1)
  @Max(MAX_TOTAL_NUMBERS)
  quantity: number;

  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;
}

export class SetPackagesDto {
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  @ArrayMaxSize(12)
  items: PackageItemDto[];
}

export class SetFeaturedDto {
  @IsBoolean()
  featured: boolean;
}

export class ListRafflesQuery {
  @IsOptional()
  @IsEnum(RaffleStatus)
  status?: RaffleStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsIn([10, 20, 50])
  pageSize = 20;
}

export class NumbersPageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  size = 500;
}
