# Especificação — Meu Inglês

> App Android **pessoal** para levar meu inglês do intermediário ao avançado.
> Uso individual: sem login, sem servidor, dados no aparelho, IA configurada por mim.

## Índice

0. Como usar este documento
1. Visão e princípios
2. Stack e bibliotecas
3. Arquitetura e pastas
4. Design system
5. Navegação
6. Mapa de gestos
7. Cards (flashcards)
8. Telas em detalhe
9. Central de Notificações
10. Camada de IA
11. Modelo de dados
12. Regras de estudo
13. Qualidade, acessibilidade e estados
14. Fases de construção e critérios de pronto
15. Fora do escopo

---

## 0. Como usar este documento

- **Para quem for implementar:** antes de cada fase, leia a seção da fase (14) e as seções que ela cita. Não implemente nada de fases futuras.
- Se algo aqui estiver ambíguo, conflitar com a realidade técnica ou tiver uma alternativa claramente melhor, **pergunte ou proponha antes de implementar**, explicando o porquê.
- **Nunca mostre botões que ainda não funcionam** (nada de "em breve" espalhado). Funções de fases futuras simplesmente não aparecem até existirem. Única exceção: as 4 abas existem desde a Fase 1, com um estado vazio temporário.
- Todo texto da interface em **português do Brasil**. Conteúdo de estudo em **inglês americano** por padrão (configurável).
- Código (variáveis, funções, arquivos, rotas) em **inglês**.

---

## 1. Visão e princípios

### 1.1 O ciclo do app

Tudo gira em torno de um ciclo que se alimenta sozinho:

```
Ler / ouvir  →  salvar termo  →  card  →  revisar (FSRS)
     ↑                                        ↓
erros viram cards e quiz  ←  correção  ←  produzir (escrever / falar)
```

- O que eu leio vira card.
- Os cards que estou revisando aparecem nos desafios de produção.
- Os erros que cometo viram cards de erro e questões de quiz.

### 1.2 Princípios de produto

1. **Rápido.** Qualquer ação principal em no máximo 2 toques a partir de Hoje. Abrir o app e começar a revisar em menos de 3 segundos.
2. **Uma mão.** Ações principais na metade inferior da tela.
3. **Calmo, sem culpa.** Sem streak punitivo, sem sons, sem confete. Linguagem gentil e direta.
4. **Gestos aceleram, nunca escondem.** Toda ação feita por gesto tem um botão visível equivalente.
5. **Pessoal.** A IA conhece meu perfil, meus erros e meu vocabulário.
6. **Privado.** Tudo fica no aparelho. Só as chamadas de IA saem.
7. **Offline primeiro.** Revisar cards, ler textos salvos e ver progresso funcionam sem internet.
8. **Prático acima de bonito, mas bonito.** Cada tela tem um propósito claro e uma ação principal óbvia.

---

## 2. Stack e bibliotecas

Instale sempre com `npx expo install` para manter versões compatíveis com o SDK.
**Não adicione bibliotecas fora desta lista sem justificar e pedir meu OK.**

| Função | Biblioteca | Fase |
|---|---|---|
| Base | Expo (SDK estável mais recente), TypeScript `strict`, Expo Router | 1 |
| Gestos e animação | `react-native-gesture-handler`, `react-native-reanimated` | 1 |
| Estado de UI | `zustand` | 1 |
| Banco local | `expo-sqlite` | 1 |
| Validação | `zod` | 1 |
| Chave segura | `expo-secure-store` | 1 |
| Ícones | `@expo/vector-icons` (conjunto Feather) | 1 |
| Testes | `jest-expo`, `@testing-library/react-native` | 1 |
| Bottom sheets | `@gorhom/bottom-sheet` | 2 |
| Repetição espaçada | `ts-fsrs` | 2 |
| Vibração | `expo-haptics` | 2 |
| Leitura em voz alta | `expo-speech` | 2 |
| Notificações locais | `expo-notifications` | 3 |
| Development build | `expo-dev-client` | 3 |
| Listas longas | `@shopify/flash-list` | 4 |
| Área de transferência | `expo-clipboard` | 4 |
| Diff de texto | `diff` | 5 |
| Backup | `expo-file-system`, `expo-sharing`, `expo-document-picker` | 6 |
| Reconhecimento de voz | `expo-speech-recognition` | 7 |
| Receber "Compartilhar" do Android | `expo-share-intent` | 7 |
| Widget na tela inicial | `react-native-android-widget` | 7 |
| Gravação de áudio | `expo-audio` | 8 |

### Expo Go × development build

- **Fases 1 e 2:** desenvolver no **Expo Go**.
- **A partir da Fase 3:** migrar para **development build**, porque notificações com ações, canais e módulos nativos das fases seguintes não funcionam bem (ou não funcionam) no Expo Go:
  1. `npx expo install expo-dev-client`
  2. `eas build --profile development --platform android`
  3. Instalar o APK gerado no celular e continuar usando `npx expo start`.
- Se qualquer módulo não funcionar no ambiente atual, **avise e explique o passo a passo**. Não contorne silenciosamente.

---

## 3. Arquitetura e pastas

```
app/                              # rotas (Expo Router), telas finas
  _layout.tsx                     # providers: tema, gesture root, bottom sheet, db
  (tabs)/_layout.tsx              # tab bar customizada com botão central +
  (tabs)/index.tsx                # Hoje
  (tabs)/read.tsx                 # Ler (biblioteca)
  (tabs)/practice.tsx             # Praticar (hub)
  (tabs)/progress.tsx             # Progresso
  capture.tsx                     # Captura rápida (sheet/modal)
  review.tsx                      # Sessão de revisão (tela cheia)
  reader/[id].tsx                 # Leitor
  practice/challenge.tsx          # Desafio do dia
  practice/journal.tsx            # Diário
  practice/correction/[id].tsx    # Tela de correção (compartilhada)
  practice/quiz.tsx               # Treino de erros
  practice/conversation.tsx       # Conversa
  practice/rehearsals/index.tsx   # Ensaios de situações
  practice/rehearsals/[id].tsx
  cards/index.tsx                 # Meus cartões
  cards/[id].tsx                  # Editar card/nota
  errors/[category].tsx           # Erros de uma categoria
  progress/weekly/[id].tsx        # Resumo semanal
  settings/index.tsx
  settings/notifications/index.tsx
  settings/notifications/[type].tsx
  settings/ai.tsx
  settings/profile.tsx            # Sobre mim
  settings/study.tsx
  settings/gestures.tsx
  settings/appearance.tsx
  settings/data.tsx
src/
  theme/            # tokens, ThemeProvider, useTheme
  components/ui/    # Button, IconButton, Chip, Card, Sheet, ListRow, SwipeRow, Toggle,
                    # Stepper, TimeField, WeekdayPicker, Segmented, EmptyState,
                    # ErrorState, Skeleton, Snackbar, ProgressBar, CoachMark
  components/       # componentes de domínio: FlashCard, RatingBar, DiffText,
                    # WordPopover, SessionStepList, CategoryChip...
  features/         # lógica por funcionalidade: capture, review, reader, journal,
                    # challenge, conversation, rehearsal, quiz, progress
  db/               # conexão, migrations, repositórios (um por tabela/agregado)
  srs/              # wrapper do ts-fsrs e montagem da fila do dia
  ai/               # client.ts, providers.ts, prompts/, schemas/, cache.ts, usage.ts
  notifications/    # channels.ts, scheduler.ts, content.ts, handlers.ts
  gestures/         # hooks reutilizáveis: useSwipeToRate, useLongPressMenu...
  stores/           # zustand
  lib/              # datas, tokenização de texto, ids, formatação
  i18n/strings.ts   # todos os textos da interface
```

Regras:
- Telas em `app/` só montam layout e chamam hooks de `features/`.
- Acesso ao banco **somente** por repositórios em `src/db/`. Nada de SQL em componentes.
- Chamadas de IA **somente** por `src/ai/client.ts`.
- Cores, espaçamentos, fontes e durações **somente** via tokens do tema. Nada de valores soltos.

---

## 4. Design system

### 4.1 Cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F7F6F3` | `#111113` | Fundo das telas |
| `surface` | `#FFFFFF` | `#1A1A1D` | Cards, sheets |
| `surfaceAlt` | `#EFEDE8` | `#232326` | Campos, áreas secundárias |
| `border` | `#E3E0DA` | `#2E2E33` | Divisores |
| `text` | `#1C1B19` | `#EDEDEF` | Texto principal |
| `textMuted` | `#6B6862` | `#A1A1A8` | Texto secundário |
| `primary` | `#3E63DD` | `#6E8BFF` | Ação principal, item ativo |
| `onPrimary` | `#FFFFFF` | `#0B0B0C` | Texto sobre `primary` |
| `rateAgain` | `#E5484D` | `#F2555A` | Errei |
| `rateHard` | `#F59E0B` | `#FFB224` | Difícil |
| `rateGood` | `#30A46C` | `#3DD68C` | Bom |
| `rateEasy` | `#8E4EC6` | `#B07EE8` | Fácil |
| `typeContext` | `#3E63DD` | `#6E8BFF` | Chip "Contexto" |
| `typeProduction` | `#12A594` | `#2EC8B5` | Chip "Produção" |
| `typeCloze` | `#D97706` | `#F5A524` | Chip "Lacuna" |
| `typeError` | `#D6409F` | `#E66AB8` | Chip "Erro" |
| `diffAdd` | `#30A46C` | `#3DD68C` | Texto adicionado na correção |
| `diffRemove` | `#E5484D` | `#F2555A` | Texto removido (riscado) |

- Tema segue o sistema por padrão; pode ser fixado em claro/escuro.
- Contraste mínimo AA para texto.
- Nunca use cor como único indicador: sempre com rótulo ou ícone.

### 4.2 Tipografia

Fonte do sistema (Roboto no Android). Escala:

| Token | Tamanho/altura | Peso | Uso |
|---|---|---|---|
| `display` | 32/40 | 700 | Números grandes do Progresso |
| `title` | 24/32 | 700 | Título de tela |
| `heading` | 19/26 | 600 | Título de seção/card |
| `cardMain` | 24/32 | 600 | Conteúdo principal do flashcard |
| `body` | 17/24 | 400 | Texto padrão |
| `reading` | 19/30 | 400 | Leitor (ajustável 16–26) |
| `label` | 15/20 | 500 | Botões, chips |
| `caption` | 13/18 | 400 | Metadados |

Suportar escala de fonte do sistema até 130% sem quebrar layout. Nenhum texto menor que 13.

### 4.3 Espaçamento, formas e sombra

- Espaçamento: 4, 8, 12, 16, 20, 24, 32, 40. Margem lateral das telas: 16.
- Raios: 8 (chips, campos), 14 (botões, linhas), 24 (flashcard, sheets).
- Sombra: só no flashcard e no botão +; suave (elevation 2–4).
- Alvo de toque mínimo: 48×48 dp.

### 4.4 Movimento e vibração

- Durações: 150 ms (micro), 220 ms (transições), 280 ms (virar card).
- Arraste e soltar: mola (damping ~18, stiffness ~180).
- Respeitar "reduzir movimento" do sistema (`useReducedMotion`): trocar animações por fade de 150 ms.
- Vibração (`expo-haptics`), sempre sutil e desligável em Configurações:
  - leve ao virar card e ao cruzar o limite de um gesto;
  - média ao confirmar uma avaliação;
  - "sucesso" ao concluir a sessão do dia.

### 4.5 Componentes base

- **Button:** variantes `primary` (preenchido), `secondary` (tonal), `ghost`, `danger`. Alturas 56 (ação principal da tela) e 48.
- **Chip:** pílula com ícone opcional; versão selecionável.
- **Sheet:** bottom sheet com alça, fecha deslizando para baixo, pontos de parada 50% e 90%.
- **Snackbar:** aparece acima da tab bar por 5 s, com uma ação (ex.: "Desfazer").
- **SwipeRow:** linha de lista com ações reveladas ao deslizar (seção 6).
- **EmptyState:** ícone + 1 frase + 1 ação. Ex.: "Nenhum texto ainda. Cole algo que você queira ler."
- **CoachMark:** sobreposição com animação de mão mostrando um gesto, 1 frase, botão "Entendi".

### 4.6 Tom dos textos

Curto, gentil, em "você". Exemplos:
- "Feito por hoje. Até amanhã."
- "Você ficou uns dias fora. Separei 40 cartões para retomar com calma."
- Erro de IA: "Não consegui falar com a IA agora. Seus dados estão salvos. Tentar de novo?"

---

## 5. Navegação

### 5.1 Tab bar

```
[ Hoje ]  [ Ler ]  [  +  ]  [ Praticar ]  [ Progresso ]
```

- Altura 64 + área segura. Ícones Feather: `sun`, `book-open`, `plus`, `edit-3`, `bar-chart-2`.
- O **+** é um círculo de 56 dp em `primary`, levemente elevado acima da barra. Abre a Captura rápida.
- Item ativo: ícone e rótulo em `primary`; inativos em `textMuted`.
- A tab bar some em fluxos de tela cheia (Revisão, Leitor, Diário, Desafio, Conversa, Correção).

### 5.2 Cabeçalhos

- Telas das abas: título grande à esquerda. Em Hoje e Progresso, ícone de engrenagem à direita abre Configurações.
- Telas internas: botão voltar, título central, menu ⋯ à direita quando houver ações.

### 5.3 Links internos (deep links)

Esquema `meuingles://`, usado por notificações e pelo widget:

| Link | Destino |
|---|---|
| `meuingles://review` | Revisão |
| `meuingles://review?minimal=1` | Revisão no modo "dia mínimo" |
| `meuingles://practice/challenge` | Desafio do dia |
| `meuingles://practice/journal` | Diário |
| `meuingles://capture?mode=think` | Captura com o prompt "Pense em inglês" |
| `meuingles://progress/weekly/latest` | Último resumo semanal |
| `meuingles://practice/rehearsals/{id}` | Ensaio de uma situação |

Observação: `progress/weekly/latest` usa a mesma rota `progress/weekly/[id].tsx`; o valor `latest` abre o resumo mais recente.

---

## 6. Mapa de gestos

Regras gerais:
- **Toda ação por gesto tem um equivalente visível** (botão, menu ⋯ ou item de menu).
- Gestos horizontais em áreas que rolam verticalmente usam `activeOffsetX` + `failOffsetY` para não brigar com a rolagem.
- Cada tela com gestos importantes mostra um **CoachMark** na primeira visita. Revisitável em Configurações › Gestos › "Ver guias de novo".

### 6.1 Global

| Gesto | Ação | Alternativa visível |
|---|---|---|
| Toque no **+** | Abre Captura rápida com teclado aberto | — |
| Segurar o **+** *(Fase 7)* | Captura por voz: segure e fale, solte para enviar; deslize ↑ para travar a gravação; deslize ← para cancelar | Botão de microfone dentro da Captura |
| Deslizar ↓ num sheet | Fecha (pergunta "Descartar?" se houver texto digitado) | Botão X |
| Voltar do Android | Fecha sheet aberto ou volta uma tela | Botão voltar |

### 6.2 Revisão

| Gesto | Ação | Alternativa visível |
|---|---|---|
| Toque no card | Vira o card | Botão "Mostrar resposta" |
| Duplo toque no card | Ouve o inglês do card | Ícone 🔊 no card |
| Segurar o card | Menu rápido: Editar, Ouvir devagar, Explicar mais (IA), Suspender, Excluir, Ver origem | Menu ⋯ no topo |
| Deslizar → (após virar) | **Bom** | Botão Bom |
| Deslizar ← (após virar) | **Errei** | Botão Errei |
| Deslizar ↑ (após virar) | **Fácil** | Botão Fácil |
| Deslizar ↓ (após virar) | **Difícil** | Botão Difícil |
| — | Desfazer última avaliação | Snackbar "Desfazer" (5 s) e item no menu ⋯ |

Comportamento do arraste:
- O card acompanha o dedo e inclina até 12°.
- Uma sobreposição na cor da avaliação mostra o nome e o próximo intervalo ("Bom · 3 dias"), com opacidade proporcional à distância.
- **Limite:** 35% da largura (horizontal) ou da altura (vertical), ou velocidade acima de 800 px/s. Ao cruzar, vibração leve.
- Soltar antes do limite: o card volta com mola.
- Antes de virar, arrastar **não avalia**: o card balança de leve e aparece a dica "Vire o card primeiro".
- **Modo canhoto** (Configurações › Gestos): espelha esquerda/direita.

### 6.3 Leitor

| Gesto | Ação | Alternativa visível |
|---|---|---|
| Toque numa palavra | Painel com significado naquele contexto | — |
| Segurar e arrastar sobre palavras | Seleciona uma expressão e abre o painel para ela | — |
| Duplo toque numa frase | Mostra a tradução da frase logo abaixo (toque de novo esconde) | Botão "Traduzir frase" no painel |
| Deslizar ← num parágrafo | Mostra/oculta a tradução do parágrafo | Menu ⋯ › "Mostrar traduções" |
| Deslizar → num parágrafo | Ouve o parágrafo | Botão ▶ no topo |
| Pinça | Ajusta o tamanho da fonte | Menu ⋯ › A− / A+ |

### 6.4 Listas (biblioteca, cartões, erros, ensaios)

| Gesto | Ação | Alternativa visível |
|---|---|---|
| Deslizar ← | Excluir (fundo `rateAgain`), com Snackbar "Desfazer" | Menu ⋯ do item |
| Deslizar → | Ação secundária da lista: Arquivar (biblioteca), Suspender (cartões), Treinar (erros) | Menu ⋯ do item |
| Segurar | Entra em seleção múltipla | Menu ⋯ › "Selecionar" |
| Puxar ↓ | Atualizar | — |

### 6.5 Outras telas

| Tela | Gesto | Ação | Alternativa |
|---|---|---|---|
| Hoje | Puxar ↓ | Recalcula a sessão do dia | — |
| Hoje | Toque numa etapa | Vai direto para ela | — |
| Correção | Toque numa alteração | Abre a explicação | — |
| Correção | Segurar uma alteração | "Discordo": marca como não-erro (não entra no caderno) | Botão no painel de explicação |
| Central de Notificações | Arrastar pela alça ≡ | Reordena a prioridade dos tipos | Menu do item › Mover para cima/baixo |

---

## 7. Cards (flashcards)

### 7.1 Nota × card

- **Nota** = o conteúdo que salvei (um termo, uma frase, um erro).
- **Card** = uma forma de praticar a nota, com sua própria agenda FSRS.
- Uma nota gera 1 ou 2 cards. Cards da mesma nota (irmãos) **nunca aparecem no mesmo dia**.

### 7.2 Tipos de card

| Tipo | Chip | Frente | Verso | Origem |
|---|---|---|---|---|
| **Contexto** (reconhecer) | `typeContext` | Frase em inglês com o termo realçado | Significado em PT naquele contexto (destaque), explicação curta, IPA + 🔊, um exemplo extra EN (com PT) | Termo salvo no Leitor ou na Captura |
| **Produção** (PT → EN) | `typeProduction` | "Como você diria:" + frase/intenção em PT, com dica de registro (informal, formal) | Forma mais natural em inglês (destaque) + 1–2 alternativas com registro + observação | "Como eu digo isso?" e, se ativado, também a partir de notas de Contexto |
| **Lacuna** | `typeCloze` | Frase em inglês com `____` + dica em PT entre parênteses | Frase completa com o termo realçado + 🔊 | Gerada junto de notas de Contexto (padrão: ligado para expressões de 2+ palavras) |
| **Erro** | `typeError` | "Encontre e corrija:" + minha frase original, sem marcações | Frase corrigida com diff, chip da categoria, regra em 1–2 linhas, um exemplo correto extra | Erros salvos do Diário, Desafio ou Conversa |

**Responder digitando** (opcional, menu ⋯ da revisão): em cards de Produção e Erro, digito a resposta antes de virar. No verso aparece a comparação com a resposta esperada (diff local, sem chamar a IA).

### 7.3 Anatomia visual

```
┌──────────────────────────────────────┐
│ [Contexto]                        🔊 │  ← chip do tipo · áudio
│                                      │
│   She finally came to terms          │  ← conteúdo principal (cardMain)
│   with the decision.                 │     termo realçado em primary
│                                      │
│                                      │
│ Do leitor · The Atlantic · 12 out    │  ← origem (caption, textMuted)
│          Toque para virar            │  ← some após 20 revisões
└──────────────────────────────────────┘
```

- Container `surface`, raio 24, padding 24, sombra suave. Largura = tela − 32. Altura ≈ 62% da tela, centralizado acima da barra de avaliação.
- Conteúdo principal em `cardMain`. Se passar de 3 linhas, reduz para 20/28; se ainda não couber, rolagem interna.
- **Verso:** resposta principal no topo em destaque, divisor fino, detalhes em `body`. Mais de 4 linhas de detalhe → "ver mais". Botão de texto "Explicar mais (IA)": o resultado fica salvo na nota para as próximas vezes.
- **Virar:** rotação 3D no eixo Y, 280 ms. Com "reduzir movimento": fade de 150 ms.

### 7.4 Barra de avaliação

```
┌─────────┬─────────┬─────────┬─────────┐
│  Errei  │ Difícil │   Bom   │  Fácil  │
│ <10 min │   1 d   │   3 d   │   8 d   │
└─────────┴─────────┴─────────┴─────────┘
```

- 4 botões iguais, altura 56, nas cores `rate*`. "Bom" preenchido; os outros tonais.
- Intervalo previsto calculado com o `ts-fsrs` (`repeat`) para o card atual.
- Antes de virar, no lugar da barra: um único botão largo "Mostrar resposta".

### 7.5 Criar e editar

- Editor com os campos do tipo, **prévia ao vivo** do card (toque alterna frente/verso).
- "Completar com IA" preenche só os campos vazios.
- Validação: frente e verso não podem ficar vazios.
- **Duplicatas:** ao salvar, procurar nota com o mesmo termo (lemma). Oferecer "Juntar à existente" ou "Criar mesmo assim".

### 7.6 Estados

Novo, Aprendendo, Revisão, Reaprendendo (do FSRS) + Suspenso. Filtráveis em Meus cartões.

---

## 8. Telas em detalhe

Toda tela tem estados de **carregando** (skeleton), **vazio**, **erro** (com "Tentar de novo") e, quando usar IA, **sem conexão**.

### 8.1 Hoje

```
Boa tarde                              ⚙
seg, 19 out

┌ Sua sessão de hoje ─────────────────┐
│ ○ Revisar cartões        24 · ~8 min│
│ ○ Desafio do dia              ~5 min│
│ ○ Diário                      ~5 min│
│                                     │
│ [         Começar          ]        │  ← continua de onde parou
│        Só tenho 2 minutos           │  ← dia mínimo
└─────────────────────────────────────┘

┌ Sua semana ─────────────────────────┐
│ S  T  Q  Q  S  S  D                 │  ← pontos: dias ativos
│ ●  ●  ○  ●  ·  ·  ·                 │
└─────────────────────────────────────┘

┌ Erro da semana ─────────────────────┐
│ Preposições (7×)  "depend of" → on  │
│                         [Treinar]   │
└─────────────────────────────────────┘

┌ Próximo ensaio (Fase 7) ────────────┐
```

- "Começar" percorre as etapas na ordem e volta para Hoje no fim.
- Etapa concluída: ícone de check em `rateGood` e texto em `textMuted`.
- Tudo feito: o cartão vira "Feito por hoje. Até amanhã." com o link discreto "Revisar mais".
- "Só tenho 2 minutos": 5 cards + 1 micro-desafio de uma frase. Conta como dia ativo.
- Sem cards e sem chave de IA configurada (primeiro uso): o cartão principal vira um guia de 3 passos: "Configure a IA", "Salve sua primeira palavra", "Faça sua primeira revisão".

### 8.2 Captura rápida (+)

Bottom sheet (50% → 90% quando o resultado aparece).

- **Topo:** controle segmentado com três modos:
  1. **Como eu digo?**: escrevo em português, recebo formas naturais em inglês.
  2. **Palavra/expressão**: escrevo em inglês, recebo explicação.
  3. **Frase que vi**: colo uma frase em inglês e toco no termo que quero aprender.
- Campo de texto com foco automático e botão de enviar. *(Fase 7: botão de microfone.)*
- **Resultado** dentro do próprio sheet:
  - "Como eu digo?": 2–3 opções, cada uma com chip de registro (neutro, informal, formal) e uma observação curta. A mais natural vem marcada como "Mais natural".
  - Cada opção tem um seletor "Salvar como card" (a mais natural já vem marcada).
  - Botão principal: "Salvar 1 card" (o número acompanha a seleção).
- Depois de salvar: Snackbar "Card salvo" com "Desfazer", e o sheet limpa o campo para a próxima captura (não fecha).
- O último modo usado fica lembrado.

### 8.3 Revisão

```
 ✕   ━━━━━━━━━━━━━━──────   12/30    ⋯

      ┌──────────────────────────┐
      │        (flashcard)       │
      └──────────────────────────┘

 [ Errei ][ Difícil ][  Bom  ][ Fácil ]
```

- Topo: ✕ (sair, com progresso salvo), barra de progresso fina, contador, menu ⋯ (Editar card, Desfazer última, Responder digitando, Ouvir automaticamente, Guia de gestos).
- Gestos: seção 6.2. Coach mark na primeira sessão.
- **Ouvir automaticamente** (opcional): lê o inglês ao mostrar a frente (Contexto, Lacuna) ou o verso (Produção, Erro).
- **Fim da sessão:**
  - Resumo: cards revisados, % de acerto (Bom + Fácil), tempo.
  - "Os que mais custaram": até 3 cards marcados como Errei, com toque para editar.
  - Botões: "Próxima etapa: Desafio do dia" (se houver) e "Voltar para Hoje".
  - Vibração de sucesso.

### 8.4 Ler (biblioteca) e Leitor

**Biblioteca**
- Botão principal no topo: "Colar texto" (lê a área de transferência e abre a tela de título/prévia).
- Menu "+": Colar texto, Escrever/colar manualmente. *(Fase 7: Compartilhados. Fase 8: Foto de página.)*
- Cada item: título, ícone da origem, data, barra de "% de palavras conhecidas", progresso de leitura.
- Gestos de lista: seção 6.4 (→ Arquivar). Filtro: Lendo · Arquivados.

**Leitor**
- Tipografia `reading`, largura máxima confortável, margem 20. Posição de leitura salva automaticamente.
- Realce das palavras:
  - salvas e em aprendizado: sublinhado pontilhado em `typeCloze`;
  - salvas e bem sabidas: sem realce;
  - marcadas "Já conheço": sem realce;
  - desconhecidas: sem realce (para não poluir).
- **Painel da palavra** (sheet pequeno): termo/lemma, IPA, 🔊, significado neste contexto (IA, com cache), exemplo, e os botões "Salvar card", "Já conheço", "Traduzir frase".
- Gestos: seção 6.3.
- Menu ⋯: tamanho da fonte, mostrar todas as traduções, marcar como lido, editar título.
- Sem internet: o painel mostra o que já estiver em cache e "Sem conexão. Salvar para explicar depois?" (fila processada quando voltar a conexão).

### 8.5 Praticar

**Hub:** lista de cartões grandes, com o Desafio do dia em destaque no topo (com status: pendente/feito).
1. Desafio do dia
2. Diário
3. Treino de erros (quiz)
4. Conversa
5. Ensaios de situações *(Fase 7)*
6. Shadowing *(Fase 8)*

**Desafio do dia** (gerado uma vez por dia, na primeira abertura, e guardado)
- Enunciado em PT, curto. Ex.: "Escreva 3 frases sobre seus planos para o fim de semana."
- **Itens obrigatórios** como chips: palavras/expressões que estou revisando, estruturas que evito (Fase 6) e categorias em que mais erro. Cada chip ganha check automaticamente quando é usado no texto (verificação local, sem IA).
- Campo de texto, contador de palavras, botão "Corrigir".
- Resultado → Tela de correção.

**Diário**
- Uma entrada por dia (pode editar até o fim do dia). Cabeçalho com a data.
- Campo grande, sugestão discreta de tema quando vazio ("Algo que te irritou hoje?", "Algo que você aprendeu?").
- Contador de palavras e botão "Corrigir". *(Fase 7: ditado por voz.)*
- Entradas anteriores em lista abaixo, com a versão corrigida.

**Tela de correção** (usada por Diário, Desafio e Conversa)
- Abas: **Correções** | **Versão natural** | **O que aprendi**.
  - *Correções:* meu texto com diff palavra a palavra: removido em `diffRemove` riscado, adicionado em `diffAdd`. Cada alteração tem um número discreto.
  - *Versão natural:* como um nativo escreveria, mantendo meu sentido.
  - *O que aprendi:* lista das alterações agrupadas por categoria.
- Toque numa alteração → sheet com: antes → depois, chip da categoria, gravidade (Erro · Soa estranho · Estilo), explicação em PT, seletor "Salvar como card de erro" e o botão "Discordo".
- Por padrão, alterações de gravidade **Erro** vêm marcadas para virar card; **Estilo** não.
- Botão principal: "Salvar e criar N cards". Os erros vão para o caderno de erros.

**Treino de erros (quiz)**
- 8 questões geradas a partir do caderno de erros (priorizando categorias frequentes e recentes).
- Formatos: múltipla escolha, encontre o erro, complete a frase.
- Feedback imediato com explicação curta. No fim: acertos e "categorias para reforçar".

**Conversa** (texto; voz na Fase 7)
- Interface de chat. Escolho um tema ou deixo a IA sugerir com base nos meus interesses.
- A IA responde em inglês no meu nível, sempre com uma pergunta para continuar.
- Correções **não interrompem**: aparecem como "1 correção" discreta sob a minha mensagem; toque expande.
- "Encerrar" → resumo da conversa + correções → Tela de correção (aba "O que aprendi").

**Ensaios de situações** *(Fase 7)*
- Lista de situações com data. Criar: título, data/hora, descrição livre ("reunião com cliente americano sobre prazo atrasado").
- A IA gera: vocabulário útil (salvável como cards), 3 frases-chave e um roleplay que começa com um toque.
- Notificação antes do evento (seção 9).

### 8.6 Progresso

- **Linha de números:** cards para hoje, retenção (30 dias), termos aprendidos, dias ativos no mês.
- **Gráfico de revisões** dos últimos 14 dias (barras simples feitas com Views).
- **Caderno de erros:** categorias com contagem e tendência (↑ ↓ →) nas últimas 4 semanas. Toque → lista daquela categoria (deslizar → "Treinar", ← "Arquivar").
- **Palavras que você evita** *(Fase 6)*: aparece depois de pelo menos 1.000 palavras escritas. Mostra palavras usadas demais com alternativas e estruturas ausentes, cada uma com o botão "Criar desafio".
- **Resumos semanais:** lista por semana.
- **Gasto de IA:** este mês, por função, e o limite configurado.
- **Meus cartões:** busca, filtros (tipo, estado), gestos de lista; toque abre o editor.

### 8.7 Configurações

Lista agrupada:
1. **Notificações** → Central de Notificações (seção 9)
2. **IA**: provedor (predefinições), URL base, chave (oculta, com olho para mostrar), modelo, "Testar conexão", preço por milhão de tokens de entrada/saída (opcional, para estimar gasto), limite mensal com aviso. Aviso fixo: "No plano gratuito de alguns provedores, seus textos podem ser usados para treinar modelos."
3. **Sobre mim**: nível (A2–C2 ou "Não sei, estimar pelos meus textos"), objetivo, interesses (chips editáveis), profissão/contexto, variante (americano/britânico), dificuldades que já conheço.
4. **Estudo**: novos cards por dia (20), máximo de revisões por dia (200), retenção desejada (90%), tamanho do dia mínimo (5), hora em que o dia vira (04:00), gerar card de Lacuna automaticamente, gerar card de Produção a partir de Contexto.
5. **Gestos**: gestos na revisão (ligado), sensibilidade (baixa/média/alta → limite 45%/35%/25%), modo canhoto, vibração, "Ver guias de novo", tela "Mapa de gestos" (versão visual da seção 6).
6. **Aparência**: tema, tamanho do texto do card, tamanho do texto do leitor.
7. **Voz**: velocidade da leitura (0,5–1,25), sotaque (en-US/en-GB).
8. **Dados**: exportar backup, importar backup, último backup, apagar tudo (confirmação dupla digitando "APAGAR").

---

## 9. Central de Notificações

Objetivo: **eu decido exatamente o que me notifica, quando e quanto.** Tudo é notificação **local**, agendada no aparelho.

### 9.1 Layout da tela

```
Notificações

[●] Notificações do app                ← mestre
    ⚠ Bloqueadas no Android [Abrir configurações]   ← só se negado

Pausar tudo
[1 dia] [3 dias] [1 semana] [Até eu voltar]
    → "Pausado até qui, 23/10 · Retomar"

Horário silencioso          [●]  22:00 – 08:00
Máximo por dia              [ − ] 4 [ + ]

Tipos (arraste ≡ para definir a prioridade)
≡ 📚 Revisão do dia        08:30 · S T Q Q S S D   [●]
≡ ✍️ Desafio do dia        12:30                    [●]
≡ 📓 Diário                21:00                    [●]
≡ 💭 Pense em inglês       2×/dia, 09:00–20:00     [ ]
≡ 📊 Resumo semanal        dom 18:00                [●]
≡ 🎭 Ensaio de situação    1 dia antes             [●]   (Fase 7)
≡ 🌱 Retorno gentil        após 3 dias sem abrir    [●]

Histórico (últimos 7 dias)
```

- Toque na linha → tela de detalhe do tipo. O switch liga/desliga direto da lista.
- Use ícones Feather na implementação (os emojis acima são só ilustração).

### 9.2 Tela de detalhe de cada tipo

- Switch do tipo.
- Configurações específicas (tabela abaixo).
- **Prévia** de como a notificação vai aparecer.
- Botão **"Enviar teste agora"**.

### 9.3 Tipos

| Tipo | Padrão | Configurações | Texto de exemplo | Ações na notificação | Abre |
|---|---|---|---|---|---|
| Revisão do dia | Ligado, 08:30, todos os dias | Horário, dias da semana, "só avisar com pelo menos N cards" (1) | "24 cartões te esperando (~8 min)" | Revisar agora · Mais tarde (+1 h) | `review` |
| Desafio do dia | Ligado, 12:30 | Horário, dias | "Desafio de hoje: use *though* e *get used to*" | Fazer agora | `practice/challenge` |
| Diário | Ligado, 21:00 | Horário, dias | "Como foi seu dia? Conte em inglês." | Escrever | `practice/journal` |
| Pense em inglês | **Desligado** | Janela (09:00–20:00), quantidade por dia (1–5), dias | "Descreva em inglês o que você está fazendo agora." | Responder | `capture?mode=think` |
| Resumo semanal | Ligado, domingo 18:00 | Dia e horário | "Sua semana: 132 revisões, erro mais comum: preposições" | Ver | `progress/weekly/latest` |
| Ensaio de situação *(Fase 7)* | Ligado | Antecedência: 1 dia antes, 3 h antes, ambos | "Amanhã: reunião com cliente. Quer ensaiar 5 min?" | Ensaiar | `practice/rehearsals/{id}` |
| Retorno gentil | Ligado | Após N dias sem abrir (3), no máximo 1 por semana | "Sem pressa. Separei só 5 cartões para você voltar." | Começar | `review?minimal=1` |

- Notificações de tipos já concluídos no dia **não são enviadas** (ex.: fiz o diário às 19h → o lembrete das 21h é cancelado).
- Textos variam entre 3–5 versões por tipo para não ficarem repetitivos. Tom gentil, sem culpa.

### 9.4 Regras do agendador (`src/notifications/scheduler.ts`)

- Função `rescheduleAll()` cancela e reagenda **os próximos 7 dias**. Chamada: ao abrir o app, ao mudar qualquer configuração, ao terminar uma sessão de revisão, ao concluir diário/desafio e ao criar/editar um ensaio.
- **Conteúdo calculado na hora de agendar.** Ex.: a contagem de "Revisão do dia" para amanhã às 08:30 é calculada pelas datas de vencimento do FSRS (cards com `due` ≤ aquele horário).
- **Pausa:** nada é agendado até a data de retorno.
- **Horário silencioso:** nada é agendado dentro dele. Se um horário configurado cair no silêncio, a tela de detalhe avisa.
- **Máximo por dia:** se um dia passar do limite, ficam os tipos de maior prioridade (ordem definida por arraste).
- "Pense em inglês": sorteia os horários dentro da janela, com no mínimo 90 min entre eles.
- **Android:**
  - Pedir permissão de notificação (Android 13+) com uma tela de explicação antes do pedido do sistema.
  - Criar **um canal por tipo**, com o mesmo nome em PT, para que eu também possa controlar pelas configurações do sistema.
  - Usar categorias de notificação com os botões de ação da tabela.
- Toque na notificação ou num botão → navega via deep link (seção 5.3) e registra "aberta" no histórico.
- **Histórico:** lista simples dos últimos 7 dias (tipo, horário agendado, aberta ou não).

---

## 10. Camada de IA

### 10.1 Provedores

Qualquer API **compatível com OpenAI** (`POST {baseURL}/chat/completions`). Predefinições:

| Provedor | URL base |
|---|---|
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| OpenAI | `https://api.openai.com/v1` |
| Ollama na rede local | `http://IP-DO-PC:11434/v1` (exige liberar tráfego HTTP no Android via `expo-build-properties`) |
| Personalizado | URL livre |

A chave fica **somente** no `expo-secure-store`. Nunca em código, logs, banco ou backup.

### 10.2 Cliente (`src/ai/client.ts`)

Uma função genérica, por exemplo `callAI<T>(feature, messages, schema, options)`:
- Timeout de 30 s. Até 2 novas tentativas com espera crescente para 429, 5xx e falha de rede.
- Pede JSON (`response_format: { type: "json_object" }` quando o provedor aceitar; senão instrução no prompt + extração do primeiro bloco JSON).
- Valida com **zod**. Se inválido, uma nova tentativa pedindo para corrigir ao schema. Se falhar de novo, erro amigável.
- Registra uso (tokens de `usage`, função, modelo) na tabela `ai_usage`.
- **Cache** por hash de (função + entrada) para explicações de palavras e traduções.
- Erros traduzidos para PT: sem internet, chave inválida, limite do provedor atingido, resposta inválida, limite mensal do app atingido.
- Fila offline para "explicar depois" (Leitor).

### 10.3 Contexto do usuário

Todo prompt de sistema inclui um bloco gerado a partir de "Sobre mim" e do histórico:
- nível estimado, objetivo, interesses, profissão, variante do inglês;
- as 3 categorias de erro mais frequentes;
- regra fixa: explicações em **português do Brasil**, exemplos em **inglês**, comparando com o português quando ajudar (falsos cognatos, tradução literal).

### 10.4 Regras gerais dos prompts

- Respostas **curtas e diretas**. Explicações com no máximo 2 frases, salvo pedido de "explicar mais".
- Nível **i+1**: exemplos um pouco acima do meu nível, nunca rebuscados sem motivo.
- Correções **preservam meu sentido e minha voz**. Corrigir erros e o que soa estranho; estilo só como sugestão.
- Toda correção traz **categoria** (taxonomia 10.6) e **gravidade**: `error` | `unnatural` | `style`.
- Saída **sempre** no schema JSON da função.
- Os prompts ficam em `src/ai/prompts/` (um arquivo por função), com os schemas zod em `src/ai/schemas/`.

### 10.5 Funções de IA (contratos)

| Função | Entrada | Saída (JSON) | Fase |
|---|---|---|---|
| `explainTerm` | termo; frase de contexto (opcional) | `{ lemma, ipa, partOfSpeech, meaningPt, explanationPt, exampleEn, examplePt, register, isMultiword }` | 2 |
| `howDoISay` | texto em PT; contexto (opcional) | `{ options: [{ en, register, notePt }], bestIndex }` | 2 |
| `explainMore` | nota completa | `{ explanationPt, extraExamples: [{ en, pt }], commonMistakesPt }` | 2 |
| `translate` | frase ou parágrafo em EN | `{ translationPt }` | 4 |
| `correctText` | texto; modo (`journal` \| `challenge` \| `conversation`); itens obrigatórios (opcional) | `{ correctedText, naturalVersion, edits: [{ original, corrected, category, severity, explanationPt }], usedRequiredItems: string[] }` | 5 |
| `dailyChallenge` | termos em revisão; categorias frequentes; estruturas evitadas | `{ promptPt, requiredItems: [{ text, kind }], exampleAnswer }` | 5 |
| `errorQuiz` | amostra do caderno de erros | `{ questions: [{ type, promptEn, options?, answer, explanationPt, category }] }` | 5 |
| `conversationTurn` | histórico; tema | `{ replyEn, corrections: [{ original, corrected, category, severity, explanationPt }] }` | 5 |
| `weeklySummary` | estatísticas da semana (calculadas localmente) | `{ summaryPt, focusNextWeekPt }` | 6 |
| `avoidanceReport` | estatísticas locais de uso + amostras de frases | `{ overused: [{ word, count, alternatives }], avoidedStructures: [{ structure, explanationPt, example }] }` | 6 |
| `rehearsalPrep` | situação | `{ vocab: [{ en, pt, note }], keyPhrases: string[], roleplayOpening }` | 7 |

O `diff` exibido na correção é calculado **localmente** (biblioteca `diff`) entre o original e `correctedText`; a IA só fornece a lista de `edits` com categoria e explicação, que são associadas aos trechos do diff.

### 10.6 Taxonomia de erros

| Código | Rótulo na interface |
|---|---|
| `preposition` | Preposição |
| `verb_tense` | Tempo verbal |
| `article` | Artigo |
| `word_order` | Ordem das palavras |
| `false_friend` | Falso cognato |
| `agreement` | Concordância |
| `collocation` | Combinação de palavras |
| `word_choice` | Escolha de palavra |
| `literal_translation` | Tradução literal |
| `missing_word` | Palavra faltando |
| `extra_word` | Palavra sobrando |
| `spelling` | Ortografia |
| `punctuation` | Pontuação |
| `register` | Formalidade |
| `pronunciation` | Pronúncia (Fase 7+) |

### 10.7 Custo e privacidade

- Estimativa de gasto = tokens × preço configurado. Mostrada em Progresso.
- Ao atingir 80% do limite mensal: aviso. Ao atingir 100%: funções de IA pausam até eu aumentar o limite (revisão continua normal).
- Estatísticas de "palavras que você evita" são calculadas **no aparelho**; só um resumo e algumas frases de amostra vão para a IA.

---

## 11. Modelo de dados

SQLite. Datas em ISO 8601 (UTC) e exibidas no fuso do aparelho. Ids em texto (uuid).
Migrations por `PRAGMA user_version`: cada migration é uma função numerada; **nunca editar uma migration antiga**.

| Tabela | Colunas principais |
|---|---|
| `settings` | `key` (pk), `value` (JSON) |
| `profile` | linha única: `level`, `goal`, `interests` (JSON), `occupation`, `variant`, `knownDifficulties` |
| `sources` | `id`, `title`, `kind` (`paste` \| `manual` \| `share` \| `photo`), `content`, `url`, `createdAt`, `readingPosition`, `archived` |
| `vocab_status` | `lemma` (pk), `status` (`learning` \| `known` \| `ignored`), `updatedAt` |
| `notes` | `id`, `kind` (`term` \| `production` \| `error`), `term`, `lemma`, `data` (JSON com os campos do tipo), `sourceId`, `sourceLabel`, `extra` (JSON: "explicar mais"), `createdAt`, `updatedAt` |
| `cards` | `id`, `noteId`, `type` (`context` \| `production` \| `cloze` \| `error`), campos FSRS (`due`, `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps`, `lapses`, `state`, `lastReview`), `suspended`, `createdAt` |
| `review_logs` | `id`, `cardId`, `rating`, `reviewedAt`, `durationMs`, `prevCard` (JSON para desfazer) |
| `journal_entries` | `id`, `date` (única), `original`, `correctionId`, `wordCount`, `updatedAt` |
| `challenges` | `id`, `date` (única), `promptPt`, `requiredItems` (JSON), `response`, `correctionId`, `completedAt` |
| `corrections` | `id`, `origin` (`journal` \| `challenge` \| `conversation`), `originId`, `original`, `correctedText`, `naturalVersion`, `edits` (JSON), `createdAt` |
| `errors` | `id`, `correctionId`, `original`, `corrected`, `category`, `severity`, `explanationPt`, `disputed`, `archived`, `cardId`, `createdAt` |
| `conversations` | `id`, `topic`, `messages` (JSON), `createdAt`, `endedAt` |
| `quiz_sessions` | `id`, `questions` (JSON), `answers` (JSON), `score`, `createdAt` |
| `rehearsals` | `id`, `title`, `eventAt`, `description`, `prep` (JSON), `rehearsedAt` |
| `weekly_summaries` | `id`, `weekStart`, `stats` (JSON), `summaryPt`, `focusNextWeekPt` |
| `daily_activity` | `date` (pk), `reviews`, `newCards`, `wordsWritten`, `minimalDay`, `sessionSteps` (JSON) |
| `notification_log` | `id`, `type`, `scheduledFor`, `openedAt` |
| `ai_usage` | `id`, `at`, `feature`, `model`, `inputTokens`, `outputTokens`, `estimatedCost` |
| `ai_cache` | `hash` (pk), `feature`, `response` (JSON), `createdAt` |
| `ai_queue` | `id`, `feature`, `payload` (JSON), `createdAt` |

Índices: `cards(due)`, `cards(noteId)`, `notes(lemma)`, `errors(category, createdAt)`, `review_logs(reviewedAt)`.

**Backup (Fase 6):** exporta tudo para um arquivo JSON versionado (sem a chave de IA), compartilhado pelo sistema (ex.: salvar no Google Drive). Importar valida a versão e pergunta "Substituir tudo?".

---

## 12. Regras de estudo

- **O dia vira às 04:00** (configurável).
- **FSRS** (`ts-fsrs`): retenção desejada 0,90 (configurável 0,80–0,97), fuzz ligado.
- **Fila do dia** (`src/srs/queue.ts`):
  1. Cards vencidos, do menor para o maior nível de lembrança (retrievability), até o máximo de revisões.
  2. Cards novos até o limite diário, intercalados (1 novo a cada 4 revisões).
  3. Evitar dois cards do mesmo tipo seguidos quando possível.
  4. Cards irmãos (mesma nota) nunca no mesmo dia.
  5. "Errei" faz o card voltar na mesma sessão conforme os passos de aprendizado do FSRS.
- **Modo retorno:** se os vencidos passarem de 2× o máximo diário, ativa automaticamente: limite de 60 por dia, prioridade para os com menor lembrança, banner gentil em Hoje. Desativa sozinho quando a fila normaliza.
- **Dia mínimo:** 5 cards + 1 frase. Conta como dia ativo.
- **Dia ativo:** qualquer revisão ou qualquer texto produzido.
- **Desfazer:** restaura o estado anterior do card a partir de `review_logs.prevCard`.

---

## 13. Qualidade, acessibilidade e estados

- **Estados obrigatórios** em toda tela: carregando (skeleton), vazio, erro com "Tentar de novo", sem conexão (quando usar IA).
- **Acessibilidade:** `accessibilityLabel` e `accessibilityRole` em todos os elementos tocáveis; escala de fonte até 130%; contraste AA; "reduzir movimento"; alvos de 48 dp; gestos sempre com alternativa.
- **Desempenho:** FlashList em listas longas; nada de cálculos pesados no render; consultas com índice; abrir o app → Hoje pronta em menos de 1 s com 5.000 cards.
- **Textos:** todos em `src/i18n/strings.ts`.
- **Segurança:** chave só no SecureStore; nunca logar textos completos do usuário em produção.
- **Testes:**
  - unitários: fila do dia, wrapper FSRS (incluindo desfazer), agendador de notificações (silêncio, pausa, limite, prioridade), parsing/validação das respostas de IA, verificação de itens obrigatórios do desafio, tokenização do leitor;
  - de componente: FlashCard (virar), RatingBar (intervalos).
- Antes de considerar qualquer passo pronto: `npx tsc --noEmit`, `npx expo lint` e `npm test` passando.

---

## 14. Fases de construção e critérios de pronto

Cada fase termina com um **roteiro de teste no celular** e um commit.

### Fase 1 — Fundação
**Entregas**
- Limpar o template inicial do Expo (`npm run reset-project`, se existir).
- Tema completo (seção 4) com claro/escuro e componentes base (4.5).
- Navegação com a tab bar customizada e o botão + (seção 5), telas das abas com EmptyState.
- Banco com migrations e repositórios de `settings` e `profile`.
- Configurações: IA (10.1, com "Testar conexão"), Sobre mim, Aparência.
- `src/ai/client.ts` com validação zod, retries, registro de uso e erros em PT.
- Jest configurado, primeiros testes.

**Pronto quando:** abro o app no Expo Go, navego pelas 4 abas, alterno tema, salvo minha chave, toco em "Testar conexão" e vejo "Conectado: modelo X"; fecho e reabro e tudo continua salvo.

### Fase 2 — Cards e revisão
**Entregas**
- Captura rápida (8.2) com os modos "Como eu digo?" e "Palavra/expressão" (o modo "Frase que vi" pode vir na Fase 4).
- Tipos de card Contexto, Produção e Lacuna (seção 7), editor com prévia, detecção de duplicatas.
- Revisão (8.3) com FSRS, barra de avaliação com intervalos, **todos os gestos da 6.2**, desfazer, coach mark, tela de fim de sessão.
- Hoje (8.1) com a etapa de revisão e o dia mínimo.
- Meus cartões (busca, filtros, editar, gestos de lista).
- `explainTerm`, `howDoISay`, `explainMore`.

**Pronto quando:** salvo 10 termos pela Captura, faço uma sessão inteira usando só gestos e depois só botões, desfaço uma avaliação, e no dia seguinte os cards aparecem de acordo com o FSRS.

### Fase 3 — Central de Notificações
**Entregas**
- Migração para **development build** (seção 2).
- Central completa (seção 9). O agendador já suporta todos os tipos, mas a tela só exibe (e só agenda) os que já têm destino no app: **Revisão do dia, Pense em inglês e Retorno gentil**. Desafio e Diário entram na Fase 5, Resumo semanal na Fase 6 e Ensaio na Fase 7.
- Canais por tipo, ações nas notificações, deep links, histórico.
- Testes do agendador.

**Pronto quando:** configuro a Revisão para daqui a 2 minutos, recebo a notificação com a contagem certa, toco em "Revisar agora" e caio na Revisão; ativo "Pausar 1 dia" e nada chega; o horário silencioso e o limite por dia funcionam no teste.

### Fase 4 — Leitor
**Entregas**
- Biblioteca e Leitor (8.4) com todos os gestos da 6.3, painel da palavra, tradução de frase/parágrafo, realce por status, fila offline.
- Modo "Frase que vi" na Captura.
- `translate`.

**Pronto quando:** colo um artigo, toco em palavras, seleciono uma expressão arrastando, salvo 5 cards, vejo traduções por gesto e, ao reabrir, volto ao ponto onde parei.

### Fase 5 — Produção e correção
**Entregas**
- Diário, Desafio do dia, Tela de correção (diff, abas, "Discordo"), cards de Erro, caderno de erros, Treino de erros, Conversa por texto.
- Etapas Desafio e Diário em Hoje; notificações de Desafio e Diário visíveis.
- `correctText`, `dailyChallenge`, `errorQuiz`, `conversationTurn`.

**Pronto quando:** escrevo uma entrada de diário com erros de propósito, vejo o diff, entendo cada correção, discordo de uma, salvo os erros como cards e eles aparecem na revisão; o desafio marca os itens obrigatórios conforme eu escrevo.

### Fase 6 — Progresso e dados
**Entregas**
- Progresso completo (8.6): números, gráfico, caderno de erros com tendência, palavras que você evita, resumos semanais, gasto de IA.
- Notificação de Resumo semanal visível. Card "Erro da semana" em Hoje.
- Backup e restauração (seção 11). Apagar tudo.
- `weeklySummary`, `avoidanceReport`.

**Pronto quando:** vejo minhas estatísticas reais, exporto um backup para o Google Drive, apago tudo, importo e tudo volta.

### Fase 7 — Voz, compartilhar e widget
**Entregas**
- Captura por voz segurando o + (6.1) e ditado no Diário (`expo-speech-recognition`).
- Conversa por voz (fala → texto → IA → resposta lida em voz alta).
- Receber textos e links pelo "Compartilhar" do Android direto na biblioteca (`expo-share-intent`).
- Widget na tela inicial: mostra 1 card para revisar (toque vira; botões Errei/Bom) e o atalho "Como eu digo?".
- Ensaios de situações + notificação.
- `rehearsalPrep`.

**Pronto quando:** compartilho um artigo do navegador para o app, capturo uma frase por voz sem abrir o teclado e reviso um card pelo widget.

### Fase 8 — Extras
- Podcast diário: texto gerado com meus termos e interesses, lido com `expo-speech`, com controles de reprodução.
- Shadowing: ouvir frase, gravar (`expo-audio`), comparar.
- Gravação mensal com a mesma pergunta e métricas (palavras por minuto, variedade).
- Foto de página → texto no Leitor (via IA com visão, se o provedor suportar).

---

## 15. Fora do escopo

Login, sincronização em nuvem, vários usuários, publicação na Play Store, anúncios, rankings ou gamificação competitiva, iOS (por enquanto).
