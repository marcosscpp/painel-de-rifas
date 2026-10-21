# Painel de Rifas — Setup do Projeto

> Rascunho (15/10/2026), atualizado com a análise REA e as primeiras decisões do Marcos.
> Itens marcados como **a definir** ainda não foram decididos. O que está em "observado nas referências" é o que os sites fazem, não decisão nossa.

## 1. Objetivo

Construir o site de rifas de **um único cliente** (projeto freelance, não é SaaS/white-label).

- Quem administra o painel: o cliente. **Decidido (20/10):** só dois papéis, `ADMIN` (painel) e `BUYER` (comprador), sem níveis intermediários.
- Enquadramento legal (título de capitalização, Loteria Federal etc.): **a definir pelo cliente**

## 2. Referências

Análise completa: [`referencias/analise-rea.md`](referencias/analise-rea.md)

| Site | O que é | Por que olhar |
|------|---------|---------------|
| https://www.danebook.me/ | Plataforma white-label **Incrível Sorteios** (Next.js Pages Router + Bootstrap, admin PHP em `dashboard.<dominio>`) | Abrangência de funcionalidades |
| https://www.wesleyalemao.com.br/ | Mesma plataforma do Dan eBook, só muda tema/config | Idem; opera como título de capitalização (SUSEP) |
| https://www.acaojusta.com.br/ | Stack própria: Next.js App Router + Tailwind + API separada, Pix (provável Mercado Pago) | Referência mais limpa de UI e código, mobile-first |

### Observado nas referências
- **Venda por quantidade, não grade**: nenhum dos três deixa escolher o número. O cliente escolhe quantas cotas (pacotes + slider) e recebe números aleatórios.
- **Pix com reserva temporária** (Incrível Sorteios usa 5 min), confirmação por webhook libera os números.
- **Login sem senha** por telefone (Ação Justa) ou consulta por CPF/telefone com anti-bot Turnstile.
- **"Meus títulos"** e lista de compras para o cliente.
- **Barra de progresso / contador** pagos, reservados e livres.
- **Títulos premiados** (prêmio instantâneo), carrossel de ganhadores, ranking de compradores.
- **Marketing**: pixels Meta/TikTok/Kwai/GA4, evento Purchase server-side, grupo de WhatsApp pós-compra, upsell "Aumente suas chances", afiliados.
- **Extras** na Ação Justa: roleta e raspadinha.
- Admin fica fora do site público (subdomínio).

## 3. Ambiente de desenvolvimento

| Item | Versão / Info |
|------|---------------|
| Sistema | Windows |
| Node.js | v24.20.0 |
| npm | 11.19.0 |
| Pasta do projeto | `C:\Users\Administrador\Desktop\Freelance\painel-de-rifas` |

## 4. Ferramentas

- **Claude Code** e **Claude Desktop**
- **REA (rea-agents)** via MCP, usado na análise dos sites de referência

## 5. Stack

Decidido:

| Camada | Escolha |
|--------|---------|
| Frontend | React + Tailwind com **Vite** (SPA) |
| Backend / API | NestJS |
| Banco | PostgreSQL + **Prisma** (ORM e migrations) |
| Pagamento | Pix (gateway **a definir**) |
| Tempo real | WebSocket onde fizer sentido |
| Infra | Docker; VPS com Docker Compose agora, AWS separada depois |
| Arquivos/imagens | MinIO (S3 compatível) no VPS; imagem `pgsty/minio` (o MinIO parou de publicar no Docker Hub) |
| Versões (21/10) | NestJS 12, Prisma 7.10 (generator `prisma-client` + `@prisma/adapter-pg`), React 19, Vite 8, Tailwind 4, Postgres 17 |

Ainda **a definir**: gateway Pix, autenticação do comprador, repositório. Os trade-offs estão na seção 9.

## 6. Funcionalidades

### Lado do comprador
- **Dois modos de venda, escolhidos por campanha**:
  - **Por quantidade**: cliente escolhe quantas cotas, números aleatórios.
  - **Por grade**: cliente escolhe os números numa grade.
- Demais itens: **a definir**

### Lado do administrador (painel) — obrigatório e completo
Decidido: **painel de administrador completo**, onde o cliente cadastra e gerencia tudo sem depender de dev.

Proposta de módulos (baseada nas referências, validar o que entra no MVP):
- **Campanhas**: criar/editar, modo de venda, preço, total de números, pacotes e destaque, máximo por compra, datas (início, fim, sorteio), galeria, regulamento, status.
- **Prêmios**: prêmio principal, títulos premiados (prêmio instantâneo).
- **Pedidos e pagamentos**: lista com filtros, status do Pix, reservas ativas/expiradas, reembolso.
- **Clientes**: busca por telefone/CPF, compras e números de cada um.
- **Sorteio e ganhadores**: registrar resultado (Loteria Federal ou sorteio interno), publicar ganhador.
- **Conteúdo do site**: banners, ganhadores na home, comunicados, FAQ, termos e políticas, links de WhatsApp/Instagram.
- **Marketing**: IDs de pixels (Meta, TikTok, Kwai, GA4), link do grupo de WhatsApp pós-compra.
- **Dashboard**: vendas por campanha, arrecadação, progresso.
- **Usuários do painel**: login com senha; só o papel admin (decidido 20/10).
- **Configurações**: dados do gateway Pix, tempo de reserva, idade mínima, logo e cores.

### Escopo do lançamento (MVP)
- **a definir**

### Entidades prováveis (da análise)
Campanha (com `modo_venda`), pedido/reserva, números, cliente, prêmios/títulos premiados, ganhadores.

## 7. Pontos de atenção

- **Enquadramento legal**: Wesley Alemão opera como título de capitalização (SUSEP, via Filantropia Premiável); Ação Justa sorteia pela Loteria Federal. O cliente ainda não definiu, e isso pode afetar o gateway Pix aceito e o texto do regulamento.
- Idade mínima exibida (16+ ou 18+): **a definir**

## 8. Próximos passos

1. Fechar os pontos em aberto da seção 9 (recomendações marcadas)
2. Definir o escopo do MVP
3. Cliente definir o enquadramento legal
4. ~~Criar a estrutura inicial (monorepo `web` + `api`)~~ feito em 21/10 (ver README.md e docs/MODELO.md). Repositório remoto ainda **a definir**.

## 9. Trade-offs (para decidir)

### 9.1 Como servir o React: Vite SPA ou Next.js
| | Vite SPA | Next.js (ainda é React) |
|---|---|---|
| Simplicidade com Nest | Maior: front só estático, toda lógica no Nest | Dois servidores Node (Next + Nest) |
| Prévia de link no WhatsApp/Instagram | Ruim: as tags OG não existem no HTML inicial | Boa: página da campanha renderizada no servidor |
| SEO | Fraco | Bom |
| Hospedagem | Qualquer CDN | Vercel ou servidor Node |

As rifas vendem muito por link compartilhado no WhatsApp, então a prévia com foto e preço importa.
**Decidido (15/10): Vite SPA.** Para a prévia de link: o Nest (ou o servidor que entrega o front) responde `/campanha/:slug` injetando as tags OG (título, foto, preço) no `index.html` antes de entregar a SPA. Assim o WhatsApp vê a prévia e o usuário recebe o app normal.

### 9.2 NestJS separado
- **Prós:** estrutura clara (módulos, DI), gateway WebSocket nativo, filas e cron (expirar reservas), webhooks do Pix num lugar só, fácil de testar.
- **Contras:** mais boilerplate e um deploy a mais que um app Next sozinho; precisa de servidor sempre ligado (WebSocket não roda em serverless).
- Para um cliente só, o custo é pequeno e a organização compensa.

### 9.3 Postgres e os dois modos de venda
- O ponto crítico é **não vender o mesmo número duas vezes** com muita gente comprando ao mesmo tempo.
- **Grade:** uma linha por número, reserva com `SELECT ... FOR UPDATE SKIP LOCKED` ou constraint única. Simples e seguro, mas a grade só é usável na tela até uns 10 mil números.
- **Quantidade:** escala para centenas de milhares ou milhões de números. Pré-gerar uma linha por número (1M de linhas por campanha é tranquilo pro Postgres) e sortear livres com `SKIP LOCKED`, ou gravar só os vendidos (economiza espaço, sorteio de livres fica mais complexo perto do esgotamento).
- **Recomendação:** pré-gerar os números em ambos os modos, mesma tabela, mesma lógica de reserva. Os dois modos viram só telas diferentes.
- **Custo de ter os dois modos:** mais telas e testes. Dá pra lançar com um e ligar o outro depois sem mudar o banco.
- **ORM:** Prisma tem melhor DX mas exige SQL cru para `SKIP LOCKED`; Drizzle ou Kysely ficam mais perto do SQL. **Decidido (15/10): Prisma**, com `$queryRaw` só na reserva de números (`SKIP LOCKED`).

### 9.4 Gateway Pix
| Gateway | Prós | Contras |
|---|---|---|
| Mercado Pago | Integração fácil, SDK bom, provável uso da Ação Justa | Taxa maior; regras restritivas para sorteios |
| Efí (ex-Gerencianet) | Pix nativo, taxas baixas, webhook confiável | Exige certificado e setup mais trabalhoso |
| Asaas | Simples, bom para PJ pequena | Menos controle fino |

**Atenção:** vários gateways restringem rifas/sorteios nos termos de uso. O enquadramento legal do cliente decide qual aceita a conta. **Confirmar com o gateway antes de integrar.**
Na arquitetura: isolar o gateway atrás de uma interface no Nest (`PaymentProvider`) para trocar sem mexer no resto.

### 9.5 Tempo real: WebSocket, SSE ou polling
Onde o tempo real aparece:
1. **Tela do Pix**: avisar "pagamento confirmado" assim que o webhook chega.
2. **Grade**: número reservado por outra pessoa some na hora.
3. **Barra de progresso / contador** da campanha.

| | Polling | SSE | WebSocket (Socket.IO no Nest) |
|---|---|---|---|
| Complexidade | Mínima | Baixa (HTTP comum) | Média |
| Direção | Cliente pergunta | Servidor → cliente | Dois sentidos |
| Escala com várias instâncias | Trivial | Precisa Redis pub/sub | Precisa Redis adapter + sticky session |
| Carga no servidor | Alta com muita gente | Baixa | Baixa |

- Para (1) e (3), polling a cada 3 a 5 s ou SSE resolvem bem.
- Para (2), WebSocket faz diferença real.
- **Recomendação:** Socket.IO via gateway do Nest com salas por campanha e por pedido. Começar com uma instância só; quando escalar, plugar Redis. Socket.IO já cai para polling sozinho quando a conexão falha.

### 9.6 Hospedagem e deploy

**Decidido (15/10): Docker desde o início.** Fase 1 num VPS, fase 2 na AWS com cada parte separada quando o volume pedir.

**Fase 1: VPS com Docker Compose**
- Containers: `web` (build do Vite servido por Nginx), `api` (Nest), `db` (Postgres), `minio` (imagens), `proxy` (Nginx ou Caddy com HTTPS automático).
- Nginx/Caddy faz o proxy do WebSocket (`/socket.io`) e das rotas de prévia OG para o Nest.
- Postgres com volume persistente e **backup diário automático para fora do VPS** (ex.: `pg_dump` para S3 ou Backblaze). Esse é o maior risco da fase 1.
- Redis só entra se/quando houver mais de uma instância da API.

**Fase 2: AWS separada**
| Parte | Serviço provável |
|---|---|
| Front (estático) | S3 + CloudFront |
| API Nest | ECS Fargate (mesma imagem Docker) atrás de ALB (suporta WebSocket) |
| Banco | RDS PostgreSQL |
| Tempo real com várias instâncias | ElastiCache Redis (adapter do Socket.IO) |
| Arquivos/imagens | S3 |

**O que fazer já na fase 1 pra migração ser só troca de infra:**
- Toda configuração por variável de ambiente (12-factor), nada fixo em código.
- Imagens e uploads no MinIO via SDK do S3 desde o começo, nunca no disco do container.
- API sem estado em memória (sessões e reservas no banco).
- Migrations versionadas pelo ORM, rodando no deploy.
- Imagens Docker publicadas num registry (GitHub Container Registry ou ECR).

**Trade-off:** VPS é barato e simples, mas é ponto único de falha e você cuida de backup, atualização e segurança. AWS separada escala e é gerenciada, mas custa bem mais e tem mais peças.

### 9.7 Imagens e arquivos

**Decidido (15/10): MinIO no VPS.**
- Container `minio` no Compose, dados num volume do VPS.
- Upload: admin envia, o Nest gera versões redimensionadas (`sharp`, WebP) e grava no bucket `campanhas`.
- Exibição: o proxy expõe o bucket em `img.<dominio>` com cache.
- Banco guarda só a chave (ex.: `campanhas/123/capa-600.webp`).
- **Backup diário obrigatório** do bucket para fora do VPS (`mc mirror`), junto com o do Postgres.
- Migração: `mc mirror` para S3/R2 e troca de `S3_ENDPOINT`; código não muda.
- Trade-off aceito: custo zero, mas imagens usam disco e banda do VPS. Se o tráfego de imagens pesar, mover para Cloudflare R2 (sem taxa de saída) é só troca de variável.

