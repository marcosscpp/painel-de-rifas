# Checkout do Wesley Alemão: o que dá para aproveitar

Análise de 21/10/2026 da campanha `edicao-10-500-mil-reais-93684` (plataforma white-label Incrível Sorteios, a mesma do Dan eBook). Foi lido o código público do site (página, modal de checkout e tela da compra). **Nenhuma compra ou cadastro foi enviado.**

## Como funciona o fluxo deles

1. **Página da campanha.** Pacotes `+100 +300 +400 +500 +600 +1000` com o "Popular" em destaque, botões `+`/`−` e total ao vivo. Preço R$ 0,29, máximo de 10.000 cotas por compra e 10 minutos para pagar (`tempoPagamento`). Contador de pagos, reservados e livres vem pronto na página.
2. **Modal "Checkout"** (abre por cima da página, não troca de tela):
   - **Comprador já identificado:** mostra "Comprando como Fulano · Trocar" e compra em um clique.
   - **Comprador novo:** nome completo (com "nome social" opcional), e-mail, celular **e confirmação do celular**, data de nascimento, CPF, endereço opcional (com busca de CEP) e aceite dos termos.
   - **"Já possuo uma conta":** pede só o telefone (`POST /cadastrar/consulta { ddi, username }`) e identifica sem senha (`semSenha: true`).
   - Dentro do checkout ainda aparecem upsell ("Aumente suas chances 🚀") e a promoção "Chance em dobro".
3. **Envio.** Validações na tela: nome com pelo menos 2 palavras, celular de 10 ou 11 dígitos, os dois celulares iguais, pelo menos 1 número e termos aceitos. Depois, uma única chamada cadastra e compra:
   ```
   POST /sorteios/comprar/{id}
   { tokenSorteio, quantidade, numeros[], grupos, upsell,
     userToken | (nome, telefone, ddi, cpf, email, dataNascimento),
     afiliado, linkAfiliado, linkPromocional,
     utms, url_params, fbc, fbp }
   ```
   - Erro 400 com `cotas_duplicadas`: números que outra pessoa pegou saem do carrinho e a pessoa escolhe de novo.
   - Sucesso: `{ result: 1, compra: { token, user } }` e redireciona para `/compra/{token}`.
4. **Tela da compra** (`/compra/{token}`):
   - QR Code e copia e cola (`GET /compra/pix/{token}`), com instruções passo a passo.
   - Confirmação por **consulta periódica** (`/compra/check-status/`), sem tempo real.
   - Pagamento com saldo da carteira, upsell "Garanta mais números" e link "Problemas com sua compra?".
5. **Marketing:** salvam UTMs, `fbc`/`fbp` (pixel da Meta) e afiliado em cada compra, e disparam `CompleteRegistration` e `Purchase` para os pixels.

## Comparação com o nosso

| Item | Wesley | Nós hoje |
|---|---|---|
| Pacotes, popular, + / − | Sim | Sim |
| Escolher números na grade | Sim (carrinho) | Sim, com grade ao vivo |
| Número pego por outra pessoa | Remove do carrinho (`cotas_duplicadas`) | Igual, e ainda tira da seleção antes do envio |
| Pedido duplicado (clique duplo) | Não vimos proteção no front | Chave de idempotência |
| Identificação | Telefone sem senha, sessão lembrada | Telefone sem senha, **sem sessão** |
| Confirmar celular | Sim | **Não** |
| Nome completo validado | Mínimo 2 palavras | **Só 3 letras** |
| E-mail | Sim | **Não** |
| Data de nascimento | Sim | **Não** (só checkbox 18+) |
| CPF | Sim | Opcional (obrigatório com o Asaas) |
| Endereço | Opcional | Não |
| Confirmação do Pix | Consulta periódica | Tempo real + consulta de reserva |
| Upsell no checkout e pós-compra | Sim | Não |
| UTMs, pixel e afiliado na compra | Sim | Não (afiliados fora do escopo) |

## O que recomendo trazer

**Agora, junto da etapa 4 (comprador e Meus números):**
1. **Confirmar o celular.** O telefone é a "conta" da pessoa, e um dígito errado faz ela perder acesso aos números. Custa pouco.
2. **Nome completo** com pelo menos nome e sobrenome.
3. **Comprador lembrado:** depois da primeira compra, o site guarda uma sessão (cookie seguro) e mostra "Comprando como Maria · Trocar". Mais "Já comprei antes" pedindo só o telefone. Aumenta a conversão de quem volta na live.
4. **Data de nascimento obrigatória** para barrar menores de 18 de verdade, no lugar só do checkbox. **E-mail opcional**, para enviar o comprovante.

**Depois (fase 2 ou sob demanda):**
- Gravar UTMs e `fbc`/`fbp` no pedido, já preparando pixel e API de conversões da Meta.
- Upsell ("leve +50 por R$ X") no checkout e na tela de pagamento confirmado.
- Endereço: pedir só ao ganhador, não na compra.

**Não trazer:** nome social, carteira/saldo/saque e compra via WhatsApp. São específicos da plataforma deles e estão fora do nosso escopo.
