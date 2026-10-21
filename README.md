# Painel de Rifas

Plataforma de rifas do Dr. Rodrigo Feitosa. Decisões de stack em [`SETUP.md`](SETUP.md), modelo do escopo em [`docs/MODELO.md`](docs/MODELO.md).

## Estrutura

```
api/src/
  main.ts              helmet, CORS, limite de body, validação, trust proxy
  app.module.ts        guards globais: rate limit → login → papel
  config/              validação das variáveis de ambiente (a API não sobe se faltar algo)
  common/              decorators (@Public, @Roles, @CurrentUser), guards, middleware, utils
  infra/prisma/        PrismaService
  modules/<domínio>/   auth, users, raffles, prizes, orders, payments, realtime, draws, settings, uploads, health
  scripts/             create-admin

web/src/
  app/                 App, providers, rotas (lazy por domínio), layouts, guard do admin
  shared/              components, hooks, lib (http, query-client, socket), utils, types, config
  domains/<tela>/      components/ pages/ hooks/ services/ types.ts index.ts
                       raffles, checkout, my-numbers, auth,
                       admin-dashboard, admin-raffles, admin-orders, admin-buyers, admin-draws, admin-settings
```

Regras do front: `shared` não importa de `domains`; um domínio expõe só o que está no seu `index.ts`; `app` junta tudo.

## Rodar em desenvolvimento

Precisa só do Docker Desktop.

```bash
docker compose up --build
docker compose exec api npm run admin:create   # admin@rifas.local / admin-dev-123456
```

| Serviço | Endereço |
|---|---|
| Site | http://localhost:5173 |
| Painel | http://localhost:5173/admin |
| API | http://localhost:3333/api/health |
| Console do MinIO | http://localhost:9001 (rifas / rifas-secret) |
| Postgres | localhost:5433 (rifas / rifas) |

Código em `api/` e `web/` recarrega sozinho. Ao mudar dependências: `docker compose up --build -V`. Portas mudam com `API_PORT` e `DB_PORT` num `.env` na raiz.

### Banco

```bash
# depois de mudar api/prisma/schema.prisma
docker compose exec api npx prisma migrate dev --name descricao
docker compose exec api npx prisma studio
```

A API aplica as migrations pendentes ao subir.

## Segurança

| Camada | O que está feito |
|---|---|
| Autenticação | Admin com senha argon2id; sessão em JWT dentro de cookie `httpOnly`, `SameSite=Strict`, `Secure` em produção. O JavaScript da página nunca vê o token. |
| Autorização | Toda rota exige login por padrão (`@Public()` libera); `@Roles('ADMIN')` restringe. A sessão é conferida no banco: trocar a senha ou "sair de todos" derruba tokens antigos. |
| Força bruta | Rate limit global (120/min por IP) e 5 tentativas de login por minuto. Login não revela se o e-mail existe. |
| CSRF | Cookie `SameSite=Strict` + checagem de `Origin` em toda requisição que altera dados. |
| Entrada | DTOs com `class-validator`; campos desconhecidos são recusados; body limitado a 100 kB na API e 10 MB na borda. |
| Configuração | Variáveis validadas no boot; produção recusa `JWT_SECRET` curto, gateway `FAKE` e webhook sem token. |
| Webhooks | `safeCompare` para o token e tabela `webhook_events` com chave única (idempotência). |
| Headers | Helmet na API; HSTS, CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy` no Caddy. |
| Containers | Usuário sem root, sistema de arquivos só leitura, `cap_drop: ALL`, `no-new-privileges`, logs com rotação. |
| Rede | Só o Caddy expõe portas (80/443). Banco e MinIO numa rede interna sem saída; console do MinIO não é publicado. |
| Imagens | `img.DOMAIN` só aceita GET/HEAD. |
| Front | Sem segredo em `VITE_*`, sem sourcemap em produção, Nginx bloqueia arquivos ocultos. |

Pendente para a fase 2: backup diário automático (Postgres + MinIO para fora do VPS), rate limit em Redis se houver mais de uma instância da API, deploy sem downtime.

## Produção (VPS)

```bash
cp .env.example .env   # preencher tudo (openssl rand -hex 32 para os segredos)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... api node dist/scripts/create-admin.js
```

Caddy emite HTTPS para `DOMAIN` (site e API em `/api`) e `img.DOMAIN` (imagens). Migrations rodam no serviço `migrate` antes da API.
