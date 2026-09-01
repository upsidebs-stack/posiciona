# Posiciona — pacote de entrega

Tudo o que o Claude Sonnet 5 precisa para construir o app.

## Como usar

**Se você é o dono do produto e não programa:** abra o **`COMECE-AQUI.md`**. Ele é o roteiro, passo a passo, do que clicar e quando. O resto deste README é resumo técnico.

**Se você é o agente implementador:** leia o `BRIEFING-SONNET.md`, depois o `PLANO.md` inteiro.

Fluxo curto: colocar todos os arquivos numa pasta → abrir uma sessão do Claude Code nela com o Sonnet 5 → colar o `BRIEFING-SONNET.md` como primeira mensagem.

## O que tem aqui

```
COMECE-AQUI.md          <- PARA O DONO DO PRODUTO: o roteiro humano
BRIEFING-SONNET.md      <- PARA A IA: cole isto na primeira mensagem
PLANO.md                <- a especificação completa, 18 seções
DECISIONS.md            <- defaults escolhidos, perguntas abertas, 3 verificações pré-código
README.md               <- este arquivo
seed/
  .env.example
  src/domain/
    rubric.md           <- a rubrica fixa do LLM (en-US, ~3k tokens, vai no system com cache)
    attributes.ts       <- os 8 atributos canônicos
    gaps.ts             <- detector de lacunas, determinístico, compilado e testado
```

O `seed/` é código pronto para copiar, não pseudocódigo. São os três arquivos onde uma especificação em prosa costuma ser mal interpretada, então já vêm escritos.

**Os arquivos podem chegar todos soltos na raiz.** A primeira tarefa do agente é organizá-los na estrutura acima — o dono do produto não deve precisar criar subpastas na mão.

**Se o `.env.example` se perder no caminho** (é um arquivo oculto no Windows e alguns navegadores renomeiam), não tem problema: o conteúdo dele está na seção 17 do `PLANO.md` e o agente recria.

## O produto em cinco linhas

Um dentista digita nome, três frases, endereço e raio. Em menos de 90 segundos ele vê um mapa com os concorrentes que de fato disputam o cliente dele, posicionados em oito atributos. No grátis aparecem três, mais o número dos ocultos. Assinando, ele vê todos, mais as lacunas estruturais do mercado — *"nenhum dos 23 dentistas num raio de 5 milhas abre no sábado"* —, três posições alternativas ancoradas nessas lacunas, e um plano de 12 meses nos 7 Ps. Todo mês o app remede onde ele chegou e diz se é para continuar ou reposicionar.

## Três coisas que não são óbvias

**O mapa não se move com volume de avaliação.** Sete das oito notas vêm de dado estrutural: preço, horário, tipos de serviço, site, escopo. Só `reliability` toca em review, e ali pesa a nota média, não a contagem. Conseguir 200 avaliações e continuar fechando às 17h te deixa exatamente onde você estava. Isso é proposital — é o que separa este produto da indústria de geração de review, e é argumento de venda.

**As recomendações não saem de avaliação.** Saem das lacunas estruturais, que são calculadas de campo objetivo e verificáveis pelo usuário em dois cliques. Se nenhuma lacuna defensável existir, o app diz isso em vez de inventar três opções.

**O MVP tem um fornecedor de dados só.** Google Places, mais fetch do site dos concorrentes, que é grátis. Yelp e Reddit entram depois, com gatilho medido. Começar estreito não cria dívida porque cada fonte nova entra atrás da mesma interface de evidência.

## Custo para chegar ao ar

Entre **$10 e $40**, mais o domínio. Netlify, Neon, Inngest, Upstash, Resend, Turnstile e Sentry cobrem o MVP no free tier; Paddle só cobra quando você vende; o Google Places tem franquia para cerca de 1.000 diagnósticos por mês. O único custo real é a Claude API, ~$0,42 por diagnóstico.

## O risco que importa

Não é técnico. Todos os produtos vizinhos — BrightLocal, Birdeye, Podium, NiceJob — vendem resultado visível e contável: mais reviews, posição melhor no ranking local. Este vende discernimento. Para um encanador que quer o telefone tocando, é uma venda mais difícil. Quem responde a isso é a primeira leva de clientes, não a arquitetura. É por isso que todo insight sai grudado numa ação concreta.
