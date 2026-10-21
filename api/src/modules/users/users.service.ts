import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { normalizeCpf, normalizePhone } from '../../common/utils/br.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export type BuyerInput = { name: string; phone: string; cpf?: string };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Comprador é identificado pelo telefone (sem senha, decisão da etapa 4 pode mudar isso).
  // Mesmo telefone = mesmo comprador; o nome é atualizado para o último informado.
  async upsertBuyer(input: BuyerInput) {
    const phone = normalizePhone(input.phone);
    if (!phone) throw new BadRequestException('Telefone inválido. Use DDD + número.');
    const cpf = input.cpf ? normalizeCpf(input.cpf) : null;
    if (input.cpf && !cpf) throw new BadRequestException('CPF inválido');

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing?.role === 'ADMIN') throw new ConflictException('Telefone indisponível');

    if (cpf) {
      const owner = await this.prisma.user.findUnique({ where: { cpf }, select: { id: true } });
      if (owner && owner.id !== existing?.id) {
        throw new ConflictException('Este CPF já está ligado a outro telefone');
      }
    }

    const upsert = () =>
      this.prisma.user.upsert({
        where: { phone },
        create: { phone, name: input.name, cpf, role: 'BUYER' },
        update: { name: input.name, ...(cpf && !existing?.cpf && { cpf }) },
      });
    // Duas compras simultâneas do mesmo telefone novo: a segunda bate na chave única e repete como update.
    return upsert().catch((e: unknown) => {
      if ((e as { code?: string }).code === 'P2002') return upsert();
      throw e;
    });
  }
}
