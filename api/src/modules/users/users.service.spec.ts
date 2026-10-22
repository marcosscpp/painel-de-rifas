import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { makePrisma, makeSettings, type PrismaMock, uniqueViolation } from '../../../test/helpers/mocks.js';
import type { BuyerDto } from './dto/buyer.dto.js';
import { UsersService } from './users.service.js';

const buyer = (over: Partial<BuyerDto> = {}): BuyerDto => ({
  name: 'Maria Souza',
  phone: '(11) 98765-4321',
  phoneConfirm: '11987654321',
  cpf: '529.982.247-25',
  birthDate: '1990-05-10',
  email: 'maria@x.com',
  ...over,
});

describe('UsersService', () => {
  let prisma: PrismaMock;
  let service: UsersService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UsersService(prisma as never, makeSettings() as never);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.upsert.mockResolvedValue({ id: 'u1' });
  });

  describe('upsertBuyer', () => {
    it('normaliza celular e CPF e grava o cadastro completo', async () => {
      await service.upsertBuyer(buyer({ socialName: 'Mari' }));
      const call = prisma.user.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ phone: '11987654321' });
      expect(call.create).toMatchObject({
        phone: '11987654321',
        role: 'BUYER',
        name: 'Maria Souza',
        socialName: 'Mari',
        cpf: '52998224725',
        email: 'maria@x.com',
        birthDate: new Date(Date.UTC(1990, 4, 10)),
      });
    });

    it('grava endereço quando informado', async () => {
      await service.upsertBuyer(
        buyer({
          address: { zipCode: '01310-100', street: 'Av. Paulista', number: '1000', district: 'Bela Vista', city: 'São Paulo', state: 'SP' },
        }),
      );
      expect(prisma.user.upsert.mock.calls[0][0].update).toMatchObject({
        zipCode: '01310100',
        street: 'Av. Paulista',
        streetNumber: '1000',
        state: 'SP',
        complement: null,
      });
    });

    it('os dois celulares precisam ser iguais', async () => {
      await expect(service.upsertBuyer(buyer({ phoneConfirm: '11987654320' }))).rejects.toThrow('não são iguais');
    });

    it('recusa celular, CPF e data inválidos', async () => {
      await expect(service.upsertBuyer(buyer({ phone: '123', phoneConfirm: '123' }))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.upsertBuyer(buyer({ cpf: '111.111.111-11' }))).rejects.toThrow('CPF inválido');
      await expect(service.upsertBuyer(buyer({ birthDate: '1990-02-30' }))).rejects.toThrow('Data de nascimento');
      await expect(service.upsertBuyer(buyer({ birthDate: '1850-01-01' }))).rejects.toThrow('Data de nascimento');
    });

    it('recusa menor de idade', async () => {
      const year = new Date().getUTCFullYear() - 17;
      await expect(service.upsertBuyer(buyer({ birthDate: `${year}-01-01` }))).rejects.toThrow('maiores de 18');
    });

    it('celular de admin não vira comprador', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'a1', role: 'ADMIN' });
      await expect(service.upsertBuyer(buyer())).rejects.toBeInstanceOf(ConflictException);
    });

    it('celular já ligado a outro CPF não aceita troca (protege o cadastro de quem é dono)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', role: 'BUYER', cpf: '11144477735' });
      await expect(service.upsertBuyer(buyer())).rejects.toThrow('outro CPF');
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('CPF ou e-mail de outra pessoa são recusados', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'outro' });
      await expect(service.upsertBuyer(buyer())).rejects.toThrow('outro celular');

      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'outro' });
      await expect(service.upsertBuyer(buyer())).rejects.toThrow('e-mail já está em outro cadastro');
    });

    it('compra simultânea do mesmo celular novo: repete como atualização', async () => {
      prisma.user.upsert.mockRejectedValueOnce(uniqueViolation()).mockResolvedValueOnce({ id: 'u1' });
      await expect(service.upsertBuyer(buyer())).resolves.toEqual({ id: 'u1' });
      expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('findBuyer', () => {
    it('acha o comprador quando celular e CPF batem', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', role: 'BUYER', cpf: '52998224725' });
      await expect(service.findBuyer('(11) 98765-4321', '529.982.247-25')).resolves.toMatchObject({ id: 'u1' });
    });

    it('mesma resposta para "não existe", "CPF errado" e admin (não revela quem tem cadastro)', async () => {
      const errs = [];
      prisma.user.findUnique.mockResolvedValueOnce(null);
      errs.push(await service.findBuyer('11987654321', '52998224725').catch((e: unknown) => e));
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', role: 'BUYER', cpf: '11144477735' });
      errs.push(await service.findBuyer('11987654321', '52998224725').catch((e: unknown) => e));
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'a1', role: 'ADMIN', cpf: '52998224725' });
      errs.push(await service.findBuyer('11987654321', '52998224725').catch((e: unknown) => e));
      for (const e of errs) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect((e as Error).message).toBe('Não encontramos cadastro com esse celular e CPF');
      }
    });
  });
});
