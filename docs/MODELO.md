# Modelo do escopo A

Base: proposta comercial de 20/10/2026 (Opção A, R$ 3.000; o escopo é o mesmo da B), `ESCOPO.md` e `SETUP.md`.
O schema correspondente está em `api/prisma/schema.prisma`.

## Papéis (RBAC)

Só dois papéis, decidido em 20/10:

| Papel | Quem | Acesso |
|---|---|---|
| `ADMIN` | Equipe do cliente | Painel inteiro, login com senha |
| `BUYER` | Comprador | Site público, compra e "Meus números" |

Sem níveis intermediários (operador etc.). Comprador sem senha (decidido em 21/10, igual ao Wesley Alemão): depois da primeira compra o site lembra a pessoa por cookie httpOnly de 90 dias ("Comprando como Maria · Trocar"). Em outro aparelho, "Já comprei antes" e "Meus números" pedem celular + CPF do mesmo cadastro.

## Entidades

| Entidade | Para que serve | Pontos-chave |
|---|---|---|
| `User` | Admin e comprador | `role`; comprador: nome, nome social (opcional), celular único (confirmado no checkout), CPF único, nascimento (18+), e-mail único, endereço opcional; `sessionVersion` derruba sessões; senha só para admin |
| `Raffle` | Uma rifa | `paidCount`/`reservedCount` mantidos na mesma transação da reserva (progresso sem COUNT), `status`, `saleMode` (QUANTITY = roleta, PICK = grade; escolhido pelo admin, o comprador não escolhe), `totalNumbers`, `priceCents`, mínimo e máximo por pedido, datas, resultado da Loteria Federal |
| `RafflePackage` | Pacotes promocionais ("+10", "+50") | quantidade e destaque |
| `Prize` / `PrizeImage` | Prêmios e galeria | dinheiro ou item; imagens no MinIO, banco guarda só a chave |
| `RaffleNumber` | Um número da rifa (0 até total-1), gerado ao publicar | PK `(raffleId, number)`, `status` (AVAILABLE, RESERVED, PAID), `orderId`, `reservedUntil`. Sem FK para `raffles` (a checagem por linha deixava a publicação de 1 milhão de números ~5x mais lenta) |
| `Order` | Pedido do comprador | `subtotalCents`, `feeCents` (R$ 1,99), `totalCents`, `idempotencyKey` única, `expiresAt` (15 min) |
| `Payment` | Cobrança Pix no gateway | `(provider, providerChargeId)` único, QR code e copia e cola |
| `WebhookEvent` | Log de webhooks | `(provider, eventId)` único: webhook repetido é ignorado |
| `Setting` | Configurações do admin | chave/valor (taxa, minutos de reserva, logo, cores) |

## Fluxos

### Compra
1. Comprador escolhe a quantidade (ou os números) e informa telefone/nome.
2. Front envia `POST /orders` com uma `idempotencyKey` gerada no clique. Repetir o envio devolve o mesmo pedido.
3. Numa transação, a API reserva os números:
   - **por quantidade:** sorteia candidatos com `crypto.randomInt` e trava os livres pela chave primária (`number = ANY(candidatos) ... ORDER BY random() LIMIT n FOR UPDATE SKIP LOCKED`); perto de esgotar, completa varrendo os livres a partir de um ponto aleatório
   - **escolhendo:** `SELECT ... WHERE number = ANY($1) AND status='AVAILABLE' FOR UPDATE SKIP LOCKED`; se vier menos do que o pedido, falha e avisa quais já foram.
   - marca `RESERVED`, `orderId`, `reservedUntil = agora + 15 min`.
4. API cria a cobrança Pix no gateway (via interface `PaymentProvider`) com valor `subtotal + R$ 1,99`.
5. Front mostra QR code e fica ouvindo a sala do pedido no Socket.IO.
6. Grade e barra de progresso da rifa são atualizadas para todos via Socket.IO.

### Confirmação do Pix
1. Gateway chama `POST /webhooks/:provider`.
2. API grava `WebhookEvent`; se a chave única já existe, responde 200 e não faz nada.
3. Numa transação: pedido `PENDING` → `PAID`, números `RESERVED` → `PAID`, pagamento `CONFIRMED`. O `UPDATE ... WHERE status='PENDING'` garante que só uma confirmação vale.
4. Emite "pagamento confirmado" para a sala do pedido.

### Expiração
- Job a cada 30 s (`@nestjs/schedule`): pedidos `PENDING` com `expiresAt` vencido → `EXPIRED`, números voltam a `AVAILABLE`, cobrança cancelada no gateway.
- Se o Pix chegar depois de expirado: tenta reservar os mesmos números de novo; se algum já foi vendido, marca para reembolso manual no painel.

### Sorteio
1. Admin encerra as vendas (`CLOSED`).
2. Admin informa concurso e resultado da Loteria Federal.
3. API aplica a regra de conversão (**a definir** com o cliente) e grava `winningNumber`; rifa vira `DRAWN` e o ganhador aparece na página.

## Módulos da API (NestJS)

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login do admin (JWT), identificação do comprador, guard por papel |
| `raffles` | CRUD do admin, listagem pública, geração dos números ao publicar |
| `prizes` / `uploads` | Prêmios e upload de imagens (sharp → WebP → MinIO) |
| `orders` | Reserva com SKIP LOCKED, idempotência, expiração |
| `payments` | Interface `PaymentProvider` com `AsaasProvider`, `IuguProvider`, `FakeProvider` (dev); webhooks |
| `realtime` | Gateway Socket.IO: sala por rifa (grade e progresso) e por pedido (confirmação) |
| `draws` | Resultado da Loteria Federal e ganhador |
| `admin-reports` | Pedidos, compradores, faturamento, exportação |
| `settings` | Taxa Pix, minutos de reserva, identidade visual |

## Telas (React)

**Público:** home com rifas ativas, página da rifa (galeria, regulamento, progresso, compra por quantidade e grade), checkout Pix, "Meus números", resultado.

**Admin (`/admin`):** login, dashboard, rifas (criar, editar, pausar, encerrar), prêmios e imagens, pedidos, compradores, sorteio, configurações.

## Fases

| Fase | Entra |
|---|---|
| 1. Protótipo (~09/11) | Compra pelos dois modos, reserva de 15 min, Pix real, várias rifas, painel de rifas e prêmios com imagens |
| 2. Produção | Painel completo (pedidos, compradores, relatórios, sorteio), testes de carga, backups, deploy |

Fora do escopo: afiliados, WhatsApp, migração para nuvem.

## Em aberto

- Regra de conversão do resultado da Loteria Federal.
- Gateway final (Asaas ou iugu) e aceite do segmento.
