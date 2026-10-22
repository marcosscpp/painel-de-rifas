import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UFS } from '../../../common/utils/br.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : trim({ value });

// Endereço é opcional (só quem marcar "Desejo informar o meu endereço").
// Se vier, o básico é obrigatório; complemento e ponto de referência não.
export class AddressDto {
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' })
  zipCode: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  street: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  number: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @IsIn(UFS, { message: 'UF inválida' })
  state: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  complement?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  reference?: string;
}

// Mesmos campos do cadastro do Wesley Alemão. Obrigatórios: nome completo, CPF, nascimento,
// e-mail e celular confirmado. Opcionais: nome social e endereço.
export class BuyerDto {
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  @Matches(/^\S{2,}(\s+\S+)+$/u, { message: 'Informe nome e sobrenome' })
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  socialName?: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  // Digitado de novo pelo comprador: celular errado = perder acesso aos números.
  @IsString()
  @MaxLength(20)
  phoneConfirm: string;

  @IsString()
  @MaxLength(20)
  cpf: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de nascimento inválida' })
  birthDate: string;

  @Transform(lower)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

// "Já comprei antes" e "Meus números": celular + CPF precisam bater com o mesmo cadastro.
export class BuyerLookupDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(20)
  cpf: string;
}
