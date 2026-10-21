// Teste de carga da reserva de números (rodar com o docker compose de dev no ar):
//   node test/load/orders-concurrency.mjs [pedidos=600] [api=http://localhost:3333/api]
//
// Cria duas rifas pequenas (2.000 números; uma de roleta e uma de grade), dispara centenas de pedidos ao mesmo tempo
// (aleatórios, escolhidos na grade disputando os mesmos números e reenvios duplicados)
// e confere no banco que nenhum número foi vendido duas vezes e que os contadores batem.
// Usa X-Forwarded-For aleatório para simular IPs diferentes (só funciona em dev,
// onde a API confia no cabeçalho; em produção quem define o IP é o Caddy).
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const TOTAL_ORDERS = Number(process.argv[2] ?? 600);
const API = process.argv[3] ?? 'http://localhost:3333/api';
const ORIGIN = 'http://localhost:5173';
const TOTAL_NUMBERS = 2000;

const ip = () => `10.${(Math.random() * 255) | 0}.${(Math.random() * 255) | 0}.${(Math.random() * 255) | 0}`;
const rand = (n) => (Math.random() * n) | 0;

let cookie = '';
async function call(method, path, body, { form, headers = {} } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Origin: ORIGIN,
      Cookie: cookie,
      'X-Forwarded-For': ip(),
      ...(body && !form && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return { status: res.status, data: await res.json().catch(() => null) };
}

function sql(query) {
  return execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'rifas', '-At', '-c', query], {
    cwd: new URL('../../..', import.meta.url),
    encoding: 'utf8',
  }).trim();
}

// ── 1. Rifas de teste: uma de roleta (quantidade) e uma de grade (números escolhidos) ──
await call('POST', '/auth/login', { email: 'admin@rifas.local', password: 'admin-dev-123456' });
const img = await sharp({ create: { width: 800, height: 450, channels: 3, background: '#444' } }).jpeg().toBuffer();
const form = () => {
  const f = new FormData();
  f.append('file', new Blob([img], { type: 'image/jpeg' }), 'x.jpg');
  return f;
};
async function createRaffle(saleMode) {
  const slug = `carga-${saleMode.toLowerCase()}-${Date.now()}`;
  const { data: raffle } = await call('POST', '/admin/raffles', {
    title: `Teste de carga ${saleMode} ${new Date().toISOString()}`,
    slug,
    description: 'Gerada pelo teste de carga',
    saleMode,
    totalNumbers: TOTAL_NUMBERS,
    priceCents: 100,
    maxPerOrder: 50,
  });
  await call('POST', `/admin/raffles/${raffle.id}/cover`, null, { form: form() });
  await call('POST', `/admin/raffles/${raffle.id}/prizes`, { title: 'Prêmio', kind: 'ITEM' });
  const pub = await call('POST', `/admin/raffles/${raffle.id}/publish`);
  if (pub.data?.status !== 'ACTIVE') throw new Error(`Falha ao publicar: ${JSON.stringify(pub.data)}`);
  return { id: raffle.id, slug };
}
const qtyRaffle = await createRaffle('QUANTITY');
const pickRaffle = await createRaffle('PICK');
cookie = '';

// ── 2. Pedidos simultâneos ──
const buyer = (i) => ({ name: `Comprador ${i}`, phone: `119${String(10_000_000 + i).slice(-8)}` });
const jobs = [];
const dupKeys = [];
for (let i = 0; i < TOTAL_ORDERS; i++) {
  const key = randomUUID();
  if (i % 3 === 0) {
    // disputa: todos querem números entre 0 e 59
    const nums = [...new Set([rand(60), rand(60), rand(60)])];
    jobs.push({ kind: 'pick', body: { raffleSlug: pickRaffle.slug, numbers: nums, buyer: buyer(i), idempotencyKey: key } });
  } else {
    jobs.push({ kind: 'qty', body: { raffleSlug: qtyRaffle.slug, quantity: 1 + rand(5), buyer: buyer(i), idempotencyKey: key } });
  }
  if (i % 10 === 0) dupKeys.push(jobs.length - 1);
}
// reenvios do mesmo pedido (clique duplo)
for (const j of dupKeys) jobs.push({ kind: 'dup', of: j, body: jobs[j].body });

const started = Date.now();
const results = await Promise.all(jobs.map((j) => call('POST', '/orders', j.body)));
const elapsed = Date.now() - started;

const byStatus = {};
results.forEach((r, i) => {
  const k = `${jobs[i].kind}:${r.status}`;
  byStatus[k] = (byStatus[k] ?? 0) + 1;
});

// reenvio devolveu o mesmo pedido?
let dupMismatch = 0;
jobs.forEach((j, i) => {
  if (j.kind !== 'dup') return;
  const a = results[j.of].data?.id;
  const b = results[i].data?.id;
  if (results[j.of].status === 201 && a !== b) dupMismatch++;
});

// ── 3. Conferência no banco ──
const ids = `'${qtyRaffle.id}','${pickRaffle.id}'`;
const check = {
  pedidosCriados: Number(sql(`select count(*) from orders where "raffleId" in (${ids})`)),
  numerosReservadosNoBanco: Number(sql(`select count(*) from raffle_numbers where "raffleId" in (${ids}) and status='RESERVED'`)),
  somaQuantidadeDosPedidos: Number(sql(`select coalesce(sum(quantity),0) from orders where "raffleId" in (${ids}) and status='PENDING'`)),
  contadorDaRifa: Number(sql(`select sum("reservedCount") from raffles where id in (${ids})`)),
  pedidosComQuantidadeErrada: Number(
    sql(`select count(*) from orders o where "raffleId" in (${ids}) and quantity <> (select count(*) from raffle_numbers n where n."orderId"=o.id)`),
  ),
  reservadosSemPedido: Number(sql(`select count(*) from raffle_numbers where "raffleId" in (${ids}) and status='RESERVED' and "orderId" is null`)),
};

const ok =
  check.numerosReservadosNoBanco === check.somaQuantidadeDosPedidos &&
  check.somaQuantidadeDosPedidos === check.contadorDaRifa &&
  check.pedidosComQuantidadeErrada === 0 &&
  check.reservadosSemPedido === 0 &&
  dupMismatch === 0 &&
  !Object.keys(byStatus).some((k) => k.endsWith(':500'));

console.log(JSON.stringify({ requisicoes: jobs.length, ms: elapsed, porSegundo: Math.round(jobs.length / (elapsed / 1000)), respostas: byStatus, reenviosComPedidoDiferente: dupMismatch, banco: check, resultado: ok ? 'OK' : 'FALHOU' }, null, 2));
process.exit(ok ? 0 : 1);
