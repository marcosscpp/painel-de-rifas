import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { orderRoom, raffleRoom, RealtimeService } from './realtime.service.js';

const SLUG = /^[a-z0-9-]{1,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROOMS_PER_SOCKET = 6;

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
    credentials: true,
  },
  maxHttpBufferSize: 4096, // mensagens do cliente são minúsculas
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class RealtimeGateway implements OnGatewayInit {
  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  @SubscribeMessage('raffle:join')
  joinRaffle(@ConnectedSocket() socket: Socket, @MessageBody() body: { slug?: unknown }) {
    if (typeof body?.slug !== 'string' || !SLUG.test(body.slug)) return { ok: false };
    return this.join(socket, raffleRoom(body.slug));
  }

  @SubscribeMessage('raffle:leave')
  leaveRaffle(@ConnectedSocket() socket: Socket, @MessageBody() body: { slug?: unknown }) {
    if (typeof body?.slug === 'string') void socket.leave(raffleRoom(body.slug));
    return { ok: true };
  }

  @SubscribeMessage('order:join')
  joinOrder(@ConnectedSocket() socket: Socket, @MessageBody() body: { orderId?: unknown }) {
    if (typeof body?.orderId !== 'string' || !UUID.test(body.orderId)) return { ok: false };
    return this.join(socket, orderRoom(body.orderId));
  }

  private join(socket: Socket, room: string) {
    if (socket.rooms.size > MAX_ROOMS_PER_SOCKET) return { ok: false };
    void socket.join(room);
    return { ok: true };
  }
}
