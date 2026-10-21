import { BadRequestException, ConflictException } from '@nestjs/common';
import { makePrisma, type PrismaMock, uniqueViolation } from '../../../test/helpers/mocks.js';
import { UsersService } from './users.service.js';

describe('UsersService.upsertBuyer', () => {
  let prisma: PrismaMock;
  let service: UsersService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UsersService(prisma as never);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.upsert.mockResolvedValue({ id: 'u1' });
  });

  it('normaliza o telefone e cria o comprador', async () => {
    await service.upsertBuyer({ name: 'Maria', phone: '+55 (11) 98765-4321' });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { phone: '11987654321' },
      create: { phone: '11987654321', name: 'Maria', cpf: null, role: 'BUYER' },
      update: { name: 'Maria' },
    });
  });

  it('recusa telefone e CPF inválidos', async () => {
    await expect(service.upsertBuyer({ name: 'M', phone: '123' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.upsertBuyer({ name: 'M', phone: '11987654321', cpf: '111.111.111-11' }),
    ).rejects.toThrow('CPF inválido');
  });

  it('telefone de admin não vira comprador', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'a1', role: 'ADMIN' });
    await expect(service.upsertBuyer({ name: 'M', phone: '11987654321' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('CPF já ligado a outro telefone é recusado', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // telefone novo
      .mockResolvedValueOnce({ id: 'outro' }); // dono do CPF
    await expect(
      service.upsertBuyer({ name: 'M', phone: '11987654321', cpf: '529.982.247-25' }),
    ).rejects.toThrow('outro telefone');
  });

  it('não sobrescreve CPF já cadastrado', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', role: 'BUYER', cpf: '52998224725' })
      .mockResolvedValueOnce({ id: 'u1' });
    await service.upsertBuyer({ name: 'Maria', phone: '11987654321', cpf: '529.982.247-25' });
    expect(prisma.user.upsert.mock.calls[0][0].update).toEqual({ name: 'Maria' });
  });

  it('compra simultânea do mesmo telefone novo: repete como atualização', async () => {
    prisma.user.upsert.mockRejectedValueOnce(uniqueViolation()).mockResolvedValueOnce({ id: 'u1' });
    await expect(service.upsertBuyer({ name: 'M', phone: '11987654321' })).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
  });
});
