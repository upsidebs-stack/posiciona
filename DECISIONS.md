# Decisões e suposições

Registro vivo. O agente implementador **anota aqui** toda vez que seguir um default sem confirmação, e toda vez que a realidade contradisser o plano.

Formato: uma linha por decisão, com data e quem decidiu.

---

## Decididas (defaults do plano, não confirmadas pelo dono)

| # | Decisão | Escolha | Por quê | Reversível? |
|---|---|---|---|---|
| 1 | Provedor de pagamento | Paddle (Merchant of Record) | Resolve sales tax americano, cobra cartão em USD e paga a PJ brasileira como fornecedor — exportação de serviço. Atrás de `BillingProvider` | Sim, é um arquivo |
| 2 | Hospedagem | Netlify Starter | O Hobby da Vercel **proíbe uso comercial**. Netlify permite SaaS pago na cota livre | Sim |
| 3 | Banco | Neon Free | **Confirmado pelo dono em 2026-08-31.** Autosuspend, 0,5 GB, sem pausa agressiva. Supabase Free é equivalente | Sim |
| 4 | Preço | $49/mês · $470/ano | Faixa que um local business paga sem aprovação de ninguém. Abaixo do BrightLocal, muito abaixo do Birdeye | Sim |
| 5 | Trial | 7 dias com cartão | Filtra curioso sem barrar quem quer testar | Sim |
| 6 | Modelo Claude | `claude-opus-5` em todos os steps | Qualidade do score é o produto. Descer para `sonnet-5` corta ~60% do custo e é decisão de negócio com medição junto | Sim, via env |
| 7 | Redes nacionais | Entram marcadas `is_chain`, com peso reduzido | Aspen Dental e Roto-Rooter dominariam o mapa e enterrariam o concorrente real | Sim |
| 8 | Yelp, Reddit, provedor pago de review | Fora do MVP | Gatilhos na seção 11.4 do PLANO.md | Sim, entram atrás da mesma interface |
| 9 | Limite de negócios no Pro | 3 | — | Sim |
| 10 | Nome do produto | "Posiciona" é **codinome** | Validar marca no USPTO e domínio `.com` antes de qualquer branding | — |

## Em aberto — precisam do dono, não do código

| # | Pergunta | Para quem | Bloqueia |
|---|---|---|---|
| A | Payout do Paddle para conta PJ no Brasil: moeda, cadência, e que documento eles emitem | Suporte do Paddle | Fase 2 |
| B | Enquadramento fiscal da exportação de serviços — Simples ou Lucro Presumido; isenção de ISS e PIS/COFINS; contrato de câmbio; DCBE se aplicável | Contador | Lançamento |
| C | Programa de afiliados: entra? Se sim, Rewardful ou FirstPromoter, desacoplado do MoR | Dono | Pós-MVP |
| D | Nome e domínio | Dono | Lançamento |

## A verificar antes de codar

| # | Verificação | Por que importa | Quando |
|---|---|---|---|
| V1 | **A busca da Places API (New) aceita `rating`, `userRatingCount`, `priceLevel`, `types`, `websiteUri` e `regularOpeningHours` no `X-Goog-FieldMask`?** E em qual SKU caem? | É a premissa central de custo do MVP. Se não aceitar, o fallback é Place Details só nos top-12 | ✅ **Feito 2026-08-31.** Aceita todos. Mas `rating`, `userRatingCount`, `priceLevel`, `websiteUri`, `regularOpeningHours` são SKU **Enterprise**, não Pro como a seção 4.2 assumia — ver log de execução |
| V2 | Franquia mensal vigente por SKU do Google (o crédito de $200 acabou em março/2025) | Define quantos diagnósticos cabem no free tier | ✅ **Feito 2026-08-31.** ~10.000 Essentials, ~5.000 Pro, ~1.000 Enterprise/mês — os números do plano batem |
| V3 | Preço vigente por SKU do Places e do Claude | Preencher as constantes do guardrail de custo | Antes do deploy |

---

## Log de execução

> O agente escreve aqui. Uma linha por evento: data, o que aconteceu, o que mudou no plano.

- **2026-08-31** — Organizei os arquivos soltos na raiz: `rubric.md`, `attributes.ts`, `gaps.ts` → `seed/src/domain/`; `env.example` → `seed/.env.example`.
- **2026-08-31** — **Verificação V1 concluída, com uma correção ao plano.** A busca (`places:searchText`) da Places API (New) **aceita, sim**, `rating`, `userRatingCount`, `priceLevel`, `types`, `websiteUri` e `regularOpeningHours` no `X-Goog-FieldMask` — confirmado contra a documentação oficial (`text-search`, `usage-and-billing`) e um post de terceiros datado de 2026 com a mesma tabela de preço. **A técnica central do plano (uma busca enriquecida em vez de N `Place Details`) está confirmada e não precisa do fallback da seção 6.1.**
  - **Correção:** a tabela da seção 4.2 do `PLANO.md` classifica a "Text Search com FieldMask enriquecido" inteira como SKU **Pro** (franquia ~5.000/mês). Isso está errado para os campos que o produto realmente pede. Google cobra pelo **SKU mais alto tocado pela FieldMask** ("billed at the highest SKU applicable to your request"). `displayName`, `formattedAddress`, `location`, `types`, `primaryType` são Pro; mas `rating`, `userRatingCount`, `priceLevel`, `websiteUri`, `regularOpeningHours` são **Enterprise**. Como o FieldMask do MVP pede os dois grupos juntos numa única chamada, **a chamada inteira é cobrada como Enterprise** ($35/1.000, franquia ~1.000/mês), não como Pro ($32/1.000, franquia ~5.000/mês).
  - **Impacto prático:** o custo por chamada quase não muda (~$0,032 → ~$0,035, a estimativa de $0,04–$0,16 por diagnóstico na seção 7.5 continua válida). O que muda é a **franquia gratuita mensal disponível para a busca**: ~1.000 chamadas Enterprise/mês, não ~5.000 Pro/mês. Como cada diagnóstico consome 1 chamada (`STOREFRONT`) a 5–9 (`SERVICE_AREA`, grade hexagonal), a franquia grátis para a busca já nasce no mesmo teto apertado que a seção 4.2 atribuía só ao Place Details do próprio negócio — não em cima dele. Isso não muda a arquitetura nem exige o fallback; é só uma correção de contabilidade que o `guardrail de custo` (seção 18) e o `MAX_MONTHLY_FREE_ANALYSES` devem refletir.
  - **V2 (franquia por SKU):** os números do plano batem com a documentação atual — ~10.000 Essentials, ~5.000 Pro, ~1.000 Enterprise por mês. Não houve mudança desde que o `PLANO.md` foi escrito.
  - Fontes: `developers.google.com/maps/documentation/places/web-service/text-search`, `developers.google.com/maps/documentation/places/web-service/usage-and-billing`, `developers.google.com/maps/billing-and-pricing/pricing`. Os valores em dólar vieram de busca na web (inclui um resumo de terceiros de 2026) — confirme no Google Cloud Console antes do deploy, como o próprio `PLANO.md` já pedia na seção 7.5.
- **2026-08-31** — Perguntei as três coisas do início da Fase 0. Dono respondeu: banco = **Neon**; chave do Google Places = **ainda não criada** (ok, só entra na Fase 1); conta sandbox do Paddle = **ainda não criada** (ok, só entra na Fase 2). Prosseguindo com a Fase 0.
