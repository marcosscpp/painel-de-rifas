import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Server } from 'socket.io';

export type NumberStatusCode = 'AVAILABLE' | 'RESERVED' | 'PAID';
export type ProgressPayload = { paid: number; reserved: number; available: number; percent: number };

export const raffleRoom = (slug: string) => `raffle:${slug}`;
export const orderRoom = (id: string) => `order:${id}`;

// Ponto único para emitir eventos. Os serviços de domínio chamam daqui
// e não precisam saber de Socket.IO. Com várias instâncias da API, basta
// plugar o adapter Redis no gateway: este código não muda.
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private server: Server | null = null;
  // Progresso é agrupado: em pico, no máximo 1 evento por segundo por rifa.
  private readonly pendingProgress = new Map<string, () => Promise<ProgressPayload>>();
  private readonly timer = setInterval(() => void this.flushProgress(), 1000);

  attach(server: Server) {
    this.server = server;
  }

  numbersChanged(slug: string, status: NumberStatusCode, numbers: number[]) {
    if (!numbers.length) return;
    this.server?.to(raffleRoom(slug)).emit('raffle:numbers', { slug, status, numbers });
  }

  // Recebe uma função que lê o progresso atual: lida só na hora de emitir.
  progressChanged(slug: string, read: () => Promise<ProgressPayload>) {
    this.pendingProgress.set(slug, read);
  }

  orderStatus(orderId: string, status: string) {
    this.server?.to(orderRoom(orderId)).emit('order:status', { orderId, status });
  }

  private async flushProgress() {
    if (!this.server || !this.pendingProgress.size) return;
    const batch = [...this.pendingProgress];
    this.pendingProgress.clear();
    await Promise.all(
      batch.map(async ([slug, read]) => {
        try {
          this.server?.to(raffleRoom(slug)).emit('raffle:progress', { slug, progress: await read() });
        } catch {
          // falha ao ler progresso não pode derrubar o timer
        }
      }),
    );
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }
}
