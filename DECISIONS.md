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
- **2026-09-01** — Comecei a Fase 0 (Fundação). Registrando os pontos onde a realidade contradisse o plano ou o plano ficou em silêncio:
  - **Next.js 16, não 15.** O `create-next-app` atual instala Next 16.3.4 (a versão 15 não é mais o padrão). O App Router e os route handlers usados no plano não mudam de forma relevante entre as duas versões, e ficar numa major antiga de propósito significaria abrir mão de correções sem um motivo concreto. Segui com 16. Se isso causar atrito com Netlify, Auth.js ou Inngest mais adiante, volto aqui.
  - **Duas colunas a mais em `users`:** `emailVerified` (timestamp) e `image` (text), nenhuma das duas na seção 5 do `PLANO.md`. O `@auth/drizzle-adapter` (a lib oficial que conecta Auth.js ao Drizzle) exige as duas por contrato de tipos — `emailVerified` é carimbado quando o magic link confirma o e-mail, `image` guarda o avatar do Google OAuth. Não afeta nenhuma regra de negócio do produto.
  - **Tabelas novas:** `accounts`, `sessions`, `verification_tokens` — exigidas pelo Auth.js v5, ausentes da seção 5 porque o `PLANO.md` especifica "Auth.js v5" na arquitetura (seção 4) mas nunca desenha o próprio schema interno dele. É o contrato padrão do Auth.js, não uma decisão de produto.
  - **Duas variáveis de ambiente novas:** `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` — pelo mesmo motivo: a seção 4 pede "Google OAuth" mas a seção 17 (variáveis de ambiente) não lista as credenciais dele. Adicionadas ao `.env.example` da raiz. **O login com Google fica desligado até essas duas existirem** — o app não quebra sem elas, só oferece o magic link por e-mail.
  - **`users.email` é `citext` (o plano pede isso, de propósito, para e-mail case-insensitive) mas o `@auth/drizzle-adapter` só aceita `text`/`varchar` no contrato de tipos.** Resolvido com um cast de tipo local em `src/auth.ts` — não muda nada em tempo de execução, o Drizzle roda a query normalmente contra a coluna `citext`. Comentado no código.
  - Rodando localmente (sem banco real ainda): `npm run typecheck`, `npm run lint` e `npm run test` passam limpos. As 22 tabelas do domínio + as 4 do Auth.js geraram uma migration única (`0001_init_schema.sql`), com uma migration `0000` antes dela só para ligar as extensions `citext` e `pgcrypto` que o schema depende.
  - **`npm run build` falhava sem `DATABASE_URL` real** — o cliente do banco (`src/db/index.ts`) tentava conectar assim que qualquer rota importasse o módulo, e o Next varre todas as rotas nesse passo do build mesmo sem executar nada. Corrigido: se `DATABASE_URL` estiver vazia, usa um placeholder só de formato válido para o build não quebrar; numa chamada real sem banco configurado, o erro aparece na hora da query, não na hora do import. Isso não é um problema de produto, é mecânica do Next — mas teria quebrado o deploy no Netlify do mesmo jeito, então bom ter pego agora.
  - Recebi do dono: link do repositório GitHub (`upsidebs-stack/posiciona`) e a chave do Resend. Empurrei o código para lá (branch `main`). `RESEND_API_KEY` já está no `.env` local; `MAIL_FROM` está temporariamente em `onboarding@resend.dev` (remetente de teste do Resend, só entrega para o e-mail da própria conta) até haver um domínio verificado.
  - **Ainda faltam:** `DATABASE_URL` do Neon, e confirmar se a conta Netlify já existe, para fechar os três critérios de aceite da Fase 0.
- **2026-09-01** — Site publicado: **https://posiciona-mvp.netlify.app** (projeto `posiciona-mvp`, conta Netlify `UpsideBS`). `npm run build` roda como parte do deploy — mesmo comando testado localmente. Variáveis já configuradas no Netlify: `APP_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `BILLING_PROVIDER`.
  - **Achado que não estava no plano:** o site nasceu com "Team protection" do Netlify ligado — qualquer visitante via com uma tela pedindo login na Netlify antes mesmo de ver a página. É um default de conta/time (provavelmente do plano de trial), não uma configuração do projeto. Desliguei via API (`sso_login: false`). Confirmado: a home carrega pública normalmente agora. **Vale conferir de novo se o Netlify reativar isso em algum momento** — não deveria, mas é um comportamento de conta, fora do controle do código.
  - Testei o formulário de login em produção com `upsidebs@gmail.com`: o clique em "Send magic link" chega até o Auth.js e falha exatamente onde esperado — sem `DATABASE_URL` real, não há onde gravar o token de verificação. Prova que o caminho está certo ponta a ponta; só falta o banco.
