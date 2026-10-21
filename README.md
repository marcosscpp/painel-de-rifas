# Painel de Rifas

Plataforma de rifas do Dr. Rodrigo Feitosa. Decisões de stack em [`SETUP.md`](SETUP.md), modelo do escopo em [`docs/MODELO.md`](docs/MODELO.md).

```
api/    NestJS 12 + Prisma 7 (PostgreSQL), Socket.IO
web/    React 19 + Vite + Tailwind v4 (site público e /admin)
infra/  Caddyfile do proxy de produção
```

## Rodar em desenvolvimento

Precisa só do Docker Desktop.

```bash
docker compose up --build
```

| Serviço | Endereço |
|---|---|
| Site | http://localhost:5173 |
| API | http://localhost:3333/api/health |
| Console do MinIO | http://localhost:9001 (rifas / rifas-secret) |
| Postgres | localhost:5433 (rifas / rifas) |

Código em `api/` e `web/` recarrega sozinho. Portas mudam com `API_PORT` e `DB_PORT` num `.env` na raiz.

### Banco

```bash
# depois de mudar api/prisma/schema.prisma
docker compose exec api npx prisma migrate dev --name descricao
docker compose exec api npx prisma studio
```

A API aplica as migrations pendentes ao subir.

### Rodar fora do Docker (opcional)

```bash
docker compose up -d db minio minio-init
cd api && cp .env.example .env && npm install && npm run start:dev
cd web && npm install && API_PROXY_TARGET=http://localhost:3000 npm run dev
```

## Produção (VPS)

```bash
cp .env.example .env   # preencher tudo
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy emite HTTPS para `DOMAIN` (site e API em `/api`) e `img.DOMAIN` (imagens). Migrations rodam no serviço `migrate` antes da API.
