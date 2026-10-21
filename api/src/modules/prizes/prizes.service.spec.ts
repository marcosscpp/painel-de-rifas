import { ConflictException, NotFoundException } from '@nestjs/common';
import { makePrisma, type PrismaMock } from '../../../test/helpers/mocks.js';
import { PrizesService } from './prizes.service.js';

const prize = (raffleStatus: string, images = 1, over: Record<string, unknown> = {}) => ({
  id: 'p1',
  raffleId: 'r1',
  kind: 'ITEM',
  valueCents: 9_000_000,
  raffle: { status: raffleStatus },
  images: Array.from({ length: images }, (_, i) => ({ id: `i${i}`, key: `k${i}`, position: i })),
  ...over,
});

describe('PrizesService', () => {
  let prisma: PrismaMock;
  let raffles: { get: ReturnType<typeof vi.fn> };
  let uploads: { saveImage: ReturnType<typeof vi.fn>; deleteImages: ReturnType<typeof vi.fn> };
  let service: PrizesService;

  beforeEach(() => {
    prisma = makePrisma();
    raffles = { get: vi.fn().mockResolvedValue({ id: 'r1', status: 'DRAFT', prizes: [{ position: 1 }, { position: 2 }] }) };
    uploads = { saveImage: vi.fn().mockResolvedValue('nova-key'), deleteImages: vi.fn() };
    service = new PrizesService(prisma as never, raffles as never, uploads as never);
  });

  it('novo prêmio entra na próxima posição', async () => {
    await service.create('r1', { title: 'Kit churrasco', kind: 'ITEM' });
    expect(prisma.prize.create).toHaveBeenCalledWith({
      data: { title: 'Kit churrasco', kind: 'ITEM', raffleId: 'r1', position: 3, description: '' },
    });
  });

  it('rifa encerrada não recebe prêmio', async () => {
    raffles.get.mockResolvedValueOnce({ id: 'r1', status: 'CLOSED', prizes: [] });
    await expect(service.create('r1', { title: 'X', kind: 'ITEM' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('depois de publicada, tipo e valor do prêmio não mudam; texto muda', async () => {
    prisma.prize.findUnique.mockResolvedValue(prize('ACTIVE'));
    await expect(service.update('p1', { valueCents: 1 })).rejects.toThrow('Tipo e valor');
    await expect(service.update('p1', { kind: 'MONEY' })).rejects.toThrow('Tipo e valor');
    await service.update('p1', { title: 'Onix 2027', valueCents: 9_000_000 });
    expect(prisma.prize.update).toHaveBeenCalledTimes(1);
  });

  it('só remove prêmio de rascunho, apagando as fotos', async () => {
    prisma.prize.findUnique.mockResolvedValue(prize('ACTIVE'));
    await expect(service.remove('p1')).rejects.toBeInstanceOf(ConflictException);

    prisma.prize.findUnique.mockResolvedValue(prize('DRAFT', 2));
    await service.remove('p1');
    expect(prisma.prize.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(uploads.deleteImages).toHaveBeenCalledWith(['k0', 'k1']);
  });

  it('foto nova vai para o fim da galeria, no máximo 10', async () => {
    prisma.prize.findUnique.mockResolvedValue(prize('ACTIVE', 2));
    await service.addImage('p1', undefined);
    expect(uploads.saveImage).toHaveBeenCalledWith(undefined, 'raffles/r1/prizes/p1');
    expect(prisma.prizeImage.create).toHaveBeenCalledWith({ data: { prizeId: 'p1', key: 'nova-key', position: 2 } });

    prisma.prize.findUnique.mockResolvedValue(prize('ACTIVE', 10));
    await expect(service.addImage('p1', undefined)).rejects.toThrow('Máximo de 10');
  });

  it('rifa sorteada não mexe em fotos', async () => {
    prisma.prize.findUnique.mockResolvedValue(prize('DRAWN'));
    await expect(service.addImage('p1', undefined)).rejects.toBeInstanceOf(ConflictException);
    prisma.prizeImage.findUnique.mockResolvedValue({ id: 'i0', key: 'k0', prize: { raffle: { id: 'r1', status: 'DRAWN' } } });
    await expect(service.removeImage('i0')).rejects.toBeInstanceOf(ConflictException);
  });

  it('remove foto e o arquivo no storage', async () => {
    prisma.prizeImage.findUnique.mockResolvedValue({ id: 'i0', key: 'k0', prize: { raffle: { id: 'r1', status: 'ACTIVE' } } });
    await service.removeImage('i0');
    expect(prisma.prizeImage.delete).toHaveBeenCalledWith({ where: { id: 'i0' } });
    expect(uploads.deleteImages).toHaveBeenCalledWith(['k0']);
  });

  it('prêmio ou foto inexistente é 404', async () => {
    prisma.prize.findUnique.mockResolvedValue(null);
    await expect(service.update('x', {})).rejects.toBeInstanceOf(NotFoundException);
    prisma.prizeImage.findUnique.mockResolvedValue(null);
    await expect(service.removeImage('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
