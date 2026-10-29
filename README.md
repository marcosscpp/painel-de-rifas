<div align="center">

<img src="web/public/brand/logo-horizontal.svg" alt="WinClub" width="300" />

# Painel de Rifas

**Da campanha ao resultado: site de vendas e painel administrativo em um só projeto.**

Campanhas · Reserva de números · Pix · Sorteios · Relatórios

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-e0234e?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)

[Funcionalidades](#funcionalidades) · [Começar](#começar) · [Configuração](#configuração) · [Produção](#produção) · [Documentação](#documentação)

</div>

## Sobre

Plataforma de rifas com identidade visual **WinClub**, desenvolvida para uma operação individual. Reúne a experiência do comprador e a gestão administrativa: publicação de campanhas, venda de números, pagamento via Pix, acompanhamento de pedidos e divulgação de resultados.

O monorepositório combina um frontend React com uma API NestJS. PostgreSQL armazena campanhas, reservas e pagamentos; MinIO guarda as imagens; Socket.IO transmite atualizações em tempo real.

## Funcionalidades

| Para quem compra | Para quem administra |
|---|---|
| Catálogo de campanhas, prêmios e progresso das vendas | Dashboard com faturamento e desempenho das campanhas |
| Compra por quantidade aleatória ou escolha em grade | Cadastro de rifas, prêmios, imagens e pacotes |
| Reserva temporária e Pix com QR Code e copia e cola | Publicação, pausa e encerramento de campanhas |
| Atualização do pedido após confirmação do pagamento | Gestão de pedidos, cancelamentos e reembolsos |
| Acesso com celular e CPF e área **Meus números** | Consulta de compradores e histórico de compras |
| Consulta dos resultados publicados | Sorteios com resultados da Loteria Federal |
| Área de dados cadastrais | Relatórios com filtros e exportação em **CSV e XLSX** |

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 e Tailwind CSS 4 |
| Dados e formulários | TanStack Query, Axios, React Hook Form e Zod |
| API | NestJS 12 e Node.js 24 |
| Persistência | PostgreSQL 17 e Prisma 7 com migrations versionadas |
| Tempo real | Socket.IO |
| Pagamentos | Asaas para Pix e provedor simulado para desenvolvimento |
| Imagens | MinIO compatível com S3 e processamento com Sharp |
| Infraestrutura | Docker Compose, Nginx e Caddy |
| Qualidade | Vitest, Supertest e Oxlint |

## Começar

Pré-requisitos: Git e Docker com Compose disponível. No Windows, use Docker Desktop.

Execute os comandos na raiz do projeto. O Compose já define os valores locais; não é necessário criar um `.env` para começar.

```bash
docker compose up --build
```

Quando a API concluir a inicialização, abra outro terminal e crie o administrador:

```bash
docker compose exec api npm run admin:create
```

| Serviço | Endereço |
|---|---|
| Site | http://localhost:5173 |
| Painel administrativo | http://localhost:5173/admin |
| Health check da API | http://localhost:3333/api/health |
| Console do MinIO | http://localhost:9001 |
| PostgreSQL | `localhost:5433` |

**Credenciais exclusivas de desenvolvimento:**

| Acesso | Usuário | Senha |
|---|---|---|
| Administrador | `admin@rifas.local` | `admin-dev-123456` |
| MinIO | `rifas` | `rifas-secret` |
| PostgreSQL (banco `rifas`) | `rifas` | `rifas` |

O frontend e a API recarregam durante o desenvolvimento. Banco e imagens ficam em volumes persistentes.

```bash
# Iniciar em segundo plano
docker compose up -d

# Acompanhar a API
docker compose logs -f api

# Reconstruir e renovar volumes anônimos após mudar dependências
docker compose up --build -V

# Parar os serviços, preservando os volumes de dados
docker compose down
```

## Configuração

Os exemplos estão em [`.env.example`](.env.example), para o Compose, e [`api/.env.example`](api/.env.example), para executar a API fora dos containers.

Em desenvolvimento, crie um `.env` na raiz com somente os valores que deseja sobrescrever. O exemplo completo contém campos vazios que precisam ser preenchidos antes do uso.

| Variável | Finalidade |
|---|---|
| `API_PORT` / `DB_PORT` | Portas locais; padrões `3333` e `5433` |
| `DOMAIN` | Domínio de produção |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais e nome do banco |
| `JWT_SECRET` | Segredo das sessões administrativas |
| `PII_KEYS` | Chaves de criptografia versionadas: `1:<chave em base64>` |
| `PII_INDEX_KEY` | Chave dos índices de busca de dados pessoais |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | Credenciais e bucket de imagens |
| `PAYMENT_PROVIDER` | `FAKE` em desenvolvimento ou `ASAAS` para integração real |
| `PAYMENT_API_KEY`, `PAYMENT_BASE_URL` | Credenciais e ambiente do gateway |
| `PAYMENT_WEBHOOK_TOKEN` | Token de autenticação dos eventos de pagamento |
| `PIX_FEE_CENTS` | Taxa por pedido em centavos; padrão `199` |
| `RESERVATION_MINUTES` | Prazo de reserva; padrão `15` minutos |
| `SESSION_TTL_MINUTES` | Sessão administrativa; padrão `480` minutos |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Dados usados pelo comando de criação do administrador |

Guarde as chaves de criptografia também fora do servidor: elas são necessárias para recuperar os dados pessoais. Arquivos `.env` locais são ignorados pelo Git.

## Pagamento Pix

| Provedor | Comportamento |
|---|---|
| `FAKE` | Cobrança simulada e botão **Simular pagamento** na tela do pedido. A API recusa esse provedor em produção. |
| `ASAAS` | Pix real ou de sandbox, conforme `PAYMENT_BASE_URL`. Exige chave da API, token de webhook e CPF do comprador. |

Para usar o Asaas, configure `PAYMENT_PROVIDER=ASAAS` e os demais campos do gateway. A implementação utiliza `https://api-sandbox.asaas.com/v3` para testes e `https://api.asaas.com/v3` para produção.

O endpoint de recebimento é:

```text
https://SEU_DOMINIO/api/webhooks/asaas
```

O processamento trata os eventos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`. O token configurado no gateway deve corresponder a `PAYMENT_WEBHOOK_TOKEN`.

Eventos repetidos são deduplicados. Se um Pix chegar após a reserva expirar, o sistema tenta recuperar os mesmos números; quando eles já estiverem ocupados, o pedido é sinalizado com `refundRequired` para tratamento administrativo.

## Estrutura

```text
painel-de-rifas/
├── api/
│   ├── prisma/              # Schema e migrations do banco
│   ├── src/
│   │   ├── common/          # Guards, decorators, middleware e utilitários
│   │   ├── config/          # Validação das variáveis de ambiente
│   │   ├── infra/           # Prisma, criptografia e armazenamento S3
│   │   ├── modules/         # Domínios da API
│   │   └── scripts/         # Criação do administrador
│   └── test/                # Suporte de testes, E2E e carga
├── web/
│   ├── public/brand/        # Identidade visual WinClub
│   └── src/
│       ├── app/             # Rotas, layouts e providers
│       ├── domains/         # Funcionalidades organizadas por domínio
│       └── shared/          # Componentes, hooks, tipos e utilitários
├── infra/                   # Proxy reverso e HTTPS
├── docs/                    # Modelagem, decisões e referências
├── docker-compose.yml       # Desenvolvimento
└── docker-compose.prod.yml  # Produção
```

No frontend, `shared` não importa de `domains`; os domínios expõem suas interfaces pelo `index.ts`, e `app` compõe as telas. As páginas são carregadas sob demanda por domínio.

## Qualidade e banco de dados

Com os serviços de desenvolvimento em execução:

```bash
# API: testes unitários, E2E, lint e build
docker compose exec api npm test
docker compose exec api npm run test:e2e
docker compose exec api npm run lint
docker compose exec api npm run build

# Frontend: lint e build com verificação de tipos
docker compose exec web npm run lint
docker compose exec web npm run build

# Criar uma migration após alterar o schema
docker compose exec api npx prisma migrate dev --name descricao
```

As migrations pendentes são aplicadas na inicialização do ambiente de desenvolvimento. Em produção, o serviço `migrate` executa antes da API.

### Teste de concorrência

Requer Node.js 24, as dependências da API instaladas e o ambiente local em execução com o administrador padrão criado:

```bash
cd api
npm ci
node test/load/orders-concurrency.mjs 600
```

Cria duas rifas de 2.000 números, dispara pedidos simultâneos nos modos aleatório e grade, inclui disputas pelos mesmos números e reenvios duplicados, e confere reservas e contadores no banco. Execute em um ambiente de desenvolvimento descartável.

## Segurança

| Camada | Implementação |
|---|---|
| Dados pessoais | AES-256-GCM por campo, chaves versionadas e índices de busca com HMAC-SHA256 |
| Autenticação | Senhas administrativas com Argon2id e JWT em cookie `httpOnly`, `SameSite=Strict` e `Secure` em produção |
| Autorização | Login por padrão na API, exceções públicas explícitas e restrição por papel |
| Sessões | Validação no banco e invalidação após troca de senha |
| Requisições | Rate limit, validação de DTOs, rejeição de campos desconhecidos e verificação de origem |
| Webhooks | Comparação segura do token e deduplicação de eventos |
| Configuração | Variáveis validadas no boot e rejeição do gateway simulado em produção |
| Produção | Headers de segurança, containers da aplicação sem root e portas públicas concentradas no proxy |

## Produção

1. Aponte o DNS de `DOMAIN` e `img.DOMAIN` para o servidor e disponibilize as portas 80 e 443.
2. Copie `.env.example` para `.env` e preencha domínio, credenciais e chaves próprias.
3. Configure `PAYMENT_PROVIDER=ASAAS`, a URL de produção do gateway e um token de webhook com pelo menos 24 caracteres.
4. Inicie os serviços:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Para criar o administrador, defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente do terminal e repasse as variáveis ao container. A senha deve ter pelo menos 12 caracteres.

```bash
docker compose -f docker-compose.prod.yml run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD api node dist/scripts/create-admin.js
```

O comando também atualiza um administrador existente e invalida suas sessões anteriores. As variáveis do `.env` usadas na interpolação do Compose não são exportadas automaticamente para o terminal.

O Caddy fornece HTTPS para o site e para as imagens. Somente o proxy publica portas; banco e armazenamento não possuem portas públicas no Compose de produção.

**Evoluções de infraestrutura previstas:** backups automáticos externos de PostgreSQL e MinIO, Redis para múltiplas instâncias da API e deploy sem interrupção.

## Documentação

- [Modelo de domínio](docs/MODELO.md) — entidades e regras do negócio.
- [Decisões e planejamento](SETUP.md) — histórico do projeto; contém propostas anteriores à implementação atual.
- [Análise das referências](docs/analise-rea.md) — levantamento usado no planejamento.
- [Análise de checkout](docs/analise-checkout-wesley.md) — referência para o fluxo de compra.
- [Identidade visual](docs/marca/) — arquivos e estudos da marca.

## Licença

Este repositório não possui uma licença de código aberto definida.
