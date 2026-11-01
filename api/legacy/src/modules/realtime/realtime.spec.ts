import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

function fakeServer() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { server: { to } as never, to, emit };
}

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new RealtimeService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('emite números alterados na sala da rifa e ignora lista vazia', () => {
    const { server, to, emit } = fakeServer();
    service.attach(server);
    service.numbersChanged('onix', 'RESERVED', [1, 2]);
    service.numbersChanged('onix', 'RESERVED', []);
    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('raffle:onix');
    expect(emit).toHaveBeenCalledWith('raffle:numbers', { slug: 'onix', status: 'RESERVED', numbers: [1, 2] });
  });

  it('agrupa progresso: muitas vendas no mesmo segundo viram um evento só', async () => {
    const { server, emit } = fakeServer();
    service.attach(server);
    const read = vi.fn().mockResolvedValue({ paid: 1, reserved: 2, available: 7, percent: 10 });
    for (let i = 0; i < 50; i++) service.progressChanged('onix', read);

    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('raffle:progress', {
      slug: 'onix',
      progress: { paid: 1, reserved: 2, available: 7, percent: 10 },
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(emit).toHaveBeenCalledTimes(1); // nada novo, nada emitido
  });

  it('erro ao ler progresso não derruba o timer', async () => {
    const { server, emit } = fakeServer();
    service.attach(server);
    service.progressChanged('a', vi.fn().mockRejectedValue(new Error('db')));
    await vi.advanceTimersByTimeAsync(1000);
    service.progressChanged('b', vi.fn().mockResolvedValue({ paid: 0, reserved: 0, available: 1, percent: 0 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(emit).toHaveBeenCalledWith('raffle:progress', expect.objectContaining({ slug: 'b' }));
  });

  it('status do pedido vai só para a sala do pedido', () => {
    const { server, to, emit } = fakeServer();
    service.attach(server);
    service.orderStatus('o1', 'PAID');
    expect(to).toHaveBeenCalledWith('order:o1');
    expect(emit).toHaveBeenCalledWith('order:status', { orderId: 'o1', status: 'PAID' });
  });
});

describe('RealtimeGateway', () => {
  const gateway = new RealtimeGateway({ attach: vi.fn() } as never);
  const socket = (rooms = 1) => ({ rooms: new Set(Array.from({ length: rooms }, (_, i) => `r${i}`)), join: vi.fn(), leave: vi.fn() });

  it('entra na sala da rifa com slug válido', () => {
    const s = socket();
    expect(gateway.joinRaffle(s as never, { slug: 'onix-0km' })).toEqual({ ok: true });
    expect(s.join).toHaveBeenCalledWith('raffle:onix-0km');
  });

  it('recusa slug ou id de pedido malformados', () => {
    const s = socket();
    expect(gateway.joinRaffle(s as never, { slug: '../admin' })).toEqual({ ok: false });
    expect(gateway.joinRaffle(s as never, { slug: 123 })).toEqual({ ok: false });
    expect(gateway.joinOrder(s as never, { orderId: 'nao-e-uuid' })).toEqual({ ok: false });
    expect(s.join).not.toHaveBeenCalled();
  });

  it('entra na sala do pedido com UUID', () => {
    const s = socket();
    expect(gateway.joinOrder(s as never, { orderId: '7f1c3a2e-0000-4000-8000-000000000001' })).toEqual({ ok: true });
    expect(s.join).toHaveBeenCalledWith('order:7f1c3a2e-0000-4000-8000-000000000001');
  });

  it('limita salas por conexão', () => {
    const s = socket(7);
    expect(gateway.joinRaffle(s as never, { slug: 'onix' })).toEqual({ ok: false });
  });
});
