# Análise REA dos sites de referência

Data: 15/10/2026. Ferramenta: REA (`capture_browser_scenario`), Chrome local, viewport mobile 390x844, pt-BR.
Escopo: só páginas públicas (home e uma campanha ativa de cada site). Nada autenticado foi acessado, nenhuma compra iniciada, nenhum formulário enviado.
Requisições para `kaspersky-labs.com` que aparecem nas capturas vêm do antivírus desta máquina, não dos sites.

## Resumo em uma linha

Dan eBook e Wesley Alemão rodam **a mesma plataforma white-label (Incrível Sorteios)**: mesmo bundle Next.js, mesmos hashes de chunk, só muda tema e config. Ação Justa é uma **stack própria e mais moderna** (Next.js App Router + Tailwind + API separada), mais enxuta e focada em conversão via Pix.

Nenhum dos três usa grade de "escolha seu número": todos vendem **por quantidade** (números sorteados automaticamente para o cliente).

---

## 1. Dan eBook (danebook.me) e Wesley Alemão (wesleyalemao.com.br)

### Stack detectada
| Item | Evidência |
|---|---|
| Next.js **Pages Router** (webpack, SSG + `getStaticProps`) | `/_next/static/chunks/pages/...`, `/_next/data/<buildId>/pt-BR/*.json`, `__N_SSG: true` |
| Hospedagem Vercel | headers `x-vercel-cache`, `x-vercel-id`, `x-matched-path` |
| Bootstrap 5.3.3 + Bootstrap Icons 1.13.1 (jsDelivr) | requisições de CSS/JS |
| Fonte Montserrat (Google Fonts) | requisições de fonte |
| Imagens em S3 `incs-bucket` + redimensionador `s3.incrivelsorteios.com/redimensiona?key=600x600/...` | requisições de imagem |
| CSS/JS/manifest por cliente no S3 (`incs-bucket.s3.amazonaws.com/cdn/<hash>.style.css` / `.script.js`) | é assim que cada cliente ganha tema próprio sobre o mesmo build |
| Backend separado com axios (`get("/ver-numeros?...")`, `get("/sorteios/ultimos-ganhadores")`, `post("/user/auth/logout")`, `post("/contato/send")`) | strings no bundle; base URL não aparece no código carregado |
| Painel admin em subdomínio `dashboard.<dominio>` (`urlNumeros: https://dashboard.wesleyalemao.com.br/n.php?token=...`) | campo do JSON da campanha; indica admin em PHP |
| Cloudflare Turnstile (anti-bot) na consulta de "Meus títulos" | `challenges.cloudflare.com/turnstile/v0/api.js`, mensagens "Confirme o Turnstile antes de pesquisar." |
| Tracking: GA4 (2 IDs), Meta Pixel, TikTok Pixel, Kwai Pixel | fbevents.js, gtag, strings no bundle |
| PWA (manifest + service worker + página `/aplicativo` "Instale o nosso APP") | manifest.json, banner na home |

### Rotas públicas e da área do cliente (do `_buildManifest.js`)
- Vitrine: `/`, `/campanhas`, `/campanha/[url]` e `/sorteio/[url]` (mesma página, nome varia por cliente), `/sorteios`, `/ganhadores`, `/comunicados`, `/artigos`, `/contato`, `/termos-de-uso`, `/politica-privacidade`, `/politica-de-cookies`
- Compra: `/carrinho/[token]`, `/compra/[token]`, `/pagamento/[token]`, `/pagamento-premio/[token]`, `/solicitar-saque-premio-instantaneo/[token]`
- Cliente: `/meus-numeros` (consulta por CPF/telefone, com Turnstile), `/cadastrar`, `/recuperar-senha`, `/user/compras`, `/user/carteira`, `/user/saldo`, `/user/saque`, `/user/atualizar-cadastro`, `/user/alterar-senha`, `/minhas-caixas`, `/creditos`
- Afiliados: `/afiliado`, `/af/[url]/...`, `/ref/[url]`, `/lf/[refLink]/[urlLinkAfilido]`, `/user/afiliado/meus-links`, `/lojista/[url]`

### Modelo de dados da campanha (JSON público do SSG, só as chaves relevantes)
```
sorteio:
  id, token, title, descricao, texto (HTML do regulamento), img, galeria[]
  codigo_susep / codigo_operacao        # título de capitalização (Wesley); Dan eBook não mostra
  valor: 0.08                           # preço por número
  quantidades: [100,300,400,500,600,700]  # botões de pacote
  btq: "100:0|300:1|400:0|..."           # pacote:destaque  (1 = "mais popular")
  mais_popular: 300
  maximo_cotas: 1000                     # limite por compra
  tempoPagamento: 5                      # minutos para pagar o Pix antes de liberar a reserva
  numeros_aleatorios, exibirCotas, progressbar, vendas_express
  dti / dte / dts                        # início, encerramento das vendas, data do sorteio
  data_sorteio { formatado, timestamp }
  status { id, title, mensagem: "Corre que está acabando!", acabou, concluido }
  premios[] { premio, credito }, ganhadores[]
  grupoWhatsapp, grupoWhatsappBox        # pós-compra "agora você é VIP"
  upsc { titulo: "Aumente suas chances 🚀" }, promocoesTexto, promoDobro, upsell  # upsell na compra
  tarifa, calc_tarifa                    # taxa de serviço opcional
sorteioNumerosIniciais.dados { pagos, reservados, livres }   # contador de cotas
premiacoesExtrasIniciais                 # "títulos premiados" (prêmio instantâneo)
topGanhadoresTitulos, topCompradores     # rankings
```
Config do site (`pageProps.app`) mostra o quanto a plataforma é configurável: login sem senha (`semSenha`), campo de consulta (`campo_consulta: cpf`), checkout via WhatsApp (`viaWhatsapp`), carteira/saldo/saque, afiliados com comissão, modo manutenção, pixels por cliente, cor do tema, logos.

### Padrões de UI
- Home: banner da campanha principal, CTA "Garantir meus números · Compra segura e rápida", carrossel "🎉 Ganhadores · Pessoas reais, prêmios reais" (nome, número, estado, data), lista de campanhas com selo "Concluído".
- Campanha: galeria com setas, preço unitário em destaque ("Por apenas R$ 0,10"), seletor de quantidade (input + botões +01/+02/+05/+10/+25/+50 com selo "Popular"), botão com total, botão "Meus números".
- Bloco "Títulos premiados": lista de números com prêmio instantâneo e status "Ainda não saiu" ou nome do ganhador; contador Total/Disponíveis/Sorteados.
- Modal de idade (16+ no Wesley), aviso de cookies, botão flutuante "Dúvidas? Fale com nossa equipe", banner de instalar o app.
- Wesley exibe rodapé legal de título de capitalização (Filantropia Premiável, capitalizadora e processo SUSEP), modelo usado para operar de forma regulamentada.

---

## 2. Ação Justa (acaojusta.com.br)

### Stack detectada
| Item | Evidência |
|---|---|
| Next.js **App Router** com Turbopack e React Server Components | `/_next/static/immutable/chunks/turbopack-*.js`, requisições `?_rsc=` |
| Tailwind CSS (classes utilitárias, tokens `bg-card`, `border-line`, `text-muted`, `bg-brand`) + tema claro/escuro | classes no bundle, botão "Alternar tema" |
| Hospedagem Vercel | headers `x-vercel-*`, `x-nextjs-deployment-id` |
| API própria em `api.acaojusta.com.br` (imagens `api.acaojusta.com.br/img/campaign/<hash>.jpg?w=800&h=600`) | meta og:image |
| BFF em rotas Next: `/api/checkout`, `/api/auth/lookup` (por telefone), `/api/auth/me`, `/api/auth/logout`, `/api/purchases?page=&campaign_id=`, `/api/tracking/config`, `/api/tracking/event` | strings no bundle |
| Gateway Pix com cara de **Mercado Pago** (inferido) | status `approved`, `in_process`, `in_mediation` ("Cliente iniciou uma disputa"), `rejected`, `refunded`, campo `transaction_amount` |
| Tracking server-side (Meta CAPI-like): eventos `InitiateCheckout`, `AddToCart`, `Purchase`, `pixCopied` com atribuição `fbc` | funções `trackPixCopied`, `buildEventParams`, `eligiblePixels` |
| Gamificação: **roleta** (`roulette-module`, itens "prêmio" / "tente de novo") e **raspadinha** em canvas (`/games/star.webp`, `/games/brush.png`) | módulos no bundle |
| Sorteio pela Loteria Federal, 18+ | texto "Como funciona" |

### Rotas vistas
`/`, `/campaign/[slug]_[id]`, `/transaction/[id]/[campaign-url]` (tela do Pix / comprovante), "Meus títulos" abre modal com login por telefone.

### Padrões de UI (vale copiar)
- Página de campanha muito curta e mobile-first: card com foto (1/5), selo "Corre que está acabando!", título, **barra de progresso "76% vendido"**.
- Seletor de quantidade grande: botões − / +, número central, "R$ 67,77 cada · 1 chance", **slider** de 1 até o máximo, CTA amarelo cheio "Pagar com Pix R$ 67,77", microcopy "✓ Pix · liberação imediata".
- "Como funciona" em 3 passos, regulamento recolhido em acordeão, links WhatsApp e Instagram.
- Login sem senha: só telefone (`/api/auth/lookup`), cookie de sessão.
- Lista "Minhas compras" com status traduzidos e contagem de títulos; link para a transação.

---

## O que isso sugere para o nosso produto

1. **Fluxo de compra por quantidade, não grade**: escolher quantidade (pacotes + slider), identificar por telefone/CPF sem senha, gerar Pix (QR + copia e cola) com reserva temporária de ~5 a 15 min, webhook confirma e libera números aleatórios. Grade de números escolhidos pode ser um modo opcional para rifas pequenas (ex.: 999 números).
2. **Entidades mínimas**: campanha (preço, total de cotas, pacotes, destaque, máximo por compra, datas início/fim/sorteio, status, galeria, regulamento), pedido/reserva (token, quantidade, valor, status do pagamento, expiração), números (campanha, número, pedido, status livre/reservado/pago), cliente (telefone, CPF opcional, nome), prêmios e títulos premiados (prêmio instantâneo), ganhadores.
3. **Contador público** pagos/reservados/livres e barra de progresso aumentam conversão; os dois modelos expõem isso.
4. **Área do cliente** = "Meus títulos" por telefone/CPF com anti-bot (Turnstile) e lista de compras.
5. **Admin**: as referências deixam o admin fora do site público (subdomínio `dashboard.`); precisa cobrir CRUD de campanha, pedidos, conferência de pagamentos, sorteio/registro de ganhador (Loteria Federal ou sorteio interno), títulos premiados.
6. **Marketing**: pixels Meta/TikTok/Kwai/GA4 configuráveis por campanha, evento `Purchase` server-side, grupo/canal de WhatsApp pós-compra, upsell "Aumente suas chances", ranking de compradores, afiliados.
7. **Stack**: Ação Justa (Next App Router + Tailwind + API separada) é a referência mais limpa para seguir; a plataforma Incrível Sorteios é a referência de abrangência de funcionalidades.
8. **Legal**: Wesley opera como título de capitalização (Filantropia Premiável, SUSEP) e Ação Justa cita Loteria Federal; vale confirmar com o cliente o enquadramento antes de construir.

## Limites desta análise
- Só o que carrega sem login: não vimos a tela de Pix, o checkout nem o admin por dentro.
- A base URL da API da plataforma Incrível Sorteios não aparece nos chunks carregados.
- Mercado Pago como gateway da Ação Justa é inferência pelos nomes de status, não confirmado.
