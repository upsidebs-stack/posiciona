# Briefing de abertura — cole isto na primeira mensagem para o Claude Sonnet 5

Você vai implementar o app **Posiciona**: um mapa perceptual de posicionamento competitivo para local service businesses nos Estados Unidos.

**Primeira tarefa, antes de qualquer outra coisa:** os arquivos podem estar todos soltos na raiz. Organize-os — mova `rubric.md`, `attributes.ts` e `gaps.ts` para `seed/src/domain/`, e `.env.example` para `seed/`. O dono do produto não é programador e não deve precisar criar subpastas na mão.

**Sobre quem está do outro lado:** ele não sabe programar. Não peça para editar arquivo, rodar comando no terminal, ou interpretar log. Quando precisar de algo dele, peça em português claro e diga exatamente onde clicar. Quando terminar uma fase, mostre a prova rodando — não diga apenas que terminou. Se um erro exigir decisão de negócio, apresente as opções com uma recomendação.

Este repositório já contém:

| arquivo | o que é |
|---|---|
| `PLANO.md` | a especificação completa. Leia inteira antes da primeira linha de código |
| `DECISIONS.md` | defaults já escolhidos, perguntas em aberto, e **três verificações a fazer antes de codar** |
| `seed/src/domain/rubric.md` | a rubrica fixa que vai no `system` de toda chamada ao Claude, com `cache_control`. Use como está |
| `seed/src/domain/attributes.ts` | os 8 atributos canônicos. Copie para `src/domain/` |
| `seed/src/domain/gaps.ts` | o detector de lacunas estruturais, determinístico. Copie e escreva os testes dele primeiro |
| `seed/.env.example` | variáveis de ambiente |

## Contexto que muda tudo

**Clientes nos EUA. Entidade e faturamento no Brasil.** Toda superfície de produto — interface, e-mails, prompts, conteúdo gerado, mensagens de erro — é em **inglês americano**, USD, milhas, datas americanas. Identificadores de código em inglês. O `PLANO.md` e o `DECISIONS.md` estão em português porque são lidos pelo dono do produto; nada deles vaza para a interface.

**O MVP são as Fases 0 a 3.** Um único fornecedor externo de dados — Google Places API (New) — mais fetch HTTP do site dos concorrentes. Yelp, Reddit e provedores pagos de review estão **fora**, com gatilhos na seção 11.4 para quando entrarem. Não antecipe nenhum.

## Faça isto antes de escrever código

`DECISIONS.md` tem três verificações. A **V1** é a mais importante: confirme na documentação vigente se a **busca** da Places API (New) devolve `rating`, `userRatingCount`, `priceLevel`, `types`, `websiteUri` e `regularOpeningHours` via `X-Goog-FieldMask`, e em qual SKU. Toda a economia do MVP depende disso. Se não devolver, o fallback é `Place Details` apenas nos **top-12** por relevância, nunca nos 25. Reporte o que encontrou antes de seguir.

## Regras de trabalho

1. Implemente **na ordem das Fases** (seção 14 do `PLANO.md`). Cada fase tem critério de aceite. Não comece a seguinte sem que o anterior passe **rodando**, não por inspeção.
2. Ao final de cada fase reporte: o que passou, o que não passou, o que ficou de fora. Se algo falhou, mostre a saída do erro.
3. Toda vez que seguir um default sem confirmação, ou a realidade contradisser o plano, **escreva uma linha em `DECISIONS.md`**.
4. Não invente escopo além do plano. Se achar um problema real na especificação, diga em uma ou duas frases e siga com a suposição declarada.

## Invariantes — não quebre nenhuma

- **Paywall na serialização, no servidor.** Usuário free nunca recebe o que não pode ver, incluindo as `structural_gaps` (só a contagem). O fuzz test da seção 9 tem que existir e passar.
- **Evidência obrigatória.** Score de atributo sem `evidence[]` não é gravado no banco.
- **Lacuna ancora a posição.** Toda `position_option` referencia ao menos uma `structural_gap` real (`gap_ids` não vazio). Sem lacuna não há opção — o app diz que não encontrou espaço defensável em vez de inventar três.
- **Os 8 atributos são fixos.** A IA escolhe rótulos por categoria, nunca cria atributos.
- **O mapa não se move com volume de review.** Sete das oito notas vêm de dado estrutural — preço, horário, tipos, site, escopo. Só `reliability` toca em review, e ali o que pesa é a **nota média**, não a contagem. Isso é propriedade de produto (seção 3.1), não detalhe: se em algum momento o código fizer contagem de review mexer na posição, você introduziu um bug.
- **Ação sobre avaliações** (seção 13.2): pedir a todos, sem incentivo, sem triagem por satisfação; Google sim, Yelp não; nunca escrever o texto de uma avaliação; nunca adjetivar concorrente nomeado.
- **Billing atrás da interface `BillingProvider`.** Nenhuma regra de negócio conhece o provedor. Um `FakeProvider` tem que passar nos mesmos testes.
- **Webhook** idempotente por id do evento, corpo cru (`req.text()`, `runtime = 'nodejs'`). Acesso nunca é concedido na `returnUrl`.
- **Retenção:** conteúdo do Google Places expira em 30 dias por job diário. `review_metrics` e `structural_gaps` são derivados e não expiram.
- **Claude:** `claude-opus-5`, `thinking: { type: 'adaptive' }`, saída estruturada via `messages.parse()` + `zodOutputFormat`. A rubrica vai no `system` com `cache_control` e **nunca** contém data, UUID ou nome de empresa — qualquer byte variável derruba o cache. Confira `usage.cache_read_input_tokens > 0` em chamadas repetidas.
- **Hospedagem: Netlify, não Vercel.** O plano Hobby da Vercel proíbe uso comercial.

## Comece por

A verificação V1. Depois a Fase 0. Antes de codar a Fase 0, confirme comigo: banco (Neon ou Supabase), chave do Google Places, e conta sandbox do Paddle.
