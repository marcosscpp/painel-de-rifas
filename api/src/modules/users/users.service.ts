import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { ageOn, normalizeCpf, normalizePhone, normalizeZip, parseDateOnly } from '../../common/utils/br.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { BuyerDto, UpdateProfileDto } from './dto/buyer.dto.js';

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  // Cadastro do comprador no checkout. O celular identifica a pessoa (sem senha) e o CPF
  // protege o cadastro: um celular já ligado a um CPF não aceita outro CPF.
  async upsertBuyer(input: BuyerDto) {
    const phone = normalizePhone(input.phone);
    if (!phone) throw new BadRequestException('Celular inválido. Use DDD + número.');
    if (normalizePhone(input.phoneConfirm) !== phone) {
      throw new BadRequestException('Os dois celulares não são iguais. Confira e digite de novo.');
    }
    const cpf = normalizeCpf(input.cpf);
    if (!cpf) throw new BadRequestException('CPF inválido');

    const birthDate = parseDateOnly(input.birthDate);
    if (!birthDate) throw new BadRequestException('Data de nascimento inválida');
    const age = ageOn(birthDate);
    if (age > 120 || age < 0) throw new BadRequestException('Data de nascimento inválida');
    const { minBuyerAge } = await this.settings.get();
    if (age < minBuyerAge) throw new BadRequestException(`Venda permitida apenas para maiores de ${minBuyerAge} anos`);

    const address = input.address
      ? {
          zipCode: normalizeZip(input.address.zipCode),
          street: input.address.street,
          streetNumber: input.address.number,
          district: input.address.district,
          city: input.address.city,
          state: input.address.state,
          complement: input.address.complement ?? null,
          reference: input.address.reference ?? null,
        }
      : {};
    if (input.address && !address.zipCode) throw new BadRequestException('CEP inválido');

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing?.role === 'ADMIN') throw new ConflictException('Celular indisponível');
    if (existing?.cpf && existing.cpf !== cpf) {
      throw new ConflictException('Este celular já está cadastrado com outro CPF');
    }

    const cpfOwner = await this.prisma.user.findUnique({ where: { cpf }, select: { id: true } });
    if (cpfOwner && cpfOwner.id !== existing?.id) {
      throw new ConflictException('Este CPF já está cadastrado com outro celular');
    }
    const emailOwner = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== existing?.id) {
      throw new ConflictException('Este e-mail já está em outro cadastro');
    }

    const profile = {
      name: input.name,
      socialName: input.socialName ?? null,
      email: input.email,
      cpf,
      birthDate,
      ...address,
    };
    const upsert = () =>
      this.prisma.user.upsert({
        where: { phone },
        create: { phone, role: 'BUYER', ...profile },
        update: profile,
      });
    // Duas compras simultâneas do mesmo celular novo: a segunda bate na chave única e repete como update.
    return upsert().catch((e: unknown) => {
      if (isUniqueViolation(e)) return upsert();
      throw e;
    });
  }

  // "Já comprei antes" / "Meus números": celular e CPF precisam ser do mesmo cadastro.
  // A resposta é a mesma para "não existe" e "não bate", para não revelar quem tem cadastro.
  async findBuyer(rawPhone: string, rawCpf: string) {
    const phone = normalizePhone(rawPhone);
    const cpf = normalizeCpf(rawCpf);
    const user = phone && cpf ? await this.prisma.user.findUnique({ where: { phone } }) : null;
    if (!user || user.role !== 'BUYER' || user.cpf !== cpf) {
      throw new NotFoundException('Não encontramos cadastro com esse celular e CPF');
    }
    return user;
  }

  // Cadastro pela tela "Cadastrar": só cria. Quem já tem cadastro entra com celular + CPF,
  // assim ninguém troca os dados de outra pessoa sabendo só o celular.
  async registerBuyer(input: BuyerDto) {
    const phone = normalizePhone(input.phone);
    const cpf = normalizeCpf(input.cpf);
    const taken = await this.prisma.user.findFirst({
      where: { OR: [...(phone ? [{ phone }] : []), ...(cpf ? [{ cpf }] : [])] },
      select: { id: true },
    });
    if (taken) throw new ConflictException('Você já tem cadastro. Entre com seu celular e CPF.');
    return this.upsertBuyer(input);
  }

  // "Meus dados": celular, CPF e nascimento identificam a pessoa e não mudam por aqui.
  async updateProfile(userId: string, input: UpdateProfileDto) {
    if (input.email) {
      const owner = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (owner && owner.id !== userId) throw new ConflictException('Este e-mail já está em outro cadastro');
    }
    let address = {};
    if (input.address === null) {
      address = { zipCode: null, street: null, streetNumber: null, district: null, city: null, state: null, complement: null, reference: null };
    } else if (input.address) {
      const zipCode = normalizeZip(input.address.zipCode);
      if (!zipCode) throw new BadRequestException('CEP inválido');
      address = {
        zipCode,
        street: input.address.street,
        streetNumber: input.address.number,
        district: input.address.district,
        city: input.address.city,
        state: input.address.state,
        complement: input.address.complement ?? null,
        reference: input.address.reference ?? null,
      };
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.socialName !== undefined && { socialName: input.socialName || null }),
        ...(input.email !== undefined && { email: input.email }),
        ...address,
      },
    });
  }

  async getBuyer(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
