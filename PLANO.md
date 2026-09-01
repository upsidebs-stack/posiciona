# Plano de Implementação — **Posiciona** (codinome)

> App de mapa perceptual de posicionamento competitivo para local service businesses e SMBs nos **Estados Unidos**. Entidade e faturamento no **Brasil**.

**Documento destinado ao agente implementador (Claude Sonnet 5).** Leia a seção 0 antes de escrever qualquer código.

**Mercado: EUA.** Toda superfície de produto — interface, e-mails, prompts, conteúdo gerado — é **en-US**, em USD, com milhas e datas americanas. Identificadores de código em inglês. Este documento está em português porque é lido pelo dono do produto; nada dele deve vazar para a interface.

---

## 0. Como usar este documento

1. **Ordem de execução:** na ordem das **Fases** (seção 14). Cada fase tem critério de aceite verificável. Não avance sem passar no critério, rodando — não por inspeção.
2. **O MVP são as Fases 0 a 3.** Ele usa **um único fornecedor externo de dados** (Google) mais HTTP puro. Yelp, Reddit e provedores pagos de review estão fora do MVP, com gatilhos definidos na seção 11.4 para quando entrarem.
3. **Fonte da verdade do domínio:** a seção 2. O app é a digitalização daquele fluxo.
4. **Paywall:** conteúdo pago nunca sai do servidor para usuário free. Seção 9.
5. **Evidência:** todo score de LLM carrega `evidence[]` e `confidence`. Sem evidência, não grava. Seção 7.
6. **Qualidade do conselho:** a seção 13 tem uma regra curta sobre como escrever ações que tocam em avaliações. Não é regime de compliance — é evitar que o plano recomende algo que prejudique o cliente. Três linhas na rubrica e uma verificação nos testes.
7. **Decisões em aberto** marcadas `DECISÃO` na seção 16. Sem resposta, siga o default e registre em `DECISIONS.md`.

---

## 1. Produto

### 1.1 Público

Local service businesses e SMBs americanos com raio de atendimento delimitado: dentists, plumbers, HVAC contractors, electricians, chiropractors, med spas, auto repair, veterinarians, CPAs, personal injury e family law, gyms, salons, landscapers, grocery e specialty food.

Duas geometrias de atendimento, e a diferença pesa:

| | `STOREFRONT` | `SERVICE_AREA` |
|---|---|---|
| Exemplo | dentist, salon, grocery | plumber, HVAC, landscaper |
| Cliente vai até o negócio | sim | não |
| Raio típico | 2–10 mi | 15–50 mi |
| Busca no Places | uma, centrada | grade hexagonal de 5–9 buscas |
| Peso da proximidade na rivalidade | 0,45 | 0,25 |

O formulário pergunta isso (`business_type`) porque muda raio default, estratégia de busca e a fórmula de rivalidade.

O dono não tem tempo nem vocabulário de marketing. Entrada mínima, saída acionável, prova de valor em **menos de 90 segundos**. Ele já foi assediado por agências de local SEO — o produto não pode soar como uma.

### 1.2 Contexto competitivo

O mercado se divide em dois grupos que nunca se encontram:

| grupo | quem | o que vende | por que não é isto |
|---|---|---|---|
| Local SEO e reputação | BrightLocal, Birdeye, Podium, Yext, Synup, Semrush Local, Whitespark, Uberall, SOCi, Vendasta | Ranking, citations, gestão e geração de review | "Competitor analysis" ali significa rank tracking e benchmark de nota — não posicionamento |
| Mesmo comprador, outro job | NiceJob (~$75/mo) | Geração automatizada de review para plumbers, HVAC, contractors | Comprador idêntico ao nosso. Vende volume de review, não escolha de posição |
| Mapas perceptuais genéricos | MyMap, ChatDiagram, Taskade, Edraw | Você digita as marcas, a IA plota | Sai do conhecimento geral do LLM: sem dado real, sem geografia, sem o dentista da esquina |

**Ninguém junta as duas metades.** Quem tem o dado local não faz posicionamento; quem faz mapa perceptual não tem dado local. A lacuna é real.

**Mas o outro lado merece peso igual: talvez haja um motivo para ninguém fazer.** Todos os vizinhos vendem resultado visível e contável — mais reviews, posição melhor no mapa. Este produto vende **discernimento**. Para um encanador que quer o telefone tocando, é uma venda mais difícil. Essa é a hipótese de maior risco do negócio, e quem responde a ela é a primeira leva de clientes, não a arquitetura.

Consequência de produto: **todo insight sai grudado numa ação concreta**. Um mapa que não termina em "faça isto na terça" vira relatório bonito que ninguém age. A landing page não compete em "get more reviews"; compete em *"you're the fourth cheapest dentist in a market with nobody serving anxious patients"* — com o próximo passo logo abaixo.

### 1.3 Entrada do usuário

Obrigatórios: `business_name`, `description` (1–3 frases), `address_or_zip` (autocomplete), `business_type`, `service_radius_miles` (2 / 5 / 10 / 25 / 50).

Derivados automaticamente, **não perguntar**: `category` e `declared_benefit`, extraídos pela IA de `description` + Google Place types + site.

Unidades: **milhas** na interface, **metros** no banco. Converter na borda. E-mail só depois do mapa renderizado.

### 1.4 Tiers

| | **Free** | **Pro** |
|---|---|---|
| Diagnóstico + mapa perceptual | sim | sim |
| Concorrentes visíveis | **3** + contador "N more mapped" | todos (até 60) |
| Declared benefit de cada concorrente | só dos 3 | todos |
| Troca de eixos | não | sim (8 atributos) |
| Posições alternativas | não | sim (3 com viabilidade) |
| Plano de 12 meses (7 Ps) | não | sim (10–16 ações) |
| Ciclo mensal | não | sim |
| Veredito Continue × Reposition | não | sim |
| Export PDF | não | sim |
| Limite | 1 diagnóstico / 30 dias | 3 negócios, ciclos ilimitados |
| Preço | $0 | $49/mo · $470/yr |

---

## 2. Modelo conceitual → máquina de estados

```
+-- DIAGNOSIS -------------------------------------+
|  Market analysis (demand)                        |  -> market_analysis
|  Internal analysis (capabilities)                |  -> internal_analysis
|  Competitor analysis                             |  -> competitors + attribute_scores
+--------------------+-----------------------------+
                     v
            DESIRED POSITIONING                      -> desired_positioning
                     v
       Services marketing mix (7 Ps)                 -> marketing_mix + plan_actions
                     v
         +-----------+------------+
         v                        v
   Obtained positioning     Obtained positioning     -> attribute_scores (kind=OBTAINED)
     IS of interest          is NOT of interest
         |                        |
         |                        v
         |                   REPOSITIONING --+       -> verdict = REPOSITION (novo ciclo)
         +--------+---------------+          |
                  v                          |
           PERIODIC EVALUATION <-------------+       -> periodic_evaluations (cron mensal)
                  v
              CONTINUITY                             -> verdict = CONTINUE
```

```ts
export const CycleStage = {
  DIAGNOSIS: 'DIAGNOSIS',
  POSITIONING_SET: 'POSITIONING_SET',
  MIX_SET: 'MIX_SET',
  EXECUTING: 'EXECUTING',
  EVALUATED: 'EVALUATED',
} as const;

export const Verdict = { CONTINUE: 'CONTINUE', REPOSITION: 'REPOSITION' } as const;
```

`REPOSITION` abre `cycle_number + 1`, reaproveita os concorrentes mapeados e regera `desired_positioning` a partir de uma `position_option`. `CONTINUE` mantém o ciclo e atualiza o obtido e o status das ações.

**Uma distinção que organiza todo o resto do documento:**

| | vem de | quando é medido |
|---|---|---|
| **Posicionamento declarado / desejado** | o que o negócio e os concorrentes **dizem** — nome, site, categoria, horário, faixa de preço | no diagnóstico |
| **Posicionamento obtido** | o que os clientes **dizem** — reviews do próprio negócio | todo mês |

Isso é o que permite o MVP: **o mapa do diagnóstico não precisa de review de concorrente.** Ele é construído sobre fontes declaradas, que são baratas e objetivas. Reviews entram no ciclo mensal, e só as **do próprio cliente**, que são uma chamada de API por mês.

Rastreabilidade com o diagrama original:

| Rótulo no diagrama | Identificador |
|---|---|
| Análise do Mercado | `market_analysis` |
| Análise Interna | `internal_analysis` |
| Análise da Concorrência | `competitors` · `attribute_scores` |
| Posicionamento Desejado | `desired_positioning` |
| Composto de marketing de serviços | `marketing_mix` · `plan_actions` |
| Posicionamento obtido | `attribute_scores` (`kind = 'OBTAINED'`) |
| Avaliação periódica | `periodic_evaluations` |
| Continuidade / Reposicionamento | `Verdict.CONTINUE` / `.REPOSITION` |

---

## 3. Os 8 atributos canônicos

Nota **0–100**, iguais para todo negócio e todo concorrente. Os eixos do mapa são sempre dois destes oito.

| chave | 0 | 100 |
|---|---|---|
| `price` | Budget, cheapest in the area | Premium, charges above market |
| `specialization` | Generalist, does everything | Specialist in a narrow niche |
| `convenience` | Limited hours, no online booking, hard to reach | Extended hours, online booking, parking |
| `speed` | Long wait, weeks out | Handles emergencies, same-day service |
| `relationship` | Transactional, impersonal | Warm, remembers you, follows up |
| `reliability` | Inconsistent results, callbacks | Right the first time, technically respected |
| `modernity` | Traditional, dated facilities | Modern equipment, polished look |
| `breadth` | Does one thing | Full-service, one-stop shop |

Fixos em `src/domain/attributes.ts`. A IA propõe rótulos coloquiais por categoria (`price` → "Budget-friendly ↔ Premium dentistry") mas **nunca cria atributos novos**. O `declared_benefit` é mapeado para um `primary_attribute`.

### 3.1 Volume de avaliação quase não move o mapa — e isso é proposital

Duas coisas diferentes se chamam "mapa" no mercado deste produto, e confundi-las é um erro caro:

| | o que é | o que move |
|---|---|---|
| **Map pack do Google** | o ranking local nos resultados de busca | volume e recência de review pesam de verdade. É o que a indústria de local SEO vende |
| **Mapa perceptual (este produto)** | posição em 8 atributos, relativa aos concorrentes | o que o negócio **é e declara**: preço, horário, especialidade, site, escopo |

Atributo por atributo, **sete das oito notas não se movem com contagem de review**:

| atributo | o que move a nota |
|---|---|
| `price` | mudar a faixa de preço praticada |
| `specialization` | passar a ofertar, ou parar de ofertar, um serviço |
| `convenience` | abrir sábado, publicar horário, colocar agendamento online |
| `speed` | passar a atender urgência ou no mesmo dia |
| `relationship` | mudar como atende — e isso aparece no **teor** dos reviews, não na contagem |
| `reliability` | a **nota média**, não o volume. Cem reviews ruins pioram |
| `modernity` | reformar, trocar equipamento, refazer o site |
| `breadth` | ampliar ou estreitar o escopo |

Volume de review entra em três lugares, e nenhum deles é a posição do negócio: tamanho da bolha (`salience`), massa na superfície de densidade, e um dos dois componentes de `reliability` — onde o que pesa é a média, não a quantidade.

**Três consequências:**

1. **Gerar mais review não move o cliente no mapa.** Se ele conseguir 200 avaliações e continuar fechando às 17h, continua exatamente onde estava no eixo `convenience`. O produto é estruturalmente resistente ao jogo que a indústria de review joga.
2. **Nem no ciclo mensal.** O posicionamento obtido sai do **teor** dos reviews — temas e sentimento —, não da contagem. Mais reviews do mesmo tipo devolvem a mesma posição obtida.
3. **A única forma de mover o mapa é mudar o negócio.** Que é exatamente o que o plano de 12 meses instrui, e por isso as ações saem das `structural_gaps`.

Isso é argumento de venda, não apenas nota de design. Vale estar na landing page: *"This doesn't move when you collect more reviews. It moves when you change something real."*

---

## 4. Arquitetura

```
Next.js 15 (App Router, TypeScript)
├── Hospedagem: Netlify  — NÃO Vercel; ver 4.2
├── UI: Tailwind + shadcn/ui + Recharts
├── Auth: Auth.js v5 (magic link + Google OAuth)
├── DB: Postgres (Neon ou Supabase) + Drizzle + migrations
├── Jobs: Inngest (steps duráveis, retry por step, cron mensal)
├── Pagamento: Merchant of Record atrás de uma interface (seção 10)
├── E-mail: Resend (CAN-SPAM compliant)
├── IA: @anthropic-ai/sdk — claude-opus-5
├── Dados externos no MVP — UM fornecedor:
│     Google Places API (New): Autocomplete, Text Search, Place Details
│     + fetch HTTP do site dos concorrentes (sem API, sem chave)
└── Anti-abuso: Cloudflare Turnstile + rate limit (Upstash Redis)
```

**Por que Inngest:** o diagnóstico leva 30–90 s. Route handler serverless estoura timeout. **Não use** `setTimeout` em route handler nem Vercel Cron chamando trabalho síncrono longo.

### 4.1 Estrutura de pastas

```
src/
  app/
    (marketing)/page.tsx
    (app)/map/[analysisId]/page.tsx
    (app)/plan/[cycleId]/page.tsx
    (app)/cycles/page.tsx
    (app)/billing/page.tsx
    (legal)/privacy/page.tsx            # + /terms, /do-not-sell
    api/
      analysis/route.ts                 # POST cria análise (free)
      analysis/[id]/route.ts            # GET — RESPEITA O GATING
      analysis/[id]/axes/route.ts       # POST troca de eixos (pago)
      checkout/route.ts                 # via BillingProvider
      portal/route.ts                   # via BillingProvider
      webhooks/billing/route.ts         # runtime nodejs, raw body
      privacy/request/route.ts          # access + deletion
      inngest/route.ts
  domain/
    attributes.ts       positioning.ts      gating.ts
    compliance.ts       gaps.ts             # lacunas estruturais, seção 8.2
  services/
    places.ts           site-fetch.ts       claude.ts       email.ts
    billing/
      types.ts          paddle.ts           index.ts        # provider trocável
  jobs/
    run-diagnosis.ts    monthly-evaluation.ts    retention-sweep.ts
  db/
    schema.ts           migrations/
```

### 4.2 Começar com custo zero

Quase tudo tem free tier suficiente para o MVP. A exceção é a Claude API, que não tem.

| camada | escolha | franquia gratuita | vira pago quando |
|---|---|---|---|
| Hospedagem | **Netlify Starter** | 100 GB/mês, 300 min de build | tráfego real |
| Banco | Supabase Free ou Neon Free | 500 MB / 0,5 GB | milhares de análises guardadas |
| Auth | Auth.js sobre o mesmo banco | — | nunca |
| Jobs | Inngest Free | dezenas de milhares de steps/mês | volume alto |
| Redis / rate limit | Upstash Free | — | volume alto |
| E-mail | Resend Free | 3.000/mês, 100/dia | ~100 assinantes ativos |
| Captcha | Cloudflare Turnstile | ilimitado | nunca |
| Erros | Sentry Free | ~5k eventos/mês | volume alto |
| Pagamento | Paddle | sem mensalidade | só cobra % quando você vende |
| Google Places | franquia por SKU | ver abaixo | ~1.000 diagnósticos/mês |
| **Claude API** | — | **não tem free tier** | **desde a primeira chamada** |

**Não use Vercel.** O plano Hobby é gratuito mas os termos **proíbem uso comercial** — monetização e workload que gera receita. O Starter da Netlify permite uso comercial dentro da cota, inclusive SaaS pago. Cloudflare Workers é a outra alternativa que permite.

**Google Places — o crédito de $200/mês acabou.** Foi retirado em março de 2025 e substituído por franquia mensal **por SKU**: aproximadamente 10.000 chamadas Essentials, 5.000 Pro e 1.000 Enterprise. Mapeando no nosso pipeline:

| chamada | SKU | franquia | consumo por diagnóstico |
|---|---|---|---|
| Autocomplete | Essentials | ~10.000/mês | 1 sessão |
| Text Search com FieldMask enriquecido | Pro | ~5.000/mês | 1–5 |
| Place Details do próprio negócio, com reviews | Enterprise | ~1.000/mês | 1 |

O gargalo é o Enterprise: **cerca de 1.000 diagnósticos por mês dentro da franquia**, muito acima de qualquer necessidade de MVP. Exige cartão cadastrado, mas não cobra dentro da franquia. *Confirme os números vigentes — o Google já mudou isso uma vez.*

**Claude é o único custo real do MVP:** ~$0,42 por diagnóstico em `claude-opus-5`, ~$0,09 em `claude-haiku-4-5`. Cem diagnósticos de teste custam entre $9 e $42.

> **Custo para chegar ao ar e testar de verdade: entre $10 e $40, mais o domínio (~$12/ano).** O free tier acaba quando o produto já estiver vendendo — que é exatamente quando deve acabar.

---

## 5. Modelo de dados

Diferenças em relação a um desenho com múltiplas fontes: `competitors` guarda os campos objetivos do Places e o extrato do site; `review_snapshots` existe mas no MVP só recebe reviews **do próprio negócio**.

```sql
-- =============== Contas e assinatura ===============
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 citext UNIQUE NOT NULL,
  name                  text,
  timezone              text NOT NULL DEFAULT 'America/New_York',
  created_at            timestamptz NOT NULL DEFAULT now(),
  deletion_requested_at timestamptz
);

CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider              text NOT NULL,        -- 'PADDLE' | 'LEMONSQUEEZY' | ...
  provider_customer_id  text NOT NULL,
  provider_subscription_id text UNIQUE,
  price_id              text,
  status                text NOT NULL,        -- active|trialing|past_due|canceled|paused
  current_period_end    timestamptz,
  cancel_at_period_end  boolean NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_customer_id)
);
CREATE INDEX ON subscriptions (user_id);

-- Idempotência de webhook — inserir ANTES de processar
CREATE TABLE billing_events (
  id            text PRIMARY KEY,       -- id do evento no provedor
  provider      text NOT NULL,
  type          text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

-- =============== Negócio ===============
CREATE TABLE businesses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  anon_session_id     text,
  name                text NOT NULL,
  description         text NOT NULL,
  category_slug       text NOT NULL,
  business_type       text NOT NULL,          -- 'STOREFRONT' | 'SERVICE_AREA'
  google_place_id     text,
  formatted_address   text,
  state_code          char(2),
  lat                 double precision NOT NULL,
  lng                 double precision NOT NULL,
  service_radius_m    integer NOT NULL,
  declared_benefit    text,
  primary_attribute   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cycles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL DEFAULT 1,
  stage        text NOT NULL DEFAULT 'DIAGNOSIS',
  started_at   timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz,
  UNIQUE (business_id, cycle_number)
);

-- =============== DIAGNOSIS ===============
CREATE TABLE market_analysis (
  cycle_id       uuid PRIMARY KEY REFERENCES cycles(id) ON DELETE CASCADE,
  segments       jsonb NOT NULL,
  target_segment text NOT NULL,
  target_profile jsonb NOT NULL,
  rationale      text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE internal_analysis (
  cycle_id       uuid PRIMARY KEY REFERENCES cycles(id) ON DELETE CASCADE,
  strengths      jsonb NOT NULL,
  weaknesses     jsonb NOT NULL,
  capacity_score jsonb NOT NULL,   -- {[attribute]: 0..100} capacidade de MOVER cada atributo
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- =============== Concorrentes ===============
CREATE TABLE competitors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  google_place_id     text NOT NULL,          -- cacheável indefinidamente (ToS)
  name                text NOT NULL,
  formatted_address   text,
  lat                 double precision,
  lng                 double precision,
  distance_m          integer NOT NULL,
  primary_type        text,
  types               text[],                 -- array completo: sinal forte de amplitude
  rating              numeric(2,1),
  ratings_total       integer,
  price_level         integer,                -- 0..4
  website             text,
  opening_hours       jsonb,                  -- horário por dia; base das lacunas estruturais
  site_extract        jsonb,                  -- {title, description, h1, h2} — declared benefit
  site_fetched_at     timestamptz,
  is_chain            boolean NOT NULL DEFAULT false,
  declared_benefit    text,
  primary_attribute   text,
  relevance_score     numeric(5,2) NOT NULL,
  rivalry_score       numeric(5,2),
  is_free_visible     boolean NOT NULL DEFAULT false,
  places_content_expires_at timestamptz,      -- 30 dias, ToS Google
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, google_place_id)
);
CREATE INDEX ON competitors (business_id, rivalry_score DESC);

CREATE TABLE attribute_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id      uuid NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  subject_type  text NOT NULL,            -- 'SELF' | 'COMPETITOR'
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  kind          text NOT NULL,            -- 'DESIRED' | 'OBTAINED'
  scores        jsonb NOT NULL,
  confidence    jsonb NOT NULL,
  evidence      jsonb NOT NULL,
  measured_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (subject_type = 'SELF' OR competitor_id IS NOT NULL)
);
CREATE INDEX ON attribute_scores (cycle_id, subject_type, kind);

-- =============== Posicionamento ===============
CREATE TABLE desired_positioning (
  cycle_id       uuid PRIMARY KEY REFERENCES cycles(id) ON DELETE CASCADE,
  statement      text NOT NULL,
  target_scores  jsonb NOT NULL,
  primary_axis   text NOT NULL,
  secondary_axis text NOT NULL,
  proof_points   jsonb NOT NULL,
  origin         text NOT NULL,          -- 'DIAGNOSIS' | 'REPOSITION'
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE map_axes (
  cycle_id    uuid PRIMARY KEY REFERENCES cycles(id) ON DELETE CASCADE,
  x_attribute text NOT NULL, y_attribute text NOT NULL,
  x_label_low text NOT NULL, x_label_high text NOT NULL,
  y_label_low text NOT NULL, y_label_high text NOT NULL,
  rationale   text NOT NULL
);

-- Lacunas estruturais detectadas — base objetiva das posições alternativas
CREATE TABLE structural_gaps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id    uuid NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  kind        text NOT NULL,      -- HOURS|SERVICE_TYPE|PRICE_BAND|DIGITAL|SPEED
  statement   text NOT NULL,      -- "None of the 23 competitors is open past 5pm"
  coverage    jsonb NOT NULL,     -- números que sustentam a afirmação
  attribute   text NOT NULL,      -- qual dos 8 atributos ela abre
  strength    numeric(5,2) NOT NULL
);

CREATE TABLE position_options (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        uuid NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  rank            integer NOT NULL,
  title           text NOT NULL,
  statement       text NOT NULL,
  target_scores   jsonb NOT NULL,
  attractiveness  numeric(5,2) NOT NULL,
  feasibility     numeric(5,2) NOT NULL,
  demand_evidence jsonb NOT NULL,   -- referencia structural_gaps e/ou temas de review
  risks           jsonb NOT NULL,
  UNIQUE (cycle_id, rank)
);

-- =============== 7 Ps + plano (PAGO) ===============
CREATE TABLE marketing_mix (
  cycle_id   uuid PRIMARY KEY REFERENCES cycles(id) ON DELETE CASCADE,
  product    jsonb NOT NULL, price jsonb NOT NULL, place jsonb NOT NULL,
  promotion  jsonb NOT NULL, people jsonb NOT NULL, process jsonb NOT NULL,
  physical_evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plan_actions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id         uuid NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  quarter          integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  p                text NOT NULL,
  title            text NOT NULL,
  description      text NOT NULL,
  target_attribute text NOT NULL,
  effort           text NOT NULL,   -- LOW|MEDIUM|HIGH
  cost_band        text NOT NULL,   -- NO_COST|UNDER_500|UNDER_2000|OVER_2000 (USD)
  kpi              text NOT NULL,
  kpi_target       text NOT NULL,
  status           text NOT NULL DEFAULT 'PENDING',
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON plan_actions (cycle_id, quarter);

-- =============== Reviews (no MVP: só do próprio negócio) ===============
CREATE TABLE review_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,  -- null = próprio negócio
  source        text NOT NULL,          -- MVP: sempre 'GOOGLE'
  external_id   text NOT NULL,
  rating        integer,
  text_excerpt  text,                   -- <= 400 chars, autor anonimizado
  source_url    text,
  themes        jsonb,
  sentiment     numeric(3,2),
  published_at  timestamptz,
  collected_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,   -- GOOGLE = collected_at + 30d
  UNIQUE (source, external_id)
);
CREATE INDEX ON review_snapshots (business_id, collected_at DESC);
CREATE INDEX ON review_snapshots (expires_at);

-- Derivado, NAO expira
CREATE TABLE review_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  source        text NOT NULL,
  period        date NOT NULL,
  rating        numeric(2,1),
  ratings_total integer,
  ratings_delta integer,
  theme_counts  jsonb,
  UNIQUE (business_id, competitor_id, source, period)
);

-- =============== Avaliação periódica ===============
CREATE TABLE periodic_evaluations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id            uuid NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  period              date NOT NULL,
  gap_per_attribute   jsonb NOT NULL,
  gap_score           numeric(5,2) NOT NULL,
  primary_gap         numeric(5,2) NOT NULL,
  trend               text NOT NULL,      -- IMPROVING|STABLE|WORSENING
  verdict             text NOT NULL,      -- CONTINUE|REPOSITION|INSUFFICIENT_DATA
  narrative           text NOT NULL,
  recommended_actions jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, period)
);

CREATE TABLE usage_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  anon_session_id text,
  kind            text NOT NULL,
  business_id     uuid REFERENCES businesses(id) ON DELETE SET NULL,
  cost_cents      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON usage_events (user_id, kind, created_at DESC);
CREATE INDEX ON usage_events (anon_session_id, created_at DESC);
```

**`retention-sweep` diário:** `DELETE FROM review_snapshots WHERE expires_at < now()`. `review_metrics` sobrevive — é derivado, não conteúdo de terceiro.

---

## 6. Pipeline de diagnóstico — MVP

Função Inngest `run-diagnosis`, um step por etapa, retry independente.

| # | Step | O que faz | Chamadas externas |
|---|---|---|---|
| 1 | `resolve_self` | Autocomplete → `place_id` do próprio negócio → Place Details rico (inclui suas reviews) | 1 sessão Autocomplete + 1 Details |
| 2 | `classify` | `category_slug`, `declared_benefit`, `primary_attribute`, keywords, `includedTypes` | 1 LLM curto |
| 3 | `discover` | Text Search com **FieldMask enriquecido** — ver 6.1 | 1–5 Text Search |
| 4 | `filter` | Top-N por `relevance_score` (25 free, 60 pago) | local |
| 5 | `fetch_sites` | HTTP no site dos top-12: `<title>`, meta description, `h1`, primeiro `h2` | 0 (HTTP puro) |
| 6 | `score` | As 8 notas com evidência, em lotes | LLM |
| 7 | `gaps` | Lacunas estruturais determinísticas — ver 8.2 | local |
| 8 | `axes` | Os 2 eixos que mais separam o conjunto | 1 LLM curto |
| 9 | `diagnose` | Mercado, interna, `desired_positioning` | 1 LLM |
| 10 | `rivalry` | Ordena e marca os 3 do free | local |
| 11 | `paid_extras` | Posições alternativas, 7 Ps, plano — **só assinante** | 2 LLM |

Steps 1–10 rodam sempre. O 11 dispara pelo webhook de billing quando a assinatura confirma.

### 6.1 A decisão que barateia tudo: FieldMask no Text Search

Na **Places API (New)**, a busca (`places:searchText` / `places:searchNearby`) aceita um `X-Goog-FieldMask` e devolve **os mesmos campos que o Place Details devolveria**, para até 20 resultados, em **uma requisição cobrada**. Isso substitui o padrão caro de "1 busca + N Place Details".

FieldMask do MVP na busca:

```
places.id, places.displayName, places.formattedAddress, places.location,
places.rating, places.userRatingCount, places.priceLevel, places.businessStatus,
places.primaryType, places.types, places.websiteUri, places.regularOpeningHours
```

`places.reviews` fica **de fora** — é o campo caro, e nós não precisamos das reviews dos concorrentes no diagnóstico (ver seção 2: o mapa do diagnóstico é sobre posicionamento declarado).

> **Verifique antes de confiar.** Confirme na documentação vigente quais campos a busca aceita no FieldMask e em qual SKU eles caem. Se algum campo necessário não estiver disponível na busca, o fallback é: busca com FieldMask mínimo + `Place Details` apenas nos **top-12** por relevância, nunca nos 25. Nesse caso o custo sobe, mas não explode.

### 6.2 Descoberta: os três critérios

1. **Área geográfica.** `STOREFRONT`: uma busca com `locationRestriction` circular. `SERVICE_AREA`: 5–9 buscas numa grade hexagonal cobrindo o raio — o Places satura em ~20 resultados por busca, e uma única busca de 50 mi devolve só o centro. Deduplicar por `place_id`.
2. **Produto/serviço.** `includedTypes` (`dentist`, `plumber`, `electrician`, `veterinary_care`…) mais as keywords do step 2.
3. **Benefício declarado.** Não filtra a busca; entra no step 6 como dimensão de posicionamento. Dois dentists na mesma rua com benefícios opostos são vizinhos e rivais fracos — esse é o insight central do produto.

Exclusões: o próprio negócio; `businessStatus != 'OPERATIONAL'`. Franquias e redes nacionais entram marcadas `is_chain` com peso reduzido — Aspen Dental, Roto-Rooter, Jiffy Lube são numerosas o bastante para dominar o mapa e enterrar o concorrente que de fato tira o cliente.

### 6.3 Fetch do site (step 5) — a fonte mais barata e mais on-model

O site do concorrente é a fonte **canônica** do benefício declarado. É de graça, sem chave, sem rate limit de API, sem janela de retenção — é copy de marketing público, e nós guardamos só um extrato derivado.

```ts
// src/services/site-fetch.ts — bounded, tolerante a falha
// - respeitar robots.txt
// - timeout 3s, sem redirect além de 3 saltos, max 512 KB
// - SEM renderização de JS: só o HTML inicial
// - extrair: <title>, meta[name=description], primeiro <h1>, primeiro <h2>
// - falhar em silêncio: site fora do ar é o caso comum, não um erro
// - concorrência limitada (p-limit 5), User-Agent identificando o app e uma URL de contato
```

Aplicar apenas nos **top-12** por relevância. Nos demais, `site_extract` fica nulo e o scoring usa `confidence` menor.

### 6.4 Relevância e rivalidade

```ts
// Relevância: quem entra na lista (pré-LLM, barato)
relevance = 0.35*proximity + 0.30*categoryMatch + 0.25*salience + 0.10*completeness;
//   proximity      = 1 - (distance_m / service_radius_m), clamp 0..1
//   categoryMatch  = 1.0 tipo exato, 0.6 relacionado, 0.2 só keyword
//   salience       = log1p(ratings_total) normalizado no conjunto
//   completeness   = tem site, tem horário publicado

// Rivalidade: quem aparece nos 3 gratuitos
const wProx = businessType === 'SERVICE_AREA' ? 0.25 : 0.45;
rivalry = wProx*proximity + (0.85-wProx)*positionalCloseness + 0.15*salience
        - (isChain ? 0.15 : 0);
```

Os **3 do free** são os de maior `rivalry_score`: quem disputa o mesmo cliente, pelo mesmo benefício, na mesma área.

### 6.5 O que cada atributo consegue com as fontes do MVP

Honestidade sobre a qualidade do sinal — isso alimenta o `confidence` e precisa aparecer na interface.

| atributo | sinal no MVP | força |
|---|---|---|
| `price` | `priceLevel` + norma da categoria + copy do site | forte |
| `specialization` | `primaryType` + `types[]` + nome + copy | forte |
| `convenience` | `regularOpeningHours` + `websiteUri` + distância | forte, e totalmente objetivo |
| `reliability` | `rating` + `ratings_total` | razoável |
| `breadth` | tamanho de `types[]` + copy do site | razoável |
| `modernity` | presença e qualidade do site + `priceLevel` | parcial |
| `speed` | horário (24 h, emergência) + sinais no nome e na copy | parcial |
| `relationship` | escala (solo × rede), nome próprio na razão social | parcial |

Cinco dos oito são bem sustentados, três são parciais. Como os scores são **relativos ao conjunto** e carregam `confidence`, isso é suficiente para um mapa crível. Os três parciais melhoram na Fase 4, quando entram as reviews do próprio negócio, e melhorariam mais com fontes adicionais — cujos gatilhos estão na 11.4.

---

## 7. Contratos de LLM

### 7.1 Cliente

```ts
// src/services/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

export const claude = new Anthropic();          // ANTHROPIC_API_KEY do ambiente
export const MODEL = 'claude-opus-5';

// Rubrica FIXA: os 8 atributos com âncoras, regras de pontuação, hierarquia de
// evidência, voz, a regra de ações sobre avaliação, e três exemplos resolvidos.
// ~3.000 tokens. Prefixo estável, idêntico byte a byte.
// JÁ ESCRITA: seed/src/domain/rubric.md — use como está, em en-US.
export const RUBRIC = readFileSync('src/domain/rubric.md', 'utf8');

export async function parseStructured<T extends z.ZodTypeAny>(args: {
  schema: T; userContent: string; effort?: 'low'|'medium'|'high'|'xhigh';
}) {
  const res = await claude.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: args.effort ?? 'high', format: zodOutputFormat(args.schema) },
    system: [{ type: 'text', text: RUBRIC, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: [{ role: 'user', content: args.userContent }],
  });
  if (!res.parsed_output) throw new Error('LLM returned no valid structured output');
  return { data: res.parsed_output as z.infer<T>, usage: res.usage };
}
```

A `RUBRIC` nunca contém data, UUID ou nome de empresa — qualquer byte variável invalida o cache. Verifique `usage.cache_read_input_tokens > 0` em requisições repetidas; zero significa invalidador silencioso. Prefixo mínimo cacheável é 512–4096 tokens conforme o modelo.

### 7.2 Schemas (Zod)

```ts
export const ATTRIBUTES = ['price','specialization','convenience','speed',
                           'relationship','reliability','modernity','breadth'] as const;

const Score = z.number().int().min(0).max(100);
const Evidence = z.object({
  source: z.enum(['DESCRIPTION','GOOGLE_ATTRIBUTE','GOOGLE_HOURS','GOOGLE_RATING',
                  'WEBSITE','OWN_REVIEW','INFERENCE']),
  quote:  z.string().max(300),
  url:    z.string().nullable(),
});
const ScoreBlock = z.object({
  value: Score,
  confidence: z.number().min(0).max(1),
  evidence: z.array(Evidence).min(1),   // sem evidência, o score não existe
});
const EightScores = z.object(Object.fromEntries(ATTRIBUTES.map(a => [a, ScoreBlock])) as any);

export const ClassificationSchema = z.object({
  category_slug: z.string(),
  category_label: z.string(),                 // en-US
  declared_benefit: z.string().max(200),
  primary_attribute: z.enum(ATTRIBUTES),
  search_keywords: z.array(z.string()).min(2).max(6),
  google_included_types: z.array(z.string()).max(4),
  suggested_radius_miles: z.number(),
});

export const CompetitorScoringSchema = z.object({
  results: z.array(z.object({
    place_id: z.string(),
    declared_benefit: z.string().max(200),
    primary_attribute: z.enum(ATTRIBUTES),
    scores: EightScores,
  })),
});

export const AxesSchema = z.object({
  x_attribute: z.enum(ATTRIBUTES), y_attribute: z.enum(ATTRIBUTES),
  x_label_low: z.string().max(40), x_label_high: z.string().max(40),
  y_label_low: z.string().max(40), y_label_high: z.string().max(40),
  rationale: z.string().max(400),
});

export const DiagnosisSchema = z.object({
  market_analysis: z.object({
    segments: z.array(z.object({
      name: z.string(), share_estimate: z.number(), needs: z.array(z.string()),
      price_sensitivity: z.enum(['LOW','MEDIUM','HIGH']), evidence: z.array(Evidence),
    })).min(2).max(4),
    target_segment: z.string(),
    target_profile: z.object({
      who: z.string(), jobs_to_be_done: z.array(z.string()),
      triggers: z.array(z.string()), objections: z.array(z.string()),
    }),
    rationale: z.string(),
  }),
  internal_analysis: z.object({
    strengths:  z.array(z.object({ attribute: z.enum(ATTRIBUTES), statement: z.string(),
                                   evidence: z.array(Evidence) })),
    weaknesses: z.array(z.object({ attribute: z.enum(ATTRIBUTES), statement: z.string(),
                                   evidence: z.array(Evidence) })),
    capacity_score: z.object(Object.fromEntries(ATTRIBUTES.map(a => [a, Score])) as any),
  }),
  desired_positioning: z.object({
    statement: z.string().max(180),
    target_scores: z.object(Object.fromEntries(ATTRIBUTES.map(a => [a, Score])) as any),
    primary_axis: z.enum(ATTRIBUTES), secondary_axis: z.enum(ATTRIBUTES),
    proof_points: z.array(z.string()).min(2).max(5),
  }),
});

export const PositionOptionsSchema = z.object({
  options: z.array(z.object({
    title: z.string().max(60),
    statement: z.string().max(200),
    target_scores: z.object(Object.fromEntries(ATTRIBUTES.map(a => [a, Score])) as any),
    why_now: z.string(),
    gap_ids: z.array(z.string()).min(1),        // referencia structural_gaps — obrigatório
    demand_evidence: z.array(Evidence).min(1),
    risks: z.array(z.string()).min(1),
    feasibility_rationale: z.string(),
  })).length(3),
});

const P = z.enum(['product','price','place','promotion','people','process','physical_evidence']);
export const PlanSchema = z.object({
  marketing_mix: z.object(Object.fromEntries(
    ['product','price','place','promotion','people','process','physical_evidence']
      .map(k => [k, z.object({ direction: z.string(), changes: z.array(z.string()) })])
  ) as any),
  actions: z.array(z.object({
    quarter: z.number().int().min(1).max(4),
    p: P,
    title: z.string().max(80),
    description: z.string().max(600),
    target_attribute: z.enum(ATTRIBUTES),
    effort: z.enum(['LOW','MEDIUM','HIGH']),
    cost_band: z.enum(['NO_COST','UNDER_500','UNDER_2000','OVER_2000']),
    kpi: z.string(), kpi_target: z.string(),
  })).min(10).max(16),
});
```

### 7.3 Regras de prompt (dentro da RUBRIC)

1. **Nunca invente fatos sobre um concorrente.** Sem evidência, `confidence <= 0.3` e `source: 'INFERENCE'`, declarado como estimativa por categoria.
2. **Ancoragem:** 50 é "a média dos concorrentes desta lista", não absoluta. Todo score é relativo ao conjunto mapeado.
3. **Distribua.** Se todos receberem notas parecidas, o mapa é inútil. Em cada atributo deve haver ao menos um caso abaixo de 35 e um acima de 65 — **desde que a evidência sustente**. Se o atributo genuinamente não diferencia ninguém, devolva confiança baixa em todos e não o escolha como eixo.
4. **Prefira o dado objetivo à inferência.** Horário publicado vence adjetivo do site. `priceLevel` vence impressão. Quando os dois divergirem, use o objetivo e registre a divergência como evidência — ela costuma ser o insight ("they advertise 'emergency service' but close at 4pm on weekdays").
5. **Voz:** inglês americano, frases curtas, zero jargão de agência. Proibido: *synergy, brand equity, activate the brand, leverage, best-in-class*.
6. **Ações executáveis por uma pessoa, sem agência.** Ruim: "improve your branding". Bom: "Add Saturday morning hours, 8am–noon, and publish them on your Google Business Profile — none of the 23 competitors within 5 miles is open on Saturday."
7. **Nada de promessa de resultado.** Nunca "this will increase revenue by X%". Use meta e KPI observável.
8. **Se a ação tocar em avaliações (seção 13.2):** pedir a todos os clientes, sem incentivo e sem triagem por satisfação; Google sim, Yelp não; nunca escrever o texto de uma avaliação. E nunca adjetivar concorrente nomeado — posição relativa e número, não juízo de valor.

### 7.4 Modelo e custo

Default: **`claude-opus-5`** em todos os steps.

| Modelo | Input $/1M | Output $/1M | Custo estimado por diagnóstico |
|---|---|---|---|
| `claude-opus-5` | $5 | $25 | ~$0,42 |
| `claude-sonnet-5` | $2 | $10 | ~$0,17 |
| `claude-haiku-4-5` | $1 | $5 | ~$0,09 |

*(Base: ~25k tokens de input — bem menos que num desenho com review text de 25 concorrentes —, ~70 % servidos do cache a 0,1×, e ~15k de output.)*

**Batch API no ciclo mensal:** rode todos os assinantes num único `client.messages.batches.create()` e pague **metade**. Resultados chegam fora de ordem — indexe por `custom_id`, nunca por posição.

### 7.5 Custo total por diagnóstico e a inversão que ele produz

| item | estimativa |
|---|---|
| Autocomplete (sessão) + 1 Place Details do próprio negócio | ~$0,05 |
| 1–5 Text Search com FieldMask enriquecido | ~$0,04 – $0,16 |
| Fetch de até 12 sites | $0 |
| Claude (`claude-opus-5`) | ~$0,42 |
| **Total** | **~$0,50 – $0,63** |

Contra ~$1,10–1,50 do desenho com múltiplas fontes e Place Details por concorrente. Mas o que mais importa é a **inversão**: agora o custo dominante é o LLM, não o Google. Isso muda a natureza do problema — a alavanca de custo passa a ser escolha de modelo, caching e tamanho de prompt, todas sob seu controle, em vez de uma tabela de preços de terceiro.

Preencha as constantes com a tabela vigente de cada fornecedor no deploy; **não** copie estes números como definitivos.

---

## 8. Mapa perceptual

### 8.1 Matemática (`src/domain/positioning.ts`)

```ts
export function attrDistance(a: Scores, b: Scores, weights?: Partial<Scores>): number {
  const w = { ...Object.fromEntries(ATTRIBUTES.map(k => [k, 1])), ...weights };
  const sum  = ATTRIBUTES.reduce((s, k) => s + w[k] * (a[k] - b[k]) ** 2, 0);
  const wsum = ATTRIBUTES.reduce((s, k) => s + w[k], 0);
  return Math.sqrt(sum / wsum);            // 0..100
}

export function densityGrid(points: {x:number;y:number;mass:number}[], bandwidth = 12) {
  const G = 20;                            // grade 20x20 sobre 0..100
  const grid: number[][] = [];
  for (let i = 0; i < G; i++) {
    grid[i] = [];
    for (let j = 0; j < G; j++) {
      const cx = (i + 0.5) * (100 / G), cy = (j + 0.5) * (100 / G);
      grid[i][j] = points.reduce((s, p) => {
        const d2 = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        return s + p.mass * Math.exp(-d2 / (2 * bandwidth ** 2));
      }, 0);
    }
  }
  return grid;
}
// mass = log1p(ratings_total) * (isChain ? 0.6 : 1)
```

### 8.2 Lacunas estruturais — o sinal de demanda do MVP

No desenho anterior, a prova de que um espaço vazio valia a pena vinha de reclamações em reviews de concorrentes. Isso custava caro e era difuso. **A substituição é melhor, não pior:** lacunas calculadas dos campos objetivos que já temos.

> **Já escrito e testado:** `seed/src/domain/gaps.ts`. Compila sob `--strict` e foi exercitado contra quatro cenários — conjunto uniforme, sábado já coberto, conjunto pequeno demais, e maioria sem horário publicado. Copie e escreva os testes dele antes de qualquer outra coisa da Fase 1. Exporta também `topGaps(gaps, 5, 2)`: um mercado uniforme produz uma dúzia de lacunas e uma parede delas vira ruído, então a interface mostra as cinco mais fortes com no máximo duas por atributo.

```ts
// src/domain/gaps.ts — 100% determinístico, sem LLM
detectGaps(competitors, self) -> StructuralGap[]

HOURS         nenhum concorrente aberto após 18h / sábado / domingo / 24h
              -> abre `convenience` e `speed`
SERVICE_TYPE  um includedType relevante da categoria sem nenhum ocupante no raio
              (ex.: nenhum `pediatric_dentist` entre 23 dentists)
              -> abre `specialization`
PRICE_BAND    faixa de priceLevel desocupada (ex.: 0 concorrentes em nível 1, 14 em nível 2)
              -> abre `price`
DIGITAL       % sem site, sem horário publicado, sem agendamento online
              -> abre `convenience` e `modernity`
SPEED         nenhum concorrente sinalizando emergência ou same-day
              -> abre `speed`
```

Cada lacuna vira uma frase verificável com os números por trás: *"None of the 23 dentists within 5 miles is open on Saturday."* Isso é **mais forte** que uma reclamação em review — é auditável pelo próprio usuário em dois cliques, e vira diretamente uma ação do plano.

**Uma célula do mapa só vira posição candidata se passar nas três:**

1. `densidade < percentil_25` da grade — ninguém ocupa;
2. `15 <= distância_da_posição_atual <= 45` — perto demais não é reposicionamento, longe demais não é crível em 12 meses;
3. **está ancorada em pelo menos uma `structural_gap`** cujo `attribute` corresponde a um dos eixos da célula. No schema, `PositionOptionsSchema.gap_ids` é obrigatório e não vazio.

Se **nenhuma** célula passar nas três, o app diz isso — *"We didn't find a defensible open position. The recommendation is to strengthen where you already are."* — e não inventa três opções para preencher a tela.

A partir da Fase 4, temas extraídos das reviews **do próprio cliente** entram como quarta família de lacuna (`REVIEW_THEME`), reforçando as demais sem substituí-las.

### 8.3 Renderização

- `Recharts` `<ScatterChart>`, domínio fixo `[0,100]` nos dois eixos.
- Quadrantes tonalizados, rótulos nas quatro pontas.
- Ponto do usuário em dois estados sobrepostos — **obtained** preenchido e **desired** tracejado — ligados por uma seta. A seta é a leitura visual do gap.
- Concorrentes: bolha proporcional à massa; label só nos 3 mais próximos.
- `confidence` visível: bolha com contorno pontilhado quando a confiança média do concorrente for baixa. O usuário precisa saber onde o dado é estimativa.
- Mobile funcional a 360 px; abaixo de 480 px, esconder labels e usar lista numerada.
- Acessibilidade: cor nunca é o único diferenciador; toggle "view as table". WCAG 2.1 AA é requisito.

---

## 9. Gating e paywall

O gating acontece **na serialização, no servidor**.

```ts
export type Tier = 'FREE' | 'PRO';

export async function getTier(userId: string | null): Promise<Tier> {
  if (!userId) return 'FREE';
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  const active = sub && ['active','trialing'].includes(sub.status)
    && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
  return active ? 'PRO' : 'FREE';
}

export function serializeAnalysis(full: FullAnalysis, tier: Tier) {
  if (tier === 'PRO') return full;
  const visible = full.competitors
    .sort((a, b) => b.rivalryScore - a.rivalryScore).slice(0, 3).map(pickPublicFields);
  return {
    business: full.business, axes: full.axes, selfScores: full.selfScores,
    competitors: visible,
    hiddenCompetitorCount: full.competitors.length - visible.length,   // só o número
    desiredPositioning: null, positionOptions: null, structuralGaps: null,
    plan: null, evaluations: null,
    locked: ['desiredPositioning','positionOptions','structuralGaps','plan',
             'evaluations','axisSwap'],
  };
}
```

Note que `structuralGaps` é conteúdo pago. As lacunas são o insight mais vendável do produto — no free, mostre só a **contagem** ("we found 4 structural gaps in your market").

**Checklist antes de cada release:**

- [ ] `GET /api/analysis/[id]` como free não retorna nenhum concorrente além dos 3.
- [ ] O HTML servido (view-source) não contém nomes nem coordenadas dos ocultos.
- [ ] Nenhum payload do Next (RSC flight data) carrega dado bloqueado.
- [ ] `POST /api/analysis/[id]/axes` devolve 402 para free.
- [ ] Trocar o id na URL para análise alheia devolve **404**, não 403 — não vaze existência.

**Fuzz obrigatório:** 200 análises sintéticas, afirmando que `serializeAnalysis(x, 'FREE')` nunca contém o nome de um concorrente oculto nem uma `structural_gap`, em nenhuma profundidade do objeto. É a única barreira automatizada contra vazar o produto pago.

**Limites do free:** Turnstile; rate limit por IP (3/hora); 1 diagnóstico por `anon_session_id` (cookie httpOnly, 30 dias) e 1 por e-mail a cada 30 dias; teto global mensal por env, ao estourar o formulário vira waitlist.

---

## 10. Pagamento — Merchant of Record, provider trocável

### 10.1 O problema a resolver

Entidade e faturamento no **Brasil**; clientes nos **EUA**. Isso cria três exigências simultâneas:

1. Cobrar cartão americano em USD, com recorrência.
2. Lidar com **sales tax americano** — SaaS é tributável em mais de vinte estados, e *economic nexus* alcança vendedor estrangeiro sem presença física. Registrar-se em 20+ estados a partir do Brasil é inviável para um MVP.
3. Receber no Brasil de forma limpa: remessa internacional que caracterize **exportação de serviço** (isenta de ISS e, quando o resultado ocorre no exterior, de PIS/COFINS).

Um **Merchant of Record** resolve os três de uma vez: o MoR é o vendedor legal perante o cliente americano, registra e recolhe o sales tax, e te paga como **fornecedor** — uma única remessa mensal, que é exportação de serviço.

### 10.2 Recomendação

**Paddle** como default. **Lemon Squeezy** como alternativa — é MoR e hoje pertence ao Stripe, o que preserva parte da sua preferência original.

`DECISÃO` — antes de fechar, confirme com o provedor escolhido: **payout para conta bancária de pessoa jurídica no Brasil**, moeda e cadência da remessa, e a documentação que eles emitem (você vai precisar dela para o contrato de câmbio e para o contador).

### 10.3 Sobre ClickBank, BuyGoods e Digistore24

São MoRs de verdade e resolveriam os pontos 1–3 acima. Mesmo assim, **não recomendo** para este produto. Quatro razões, em ordem de peso:

1. **A política de reembolso é incompatível com o custo marginal deste app.** Essas plataformas operam com janelas longas e generosas de devolução — a do ClickBank é historicamente de 60 dias, e os afiliados vendem *com base nisso*. Aqui, cada diagnóstico queima chamadas do Google e tokens do Claude no primeiro dia de uso. Um cliente que consome $2–5 de custo real e pede reembolso no dia 55 é prejuízo direto, e taxas de reembolso na casa de dois dígitos são normais nesse ecossistema. Isso é estrutural, não ajustável.
2. **Taxas maiores por um encaixe pior.** ~7,5–8 % + fixo, contra ~5 % de um MoR feito para SaaS. Você paga mais para receber um produto desenhado para infoproduto.
3. **A gestão da assinatura sai do seu app.** Portal de billing, dunning, atualização de cartão e troca de plano ficam no marketplace. Para retenção de SaaS isso é um handicap real, e os webhooks são bem mais pobres que os de um provedor SaaS-native.
4. **Adjacência de marca.** O comprador é um dentista, um encanador, um contador — profissionais que já são bombardeados por pitch de "local SEO" e estão pré-dispostos a desconfiar de estética de funil de venda direta. Um checkout com cara de oferta de marketing digital é risco de conversão com exatamente esse público.

**Mas eu acho que sei o que você está buscando ali, e vale separar as duas coisas.** O apelo dessas plataformas não é o MoR — é a **rede de afiliados**. Isso é uma estratégia de aquisição legítima, e você pode ter as duas coisas desacopladas e melhores:

> **MoR SaaS-native (Paddle ou Lemon Squeezy) para cobrança** + **ferramenta de afiliados SaaS (Rewardful, FirstPromoter ou Tolt) para o programa de parceiros.** Custam na faixa de $50–100/mês, integram com Paddle e Stripe, e te dão tracking, comissão recorrente e portal de afiliado — sem herdar política de reembolso, estrutura de taxa e marca de um marketplace de venda direta.

Há um porém honesto na direção contrária: afiliados de ClickBank e afins perseguem ofertas de EPC alto e comissão gorda. Um SaaS B2B de $49/mês com 30 % recorrente raramente ganha tração ali, mesmo quando aprovado. Ou seja, é provável que você pague o custo do encaixe ruim **sem** colher o benefício que motivou a escolha.

Se ainda assim quiser seguir por esse caminho, a arquitetura da 10.4 absorve a troca: é implementar um `ClickBankProvider` contra a mesma interface. Diga e eu escrevo.

### 10.4 A interface que torna a decisão reversível

Nenhuma regra de negócio conhece o provedor.

```ts
// src/services/billing/types.ts
export interface BillingProvider {
  readonly name: string;
  createCheckout(a: { userId: string; priceKey: 'MONTHLY'|'ANNUAL';
                      email: string; returnUrl: string }): Promise<{ url: string }>;
  createPortalSession(a: { providerCustomerId: string;
                           returnUrl: string }): Promise<{ url: string }>;
  verifyWebhook(rawBody: string, headers: Headers): BillingEvent;   // lança se inválido
  toEntitlement(e: BillingEvent): EntitlementChange | null;
}

export type EntitlementChange = {
  userId: string;
  providerCustomerId: string;
  providerSubscriptionId: string | null;
  status: 'active'|'trialing'|'past_due'|'canceled'|'paused';
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};
```

`src/services/billing/index.ts` exporta a instância escolhida por env (`BILLING_PROVIDER`). Trocar de provedor é escrever um arquivo novo e mudar uma variável — nada mais no app muda.

### 10.5 Webhook

```ts
// src/app/api/webhooks/billing/route.ts
export const runtime = 'nodejs';          // precisa do corpo cru

export async function POST(req: Request) {
  const body = await req.text();          // NÃO use req.json()
  let event: BillingEvent;
  try { event = billing.verifyWebhook(body, req.headers); }
  catch { return new Response('Invalid signature', { status: 400 }); }

  // Idempotência: se o INSERT conflitar, já processamos.
  const inserted = await db.insert(billingEvents)
    .values({ id: event.id, provider: billing.name, type: event.type })
    .onConflictDoNothing().returning();
  if (inserted.length === 0) return new Response('ok');

  const change = billing.toEntitlement(event);
  if (change) await applyEntitlement(change);       // + dispara generate-paid-extras
  await db.update(billingEvents).set({ processedAt: new Date() })
          .where(eq(billingEvents.id, event.id));
  return new Response('ok');
}
```

**Acesso nunca é concedido na `returnUrl`.** Ela é só UX; o entitlement vem do webhook, sempre. Idempotência por id do evento, sem exceção — todo provedor reenvia.

### 10.6 Lado brasileiro

Fora do escopo do código, dentro do escopo do lançamento. Leve ao contador: enquadramento (Simples Nacional × Lucro Presumido) para **exportação de serviços**; a isenção de ISS e de PIS/COFINS quando o resultado do serviço ocorre no exterior; contrato de câmbio para a remessa do MoR; e obrigações acessórias — Siscoserv quando aplicável, e DCBE ao Banco Central se houver ativo no exterior acima do limite. Preço fica em **USD** no produto; a conversão é evento do lado do recebimento, não da precificação.

---

## 11. Ciclo mensal e a escada de fontes

Cron horário disparando por fuso: cada usuário recebe às 8h **do fuso dele** (`users.timezone`), no dia 1. Às 6h UTC o e-mail chega às 2 da manhã na Costa Leste.

### 11.1 Fluxo — barato por construção

```
Para cada business com assinatura ativa:
  1. Place Details do PRÓPRIO negócio (rating, total, até 5 reviews)   [1 chamada]
  2. Text Search de refresh: rating e total dos concorrentes           [1-2 chamadas]
  3. extrair temas e sentimento das reviews novas                      [LLM, Batch]
  4. recalcular attribute_scores kind='OBTAINED' para o SELF           [LLM, Batch]
  5. recomputar structural_gaps (horário e site mudam)                 [local]
  6. gap vs. desired_positioning                                       [determinístico]
  7. veredito                                                          [determinístico]
  8. narrativa + ações recomendadas                                    [LLM]
  9. gravar periodic_evaluations; enviar digest
```

**O ponto que torna isso viável:** o posicionamento obtido é medido nas reviews **do próprio cliente**, não nas dos concorrentes. Dos concorrentes basta o movimento de métricas — nota e volume — que vem de graça no refresh da busca. O item caro nunca foi necessário.

### 11.2 Veredito — determinístico, a IA só escreve a narrativa

```ts
const gapPrimary = Math.abs(desired[primaryAxis] - obtained[primaryAxis]);
const gapScore   = attrDistance(desired, obtained, { [primaryAxis]: 3, [secondaryAxis]: 2 });

let verdict: Verdict;
if (gapScore <= 12 && gapPrimary <= 15)             verdict = 'CONTINUE';
else if (trend === 'IMPROVING' && gapScore <= 25)   verdict = 'CONTINUE';
else if (consecutiveBadMonths >= 3)                 verdict = 'REPOSITION';
else if (gapScore > 30 || gapPrimary > 35)          verdict = 'REPOSITION';
else                                                verdict = 'CONTINUE';
```

`trend` compara o `gapScore` do mês com a média dos 2 anteriores (`IMPROVING` se caiu > 3, `WORSENING` se subiu > 3, senão `STABLE`).

`REPOSITION` abre um CTA — *"Your obtained positioning isn't serving you. Here are 3 alternatives."* → leva às `position_options`; adotar uma abre `cycle_number + 1` com `origin = 'REPOSITION'`.

**Duas guardas:**

- Não avaliar antes de **5 reviews novos** desde o último ciclo. Sem isso, `verdict = 'INSUFFICIENT_DATA'` e a interface mostra *"Not enough new reviews this month to measure a shift"*. Para um encanador com três avaliações, qualquer medição mensal é ruído.
- Não emitir `REPOSITION` antes do 4º mês do ciclo — o plano precisa de tempo para agir antes de ser julgado.

### 11.3 Retenção

Conteúdo do Google Places expira em **30 dias** por ToS; `place_id` pode ser guardado indefinidamente. `review_metrics` e `structural_gaps` são derivados e sobrevivem — é neles que mora a série histórica. A interface tolera evidência textual ausente em ciclos antigos.

### 11.4 A escada de fontes, e quando subir um degrau

| Degrau | Fonte | Custo de integração | **Gatilho para adicionar** |
|---|---|---|---|
| **1 — MVP** | Google Places (busca com FieldMask) + site dos concorrentes | baixo | — |
| 2 | Reviews do próprio cliente (Google) | trivial, 1 chamada/mês | Fase 4, junto com o ciclo mensal |
| 3 | Place Details com reviews nos **top-8** concorrentes | médio | quando `confidence` média de `relationship` e `speed` ficar abaixo de 0,5 em mais de 30 % das análises |
| 4 | **Yelp Fusion** | alto — aprovação, cache de 24 h, atribuição, rate limit baixo | quando houver receita recorrente que justifique, e só nas verticais onde o Yelp cobre (restaurante, serviços domésticos, auto, beleza) |
| 5 | **Reddit** (subreddits de cidade) | médio — OAuth, rate limit | quando o público estiver concentrado em grandes metros; a cobertura é real em `r/AskNYC`, `r/Seattle`, `r/Austin` e cai fora deles |
| 6 | US Census ACS (dados demográficos por ZIP) | baixo — arquivo estático, sem API | quando quiser lacunas de idioma e renda ("nenhum concorrente com site em espanhol num ZIP com 40 % de população hispânica") |
| 7 | Provedor pago de reviews (DataForSEO, Outscraper) | médio, custo recorrente | só com base de assinantes que pague, e após avaliação jurídica |

Cada degrau entra **atrás da mesma interface de scoring** — uma `Evidence` a mais no array, uma `source` a mais no enum. Nenhum deles muda o modelo de dados nem a matemática. É por isso que começar estreito não cria dívida.

---

## 12. Rotas e telas

### 12.1 API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/analysis` | anônimo + Turnstile | cria business + cycle, enfileira `run-diagnosis` |
| GET | `/api/analysis/[id]` | opcional | análise **serializada por tier** |
| GET | `/api/analysis/[id]/status` | opcional | progresso do pipeline |
| POST | `/api/analysis/[id]/axes` | PRO | troca de eixos (sem novo LLM) |
| POST | `/api/checkout` | autenticado | via `BillingProvider` |
| POST | `/api/portal` | autenticado | via `BillingProvider` |
| POST | `/api/webhooks/billing` | assinatura do provedor | idempotente |
| PATCH | `/api/actions/[id]` | PRO | status de uma ação |
| GET | `/api/cycles/[businessId]` | PRO | histórico de avaliações |
| POST | `/api/privacy/request` | autenticado | access / deletion |
| GET | `/api/places/autocomplete` | anônimo | proxy — a chave do Google não vai ao cliente |

### 12.2 Telas

1. **Landing + formulário** — 5 campos, "See my free map". Diferenciação explícita contra ferramentas de local SEO.
2. **Tela de espera** (30–90 s) — progresso em linguagem humana: *"Found 23 competitors within 5 miles"*, *"Checking their hours and websites"*, *"Building your map"*. Espera com narrativa converte muito melhor que spinner.
3. **Mapa (free)** — 3 concorrentes, selo "+N more mapped", cartão do declared benefit, contagem de lacunas encontradas, e um bloco de upgrade mostrando **a forma** do que está bloqueado.
4. **Mapa (pro)** — todos os concorrentes, seletor de eixos, toggle desired/obtained, contorno pontilhado onde a confiança é baixa, tabela exportável.
5. **Lacunas estruturais** — lista com a frase e os números que a sustentam, cada uma linkando aos concorrentes que a comprovam. É a tela mais persuasiva do produto; trate com capricho.
6. **Posições alternativas** — 3 cartões: título, frase, atratividade × viabilidade, as lacunas que a ancoram, riscos. "Adopt this position" → novo ciclo.
7. **Plano 12 meses** — timeline por trimestre agrupada pelos 7 Ps, status, KPI, export PDF.
8. **Avaliação periódica** — série do `gapScore`, veredito do mês, temas que subiram e desceram.
9. **Billing** — plano atual e botão para o portal do provedor.
10. **Legal** — `/privacy`, `/terms`, `/do-not-sell`.

---

## 13. Enquadramento legal — o que realmente se aplica

### 13.1 O que o produto faz, e o que ele não faz

Uma versão anterior deste plano exagerou nesta seção. A correção:

O produto **lê dado público** — categoria, horário publicado, faixa de preço, site, nota e volume de avaliações — para calcular posição relativa. Isso é pesquisa de mercado sobre informação pública. Não existe regime de compliance específico para isso.

**As recomendações não saem de avaliações.** Elas saem das `structural_gaps` da seção 8, calculadas de campos objetivos: horário, `types`, `priceLevel`, presença de site. Avaliação entra num único ponto — medir mensalmente o posicionamento obtido **do próprio cliente**, comparando o que ele diz ser com o que os clientes dele dizem. É insumo de medição, não fonte de conselho.

E o cliente é uma **empresa** comprando análise competitiva, não um consumidor final comprando um produto. A FTC Reviews Rule trata de avaliação de consumidor falsa, incentivada ou suprimida. Nada disso descreve o que este app faz.

### 13.2 A única regra que sobra, e por que ela sobra

O plano de 12 meses cobre os 7 Ps. Em **Promotion**, para negócio local, uma das ações mais banais que existe é "peça avaliações aos seus clientes". O LLM vai escrever essa ação em algum momento — e quando escrever, precisa sair na versão certa. Não porque o produto seja um gerador de conselho sobre review, mas porque a versão errada **prejudicaria o cliente**.

| Se a ação tocar em avaliações | Versão correta |
|---|---|
| Pedir avaliação | a **todos** os clientes, sem incentivo e sem triagem por satisfação. Pedir só a quem se declarou satisfeito (*gating*) viola a política do Google e pode derrubar o perfil |
| Plataforma | Google sim; **Yelp não** — a política do Yelp desencoraja solicitação e pode filtrar ou penalizar a página |
| Texto de avaliação ou depoimento | o app **não escreve**. Resposta pública do dono a um review real, sim |

Isso é qualidade de conselho, não regime regulatório. Custa três linhas na `RUBRIC` e uma verificação simples nos testes — não uma fase.

### 13.3 Ao exibir concorrente nomeado

Mostrar que o concorrente X tem `priceLevel` 2 e fecha às 17h é relatar dado público do Google, com fonte. É fato, não opinião, e é exatamente o que o produto faz.

A disciplina que vale manter: o app **não adjetiva** concorrente. Nada de *overpriced*, *sloppy*, *bad service*. Posição relativa nos 8 atributos, lacuna com número, fonte do dado. Não por medo jurídico, mas porque adjetivo não é informação — e o produto vende informação.

### 13.4 Privacidade e e-mail

Regime americano é o **patchwork estadual**: CCPA/CPRA na Califórnia, mais Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana e a lista crescente. Como o produto não vende nem compartilha dados para publicidade cruzada, as obrigações práticas são: política de privacidade com categorias, finalidade e retenção; fluxo de **access** e **deletion** autenticado com prazo e log; link "Do Not Sell or Share" no rodapé (exigido mesmo sem venda — a página declara que não há); exclusão de conta em cascata.

Reviews contêm dados de terceiros: autor anonimizado, excerto ≤ 400 caracteres, retenção de 30 dias.

**CAN-SPAM** no digest: unsubscribe em um clique, endereço físico do remetente no rodapé, assunto não enganoso. Vale também para e-mails de cobrança.

> Com MoR, o provedor é o vendedor legal e assume o **sales tax**. A obrigação de privacidade continua sendo sua — o MoR não cobre isso.

### 13.5 Acessibilidade

WCAG 2.1 AA como requisito. Demandas de ADA sobre sites de negócios são comuns nos EUA, e o comprador é justamente um business sensível a isso.

---

## 14. Fases

### MVP — Fases 0 a 3

**Fase 0 — Fundação.** Next.js, Drizzle e migrations, Auth.js, Inngest local, deploy, CI com typecheck, lint e testes.
*Aceite:* deploy verde, magic link funcionando, migration em banco limpo.

**Fase 1 — Fluxo free ponta a ponta.** Formulário → `resolve_self` → classify → discover → filter → fetch_sites → score → gaps → axes → diagnose → rivalry → mapa com 3 concorrentes e contador.
*Aceite:* para cinco negócios reais em mercados diferentes — dentist urbano, plumber `SERVICE_AREA` suburbano, grocery, med spa, CPA em cidade pequena — o pipeline completa em **< 90 s**, acha ≥ 8 concorrentes, e o mapa renderiza com dispersão visível. Cada score tem ≥ 1 evidência. O fetch de sites tem ≥ 60 % de sucesso e falha em silêncio no resto. Ao menos 2 lacunas estruturais detectadas em pelo menos 4 dos 5 casos.

**Fase 2 — Assinatura.** `BillingProvider` com implementação Paddle, checkout, portal, webhook idempotente, entitlements, gating server-side.
*Aceite:* assinatura em sandbox concede PRO em < 5 s do webhook; cancelar revoga no fim do período; reenviar o mesmo evento não duplica nada; checklist de paywall e fuzz 100 %. **Teste de portabilidade:** um `FakeProvider` implementando a mesma interface passa nos mesmos testes — prova que a troca de provedor é contida.

**Fase 3 — Camada paga.** `position_options` ancoradas em `structural_gaps`, `marketing_mix`, `plan_actions`, telas 4–7, PDF, regra da 13.2 na `RUBRIC`.
*Aceite:* toda opção referencia ≥ 1 `gap_id` real; quando não há espaço defensável, o app diz isso; o plano gera 10–16 ações em ≥ 5 dos 7 Ps. **Verificação de qualidade:** em 20 planos gerados, nenhuma ação sobre avaliações sugere incentivo, triagem por satisfação ou Yelp, e nenhuma adjetiva concorrente nomeado.

### Pós-MVP

**Fase 4 — Ciclo mensal.** Cron por fuso, reviews do próprio negócio, refresh de métricas dos concorrentes, Batch API, recomputar lacunas, gap, veredito, narrativa, digest, tela 8, `retention-sweep`.
*Aceite:* simulando 3 meses, a série de `gapScore` aparece corretamente e o veredito respeita as duas guardas; snapshots vencidos somem e as métricas permanecem; o digest chega às 8h do fuso do usuário.

**Fase 5 — Endurecimento.** Rate limits, Turnstile, tetos de custo, observabilidade (Sentry + `usage` do Claude por análise), CCPA/CPRA, CAN-SPAM, WCAG 2.1 AA auditado, E2E.
*Aceite:* painel mostra custo médio por análise; deletion request remove tudo em cascata no prazo; auditoria sem violação crítica; E2E free → checkout → pro verde.

**Fase 6 — Degraus de fonte.** Só conforme os gatilhos da 11.4, um por vez, cada um medido contra a `confidence` média antes e depois.

---

## 15. Testes

| Camada | O que testar | Como |
|---|---|---|
| Unit | `attrDistance`, `densityGrid`, `relevance`, `rivalry`, `detectGaps`, veredito | Vitest; bordas: scores iguais, 1 concorrente, 0 concorrentes, nenhum site acessível |
| Lacunas | `detectGaps` com fixtures de horário e types | Casos: todos fechados no sábado; um aberto; horário ausente em metade |
| Contrato LLM | schemas Zod contra fixtures reais | Fixtures gravadas; falha se o schema mudar |
| Qualidade do conselho | 20 planos não violam a tabela 13.2 | Regex determinístico sobre as ações geradas |
| Gating | `serializeAnalysis` FREE vs PRO | Snapshot recursivo; nenhuma chave bloqueada em nenhuma profundidade |
| Billing | cada evento, reenvio duplicado, `FakeProvider` | Payloads fixos, sem rede |
| Retenção | expiração de 30 dias | Relógio falso |
| Integração | pipeline com Places e Claude mockados | MSW |
| E2E | free → paywall → checkout sandbox → pro | Playwright |

---

## 16. Riscos e decisões

| Risco | Impacto | Mitigação |
|---|---|---|
| **FieldMask da busca não devolver os campos esperados** | premissa central de custo cai | Verificar na doc vigente **antes da Fase 1**; fallback é Details só nos top-12 |
| **Custo dominante agora é o LLM** | margem no free | Caching agressivo da rubrica, prompt enxuto, teto mensal, Turnstile. A alavanca é sua, não de terceiro |
| **Sinal parcial em `speed`, `relationship`, `modernity`** | mapa menos rico em 3 eixos | `confidence` visível na interface; degraus 3–5 da escada de fontes com gatilho medido |
| **Site do concorrente inacessível ou JS-only** | perde o declared benefit | Falha em silêncio, `confidence` menor; ≥ 60 % de sucesso é o critério de aceite |
| **Reembolso e taxa de MoR de venda direta** | prejuízo por custo marginal | Não usar ClickBank/BuyGoods/Digistore24 — ver 10.3 |
| **Payout do MoR para PJ brasileira** | bloqueio de recebimento | Confirmar com o provedor **antes** da Fase 2 |
| **Enquadramento fiscal da exportação de serviço** | passivo tributário | Contador antes do lançamento; ver 10.6 |
| **Ação sobre avaliações mal escrita** | conselho que prejudica o cliente (perfil derrubado, página filtrada) | Tabela 13.2 na rubrica + verificação na Fase 3 |
| **Difamação** ao pontuar concorrente nomeado | jurídico | Só posição relativa, lacuna com número, citação atribuída |
| **Alucinação em score** | perda de confiança | Evidência obrigatória, `confidence` visível, disclaimer de estimativa, canal de correção |
| **Poucos reviews no cliente** | medição mensal vira ruído | Guarda de 5 reviews e `INSUFFICIENT_DATA` |
| **Redes nacionais dominam o mapa** | concorrente relevante some | `is_chain`, peso menor na rivalidade e massa 0,6 |
| **ADA / WCAG** | demanda judicial | AA como requisito da Fase 5 |

### Decisões em aberto

| # | Decisão | Default sugerido |
|---|---|---|
| 1 | Provedor de pagamento | Paddle (MoR); Lemon Squeezy como alternativa |
| 2 | Programa de afiliados | Rewardful ou FirstPromoter, desacoplado do MoR — só depois do MVP |
| 3 | Preço | $49/mo · $470/yr |
| 4 | Trial | 7 dias |
| 5 | Modelo Claude nos steps de extração | `claude-opus-5` |
| 6 | Nome do produto | codinome — validar USPTO e `.com` |
| 7 | Limite de negócios no plano Pro | 3 |
| 8 | Enquadramento fiscal no Brasil | pergunta para o contador, não para o código |

---

## 17. Variáveis de ambiente

```bash
# App
APP_URL=
AUTH_SECRET=
DATABASE_URL=

# Anthropic
ANTHROPIC_API_KEY=

# Google — restringir por IP do servidor; NUNCA expor ao cliente
GOOGLE_MAPS_API_KEY=

# Billing (MoR) — provider trocável
BILLING_PROVIDER=PADDLE
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRICE_MONTHLY=
PADDLE_PRICE_ANNUAL=

# E-mail
RESEND_API_KEY=
MAIL_FROM=
MAIL_PHYSICAL_ADDRESS=            # exigido pelo CAN-SPAM

# Infra
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# Guardrails de custo
MAX_COMPETITORS_FREE=25
MAX_COMPETITORS_PRO=60
MAX_SITE_FETCHES=12
MAX_MONTHLY_FREE_ANALYSES=500
```

## 18. Guardrail de custo

```ts
const cost =
    autocompleteSessions * PRICE_AUTOCOMPLETE
  + placeDetailsCalls    * PRICE_PLACE_DETAILS
  + textSearchCalls      * PRICE_TEXT_SEARCH_PRO
  + (usage.input_tokens                / 1e6) * PRICE_IN
  + (usage.cache_read_input_tokens     / 1e6) * PRICE_IN * 0.1
  + (usage.cache_creation_input_tokens / 1e6) * PRICE_IN * 1.25
  + (usage.output_tokens               / 1e6) * PRICE_OUT;
// fetch de site não entra: custo zero
```

Alerte quando o custo médio por análise passar de um teto configurável, e corte o free ao atingir `MAX_MONTHLY_FREE_ANALYSES`.
