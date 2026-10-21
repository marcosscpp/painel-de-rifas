import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { isFinished } from '../raffles/raffle.rules.js';
import { RafflesService } from '../raffles/raffles.service.js';
import { type UploadedImage, UploadsService } from '../uploads/uploads.service.js';
import type { CreatePrizeDto, UpdatePrizeDto } from './dto/prize.dto.js';

const MAX_IMAGES_PER_PRIZE = 10;

// Todas as operações devolvem a rifa completa, que é o que o formulário do admin mostra.
@Injectable()
export class PrizesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly raffles: RafflesService,
    private readonly uploads: UploadsService,
  ) {}

  async create(raffleId: string, dto: CreatePrizeDto) {
    const r = await this.raffles.get(raffleId);
    if (isFinished(r.status)) throw new ConflictException('Rifa encerrada');
    const position = dto.position ?? (r.prizes.at(-1)?.position ?? 0) + 1;
    await this.prisma.prize.create({
      data: { ...dto, raffleId, position, description: dto.description ?? '' },
    });
    return this.raffles.get(raffleId);
  }

  async update(id: string, dto: UpdatePrizeDto) {
    const prize = await this.findWithRaffle(id);
    if (isFinished(prize.raffle.status)) throw new ConflictException('Rifa encerrada');
    // Publicada: o prêmio anunciado não pode trocar de tipo ou valor (texto e fotos podem).
    if (prize.raffle.status !== 'DRAFT') {
      const kindChanged = dto.kind !== undefined && dto.kind !== prize.kind;
      const valueChanged = dto.valueCents !== undefined && dto.valueCents !== prize.valueCents;
      if (kindChanged || valueChanged) {
        throw new ConflictException('Tipo e valor do prêmio não mudam depois de publicada');
      }
    }
    await this.prisma.prize.update({ where: { id }, data: dto });
    return this.raffles.get(prize.raffleId);
  }

  async remove(id: string) {
    const prize = await this.findWithRaffle(id);
    if (prize.raffle.status !== 'DRAFT') {
      throw new ConflictException('Prêmio só pode ser removido com a rifa em rascunho');
    }
    await this.prisma.prize.delete({ where: { id } });
    await this.uploads.deleteImages(prize.images.map((i) => i.key));
    return this.raffles.get(prize.raffleId);
  }

  async addImage(id: string, file: UploadedImage | undefined) {
    const prize = await this.findWithRaffle(id);
    if (prize.raffle.status === 'DRAWN') throw new ConflictException('Rifa já sorteada');
    if (prize.images.length >= MAX_IMAGES_PER_PRIZE) {
      throw new ConflictException(`Máximo de ${MAX_IMAGES_PER_PRIZE} fotos por prêmio`);
    }
    const key = await this.uploads.saveImage(file, `raffles/${prize.raffleId}/prizes/${id}`);
    const position = (prize.images.at(-1)?.position ?? -1) + 1;
    await this.prisma.prizeImage.create({ data: { prizeId: id, key, position } });
    return this.raffles.get(prize.raffleId);
  }

  async removeImage(imageId: string) {
    const img = await this.prisma.prizeImage.findUnique({
      where: { id: imageId },
      include: { prize: { include: { raffle: { select: { id: true, status: true } } } } },
    });
    if (!img) throw new NotFoundException('Imagem não encontrada');
    if (img.prize.raffle.status === 'DRAWN') throw new ConflictException('Rifa já sorteada');
    await this.prisma.prizeImage.delete({ where: { id: imageId } });
    await this.uploads.deleteImages([img.key]);
    return this.raffles.get(img.prize.raffle.id);
  }

  private async findWithRaffle(id: string) {
    const prize = await this.prisma.prize.findUnique({
      where: { id },
      include: {
        raffle: { select: { status: true } },
        images: { orderBy: { position: 'asc' } },
      },
    });
    if (!prize) throw new NotFoundException('Prêmio não encontrado');
    return prize;
  }
}
