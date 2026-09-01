# Comece aqui

**Este arquivo é para você, não para a IA.** Os outros arquivos da pasta são para ela.

Você não precisa saber programar. Precisa saber o que clicar, quando, e como perceber se está indo bem. É isso que este roteiro faz.

Não tente fazer tudo num dia. Isso são várias sessões ao longo de uma ou duas semanas.

---

## O que cada arquivo é

| arquivo | para quem | o que é |
|---|---|---|
| **COMECE-AQUI.md** | **você** | este roteiro |
| BRIEFING-SONNET.md | a IA | o texto que você cola na primeira mensagem |
| PLANO.md | a IA | a especificação completa. Você não precisa ler |
| DECISIONS.md | os dois | decisões já tomadas e perguntas em aberto. Vale dar uma olhada |
| README.md | os dois | resumo do pacote |
| rubric.md · attributes.ts · gaps.ts · .env.example | a IA | código e instruções prontos |

---

## Passo 1 — Criar a pasta

No Windows, dentro de Documentos, crie uma pasta chamada `posiciona`.

Baixe os oito arquivos desta conversa e coloque **todos soltos** dentro dela. Não se preocupe em criar subpastas — a IA organiza isso sozinha no primeiro passo.

> Se o arquivo `.env.example` não aparecer, ative "Itens ocultos" na aba Exibir do Explorador de Arquivos. Arquivos que começam com ponto ficam escondidos por padrão no Windows.

---

## Passo 2 — Abrir uma sessão nova nessa pasta

Nesta conversa atual você está sem pasta escolhida. Você precisa de uma **sessão nova**, apontada para a pasta `posiciona`.

No app, comece uma conversa nova e escolha a pasta `Documentos\posiciona` quando ele perguntar onde trabalhar.

**Guarde o link da página de especificação.** Você vai querer voltar nela quando quiser lembrar o que o produto faz sem ter que ler o `PLANO.md`.

---

## Passo 3 — Trocar o modelo para Sonnet

No seletor de modelo do app, escolha **Sonnet 5**. O plano foi escrito para ele.

> Se em algum momento o Sonnet travar no mesmo problema três vezes seguidas, troque para **Opus 5** só naquele trecho e depois volte. Opus lida melhor com ambiguidade, custa mais. Não é derrota, é ferramenta certa para o momento.

---

## Passo 4 — Colar o briefing

Abra o `BRIEFING-SONNET.md`, copie **todo** o conteúdo, e cole como primeira mensagem.

Ele vai:

1. Ler o `PLANO.md` inteiro.
2. Fazer a **verificação V1** — confirmar uma coisa sobre a API do Google que define o custo do app inteiro. Ele vai te contar o que achou.
3. Te perguntar três coisas antes de começar a Fase 0.

Quando ele perguntar, responda o que está no Passo 5.

---

## Passo 5 — As contas que você precisa criar

**Não crie todas de uma vez.** Crie conforme a fase pedir. As três primeiras são grátis e não pedem cartão.

### Para a Fase 0 — tudo grátis, sem cartão

| conta | onde | para quê |
|---|---|---|
| **GitHub** | github.com | onde o código fica guardado. É o "Google Drive de programador" |
| **Neon** | neon.tech | o banco de dados. Entre com o GitHub. Crie um projeto e copie o texto que começa com `postgres://` |
| **Netlify** | netlify.com | onde o site fica no ar. Entre com o GitHub |
| **Resend** | resend.com | envio de e-mail |

Quando o Sonnet perguntar "Neon ou Supabase?", responda **Neon**.

### Para a Fase 1 — estas pedem cartão

| conta | onde | custo real |
|---|---|---|
| **Anthropic** | console.anthropic.com | Coloque **$20** de crédito. Dá para umas 40 análises de teste |
| **Google Cloud** | console.cloud.google.com | Precisa de cartão, mas tem franquia grátis para ~1.000 análises por mês. Você provavelmente não vai pagar nada no começo |

No Google: crie um projeto, procure **Places API (New)** e ative, depois vá em Credenciais e crie uma chave de API. Se travar, cole o erro no chat e peça ajuda — é um passo chato mesmo.

### Para a Fase 2 — só quando for cobrar

**Paddle** (paddle.com). Crie a conta em modo *sandbox* primeiro, que é o modo de teste sem dinheiro real.

---

## Passo 6 — Sobre as chaves de API

Uma "chave de API" é uma senha longa que dá acesso ao seu crédito. Parece com `sk-ant-api03-xK9...`.

Três regras:

1. **Nunca cole uma chave num chat público, num print, ou no GitHub.** Quem tiver a chave gasta o seu dinheiro.
2. Elas vão num arquivo chamado `.env` dentro da pasta do projeto. A IA cria esse arquivo e te diz onde colar cada uma.
3. Se você achar que vazou uma, entre no site que gerou e clique em revogar. Leva dez segundos e resolve.

---

## Passo 7 — Como saber se está indo bem

O plano tem seis fases. Cada uma tem um **critério de aceite** — um teste concreto de "funcionou ou não". Você não precisa entender o teste. Precisa cobrar que ele tenha rodado.

No fim de cada fase, pergunte exatamente isto:

> Terminou a fase? Rodou o critério de aceite de verdade, não por inspeção? Me mostra a saída. O que passou, o que não passou, o que ficou de fora.

**Isso é a coisa mais importante deste roteiro.** IA tem tendência a dizer que terminou. A pergunta acima força a mostrar a prova.

O que você deve ver ao fim de cada fase:

| fase | o que você consegue ver com os próprios olhos |
|---|---|
| 0 | Um site no ar, feio, com uma tela de login que funciona |
| 1 | Você digita um dentista real e sai um mapa com concorrentes reais |
| 2 | Você assina em modo de teste e o conteúdo bloqueado aparece |
| 3 | Aparecem as lacunas do mercado e o plano de 12 meses |
| 4 | Chega um e-mail mensal dizendo se é para continuar ou reposicionar |
| 5 | Acabamento: limites de uso, páginas legais, acessibilidade |

**As fases 0 a 3 são o MVP.** Depois da 3 você já tem algo para mostrar a um dentista de verdade.

---

## Passo 8 — O que fazer quando travar

Vai travar. É normal, não é você.

- **Erro na tela:** copie o texto do erro inteiro e cole no chat. Não resuma, não descreva. Cole.
- **Ele diz que terminou mas nada mudou:** peça `me mostra rodando`.
- **Mesmo problema três vezes:** troque para Opus 5 naquele trecho.
- **Uma decisão que você não sabe responder:** olhe o `DECISIONS.md`. Se não estiver lá, diga `qual você recomenda e por quê?` e siga a recomendação.
- **Perdeu o fio:** comece uma sessão nova na mesma pasta e diga `leia PLANO.md e DECISIONS.md e me diga em que ponto estamos`.

---

## O que esperar de tempo e dinheiro

**Tempo.** Fases 0 a 3 levam de uma a três semanas de trabalho intercalado. Não é um fim de semana. A Fase 0 é a mais chata e a que menos mostra resultado — é criar contas e configurar. Passe por ela sabendo disso.

**Dinheiro até o MVP no ar:** entre **$10 e $40** de crédito na Anthropic, mais uns $12 por ano se quiser um domínio próprio. O resto cabe nos planos gratuitos.

---

## Duas coisas honestas

**Você consegue fazer isso.** Não porque é fácil, mas porque a parte difícil — escrever o código — não é sua. A sua parte é criar contas, colar chaves, responder perguntas e cobrar a prova de que funcionou.

**E existe um atalho legítimo.** Se a Fase 0 te desgastar, contratar um programador por dois ou três dias só para deixar o esqueleto no ar e as contas configuradas é dinheiro bem gasto. Da Fase 1 em diante você toca sozinho com a IA sem problema. Não é desistir — é escolher onde gastar sua paciência.

---

## Quando voltar aqui

Guarde o link da página de especificação. Volte a uma conversa com o **Opus 5** quando:

- precisar decidir algo de negócio — preço, nome, se entra afiliado;
- o Sonnet propuser mudar algo estrutural do plano e você quiser uma segunda opinião;
- quiser adicionar uma fonte nova (Yelp, Reddit) e não souber se já é hora;
- o primeiro cliente real reagir de um jeito que você não esperava.

Essa última é a mais importante. O maior risco deste produto não é técnico — é descobrir se um dentista paga por discernimento ou só por telefone tocando. Quando você tiver a primeira resposta real sobre isso, ela vale mais que tudo neste plano.
