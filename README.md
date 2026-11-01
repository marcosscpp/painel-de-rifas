# WinClub — Painel de Rifas

Frontend React e backend **Java 25 / Spring Boot 4.1.2**, com Spring MVC, Spring Security, Jakarta Validation, JDBC e Flyway.

## Executar com mocks

```bash
docker compose up --build
```

O padrão é o profile Spring `mock`. Apenas frontend e API sobem: não exige PostgreSQL, Asaas, MinIO, ViaCEP ou Caixa. Uma campanha de demonstração é criada automaticamente; os dados são reiniciados com a API.

- Site: http://localhost:5173
- Administração: http://localhost:5173/admin
- API: http://localhost:3333/api
- Health: http://localhost:3333/api/health
- Admin de desenvolvimento: `admin@rifas.local` / `admin-dev-123456`

Sem Docker, com **JDK 25** instalado:

```powershell
cd api
.\mvnw.cmd spring-boot:run
```

Em outro terminal:

```powershell
cd web
npm ci
npm run dev
```

Fora do Docker a API usa a porta 3000 e o Vite já encaminha `/api` para ela. O Maven Wrapper baixa o Maven; não é necessário instalá-lo separadamente. Em Linux/macOS use `sh ./mvnw`.

Para apontar o frontend para outra porta da API no IntelliJ, copie `web/.env.example` para `web/.env.local`, ajuste `API_PROXY_TARGET` (por exemplo, `http://localhost:8080`) e reinicie o Vite. HTTP, uploads, downloads e SSE usam a mesma base `VITE_API_BASE_URL`, cujo padrão é `/api`. No Docker, `API_PROXY_TARGET=http://api:3000` é definido pelo Compose.

## Dois profiles Spring

| Integração | `mock` (padrão) | `real` |
|---|---|---|
| Repository | Memória, cópias isoladas e rollback | PostgreSQL, JDBC e JSONB |
| Pagamentos | Pix simulado, sem valor financeiro | Asaas, cobrança Pix e webhook autenticado |
| Imagens | Memória | S3/MinIO |
| CEP e Federal | Respostas fixas | ViaCEP e Caixa por HTTP |

As interfaces são injetadas nos mesmos services e controllers. `@Profile` seleciona os adapters; não há duplicação das regras de negócio. Ative **um único profile** por processo. Ativar os dois é inválido e impede o boot.

O profile `real` exige as credenciais descritas em [api/.env.example](api/.env.example). O Spring **não carrega arquivos `.env` automaticamente**; exporte as variáveis no terminal. Docker Compose lê o `.env` da raiz.

Exemplo em PowerShell, após configurar as credenciais no ambiente:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'real'
$env:JDBC_DATABASE_URL = 'jdbc:postgresql://localhost:5433/rifas'
$env:POSTGRES_USER = 'rifas'
$env:POSTGRES_PASSWORD = 'sua-senha'
# Em HTTP local; em produção mantenha true.
$env:COOKIE_SECURE = 'false'
cd api
.\mvnw.cmd spring-boot:run
```

Para usar o ambiente Docker com integrações reais, preencha `.env` com `SPRING_PROFILES_ACTIVE=real`, chaves de pagamento, criptografia e storage. Suba primeiro as dependências:

```bash
docker compose --profile real up -d db minio minio-init
# Aguarde o PostgreSQL ficar healthy e minio-init concluir.
docker compose --profile real up --build api web
```

O profile do Compose `--profile real` habilita os containers auxiliares; a variável `SPRING_PROFILES_ACTIVE` seleciona a implementação Java. São configurações distintas.

## MVC e organização

```text
api/
  pom.xml
  mvnw / mvnw.cmd
  src/main/java/br/com/winclub/
    controller/    # Rotas HTTP, sessões, tratamento de erros e SSE
    dto/           # Contratos de entrada e Bean Validation
    model/         # Rifas, compradores, pedidos e pagamentos
    service/       # Regras, apresentação das respostas e relatórios
    repository/    # Interface e implementações mock/PostgreSQL
    integration/   # Interfaces e adapters de pagamento, imagens e dados externos
    security/      # Spring Security, origem, rate limit e AES-256-GCM
    config/        # Dados de demonstração exclusivos do mock
  src/main/resources/
    application.yml
    application-mock.yml
    application-real.yml
    db/migration/  # Flyway
  src/test/java/   # Testes HTTP, concorrência, criptografia e PostgreSQL
  legacy/          # Backend NestJS anterior, fora do build Java
web/               # React; atualizações por EventSource/SSE
```

Os controllers recebem e validam requisições, os services aplicam as regras e os repositories persistem o modelo. Como o frontend React é separado, a view do MVC é a representação JSON da API. Não é usado WebFlux.

Principais rotas preservadas: `/api/raffles`, `/api/orders`, `/api/buyer`, `/api/auth`, `/api/settings/public`, `/api/geo/cep`, `/api/admin/raffles`, `/api/admin/orders`, `/api/admin/buyers`, `/api/admin/dashboard`, `/api/admin/reports`, `/api/admin/settings` e `/api/webhooks/asaas`.

O frontend usa agora SSE em `/api/events?slug=...` ou `?orderId=...`, com reconexão automática e atualização a cada 3 segundos. O protocolo Socket.IO foi removido do frontend ativo.

## Banco e migração do backend anterior

O Flyway cria o schema **`winclub`**, independente das tabelas Prisma existentes. Os agregados tipados são persistidos em `winclub.documents`, com índices e unicidade para slug e chave de idempotência. Cadastros de compradores são cifrados integralmente com AES-256-GCM.

**Dados Prisma existentes não são importados automaticamente.** Esta versão inicia um conjunto de dados separado. Para trocar uma instalação com dados reais, prepare e valide uma importação antes da troca. O código e as migrations antigas estão em `api/legacy`; suas chaves PII antigas não são intercambiáveis com `PII_ENCRYPTION_KEY`.

A implementação atual serializa as transações de escrita com advisory lock no PostgreSQL; o mock usa lock e snapshot para rollback. Isso protege reservas e idempotência, inclusive com múltiplos processos acessando o banco, mas limita a vazão. Consultas e relatórios carregam agregados em memória; a alocação aleatória percorre o universo de números. **A capacidade da versão NestJS para campanhas de milhões de números não foi reproduzida nem certificada.** Para essa escala, especialize os repositories com tabelas de números, consultas paginadas e locks por rifa.

## Pagamentos, segurança e operação

- Reservas são persistidas antes da chamada ao gateway. Uma falha de geração do Pix mantém o pedido até expirar; repita com a mesma chave de idempotência para recuperar a cobrança.
- A integração Asaas consulta `externalReference` antes de criar cliente ou cobrança para recuperar tentativas anteriores.
- O scheduler expira reservas a cada 15 segundos. A consulta pública já mostra expiração pelo relógio.
- Pagamentos repetidos não vendem números novamente. Pagamento tardio disputa os números originais; colisões ou sorteio já publicado geram `refundRequired`.
- Cancelamento administrativo libera a reserva local. Uma cobrança externa que receber pagamento depois passa pelo mesmo tratamento de pagamento tardio; não há estorno financeiro automático.
- O webhook exige `asaas-access-token` igual a `PAYMENT_WEBHOOK_TOKEN`, com comparação constante. Simulação é exclusiva do profile `mock`.
- O administrador é configurado por `ADMIN_EMAIL` e `ADMIN_PASSWORD` no boot; senha com mínimo de 12 caracteres, verificada com BCrypt. Não há mais comando Node de criação de administrador.
- Sessões Spring são armazenadas em memória, com cookie `HttpOnly`, `SameSite=Strict` e `Secure` no profile `real`. Use uma instância para manter sessões e rate limit consistentes; Redis/Spring Session não está incluído.
- Mutações feitas com cookie de sessão exigem um `Origin` permitido. Clientes de API que usam cookies devem enviar esse header também.
- Imagens aceitas: PNG e JPEG, até 8 MB e 40 milhões de pixels. As URLs `thumb` e `full` apontam para o original; não há geração WebP de variantes nesta versão.
- CSV escapa fórmulas e XLSX usa células de texto para conteúdo textual.

Guarde a chave de criptografia fora do servidor também; sua perda impede recuperar os cadastros.

## Logs das chamadas

O frontend registra início, resposta e falhas no console do navegador (F12), com método, rota, status, duração e `requestId`. Logs de conexão/reconexão SSE também aparecem. Os logs ficam ativos por padrão em desenvolvimento; `VITE_API_LOGGING=false` desativa e `VITE_API_LOGGING=true` ativa explicitamente, inclusive no build de produção. Reinicie o Vite após alterar o ambiente.

O backend registra as chamadas no console do IntelliJ, inclusive rejeições de autenticação e origem. O header `X-Request-ID` correlaciona navegador e backend. SSE registra o término quando a conexão encerra; sua duração inclui o tempo conectado. Defina `HTTP_LOG_LEVEL=OFF` para desativar esses logs, ou `WARN` para registrar apenas erros e rejeições.

Corpos, respostas, cookies, tokens e valores de query string não são registrados. Identificadores UUID e segmentos numéricos da rota são mascarados. Downloads diretos são registrados pelo backend.

## Testes

```powershell
cd api
.\mvnw.cmd verify
```

Para incluir os testes reais de persistência, use um **banco PostgreSQL de teste isolado** (o Flyway criará o schema `winclub` e os testes gravarão dados):

```powershell
$env:RIFAS_TEST_JDBC_URL = 'jdbc:postgresql://localhost:5433/rifas_test'
$env:RIFAS_TEST_DB_USER = 'rifas'
$env:RIFAS_TEST_DB_PASSWORD = 'senha-de-teste'
.\mvnw.cmd verify
```

Sem essas variáveis, apenas a suíte PostgreSQL é ignorada. As demais suítes verificam autenticação, validação HTTP, concorrência de reservas, idempotência, expiração, pagamento tardio, sorteio, exports e criptografia.

```powershell
cd web
npm run build
npm run lint
```

## Produção

Preencha o `.env` com domínio, credenciais PostgreSQL/S3, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PII_ENCRYPTION_KEY`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_TOKEN` (mínimo 24 caracteres) e URL de produção do Asaas. Use segredos próprios; não reutilize os exemplos locais.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

O build Java roda os testes; o Flyway executa no boot da API. O Caddy publica HTTPS. PostgreSQL e MinIO não possuem portas públicas no Compose de produção. O build Docker não foi executado no ambiente desta alteração, que não disponibiliza Docker.

Versão Spring Boot conferida na [página oficial do projeto](https://spring.io/projects/spring-boot/) e [requisitos de sistema](https://docs.spring.io/spring-boot/system-requirements.html).
