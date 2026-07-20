# ECJ Game Library 🐉

Biblioteca modular de mecânicas reutilizáveis para jogos acessíveis — parte do projeto [Eu Concego Jogar](https://concego.github.io).

---

## Regra de Ouro

> **A biblioteca não toca em áudio nem em visual.**
>
> - **Fica na lib:** lógica de mecânica, sensores, estados, tensão, criaturas, acessibilidade (anúncios e vibração).
> - **Fica no projeto:** sons, sprites, CSS, animações, temas, paletas.
>
> Os módulos **emitem eventos**. O jogo ouve e decide o que fazer.

## Princípio de Movimento

> **A interação física não pode impedir o player de olhar para a tela.**
>
> Movimentos suaves e pontuais (tilt leve, shake único, vibração) são preferíveis a gestos contínuos e amplos.

---

## Módulos

### ECJ Motion Systems
*O coração da biblioteca — o que a diferencia de qualquer outra.*

| Módulo | Descrição |
|---|---|
| `SensorKit` | Acelerômetro, giroscópio e shake — browser e Capacitor |
| `TensionSystem` | Tensão jogador vs. oponente: pesca, cabo de guerra, puxar porta pesada... |
| `RhythmTilt` | Inclinação ritmada: mineração, remo, serrar, forjar, bombear... |
| `TiltCompass` | Tilt → direção cardinal N/S/E/W — vira o personagem no grid |
| `TimedStrike` | Janela de oportunidade + reação: caça, emboscada, pesca primitiva... |
| `InteractionSequence` | Sequências de gestos: abrir fechaduras, lançar magia, rituais, armadilhas... |

### Mundo e Recursos

| Módulo | Descrição |
|---|---|
| `GridMap` | Posição, direção, distância, cone de visão e detecção em grid 2D |
| `ResourceNode` | Nós de recurso: HP, ferramenta, drops ponderados, bioma, respawn |
| `CreatureProfile` | Sorteio ponderado de criaturas/oponentes |

### Sorte e Aleatoriedade

| Módulo | Descrição |
|---|---|
| `CardDeck` | Baralho genérico: embaralha, compra, descarta, devolve |
| `DiceRoller` | Dados configuráveis: qualquer face, quantidade, modificador, vantagem/desvantagem |
| `Roulette` | Roleta com tilt: gira com tilt pra frente, para com segundo tilt + delay de desaceleração |

### Acessibilidade

| Módulo | Descrição |
|---|---|
| `AccessibilityLayer` | Anúncios TalkBack/NVDA (speak) e vibração tátil |

### Core Systems
*Infraestrutura genérica — útil em qualquer jogo.*

| Módulo | Descrição |
|---|---|
| `StateMachine` | Máquina de estados genérica com timers integrados |
| `ScoreSystem` | Pontuação, highscore (localStorage), combos e multiplicadores |
| `TimerCountdown` | Temporizador regressivo com pausa, bônus de tempo e urgência |

---

## InteractionSequence — referência rápida

```js
// Sequência: shake → tilt_left → tilt_right (ex: abrir uma fechadura)
const lock = InteractionSequence.create({
  sequence: [
    { gesture: "shake"      },
    { gesture: "tilt_left",  timeoutMs: 2000 },
    { gesture: "tilt_right", timeoutMs: 2000 },
  ],
  globalTimeoutMs: 6000,
  strict: true,   // gesto errado = falha
});

lock.on("started",   ()                       => { /* primeiro gesto correto */ });
lock.on("progress",  ({ step, total })        => { /* feedback de progresso  */ });
lock.on("completed", ({ elapsed })            => { /* porta aberta!          */ });
lock.on("failed",    ({ expected, received }) => { /* gesto errado           */ });
lock.on("timeout",   ({ step })               => { /* tempo esgotado         */ });

// Integração com SensorKit
SensorKit.on("shake",     () => lock.input("shake"));
SensorKit.on("tiltLeft",  () => lock.input("tilt_left"));
SensorKit.on("tiltRight", () => lock.input("tilt_right"));

// Atalho para sequências simples
const combo = InteractionSequence.fromGestures(
  ["tilt_forward", "shake", "tilt_left"],
  { globalTimeoutMs: 5000 }
);
```

---

## Arquitetura de jogo com grid

```
EXPLORAÇÃO (TiltCompass + GridMap + ResourceNode)
  Tilt vira o personagem → N/S/E/W
  TalkBack navega o grid
  GridMap rastreia posição, direção e cone de visão
  Nodes de recurso ancorados em células do grid
         ↓
  Player seleciona célula (dois toques TalkBack)
  Guia de atalhos no rodapé → item/ferramenta ativa
  GridMap calcula distância player → alvo
         ↓
EXTRAÇÃO (ResourceNode + RhythmTilt)
  ResourceNode verifica ferramenta, remove HP, sorteia drop
  RhythmTilt executa a mecânica de coleta
         ↓
COMBATE / INTERAÇÃO (TensionSystem + TimedStrike + InteractionSequence)
  Tensão, janelas de reação ou sequências de gestos
  ScoreSystem e TimerCountdown integrados
         ↓
RECOMPENSA (CardDeck | DiceRoller | Roulette)
  Loot sorteado via carta, dado ou roleta com tilt
```

---

## Estrutura

```
lib/                  ← módulos da biblioteca (branch: main)
games/                ← minigames de teste (branch: gh-pages)
  fishing/            ← pesca com linha (SensorKit + TensionSystem)
  spear/              ← pesca primitiva / caça (TimedStrike)
  mining/             ← mineração (RhythmTilt)
```

---

## Uso

```js
import { SensorKit }             from "./lib/SensorKit.js";
import { AccessibilityLayer }    from "./lib/AccessibilityLayer.js";
import { StateMachine }          from "./lib/StateMachine.js";
import { TensionSystem }         from "./lib/TensionSystem.js";
import { TimedStrike }           from "./lib/TimedStrike.js";
import { RhythmTilt }            from "./lib/RhythmTilt.js";
import { TiltCompass }           from "./lib/TiltCompass.js";
import { InteractionSequence }   from "./lib/InteractionSequence.js";
import { GridMap }               from "./lib/GridMap.js";
import { CreatureProfile }       from "./lib/CreatureProfile.js";
import { ResourceNode }          from "./lib/ResourceNode.js";
import { CardDeck }              from "./lib/CardDeck.js";
import { DiceRoller }            from "./lib/DiceRoller.js";
import { Roulette }              from "./lib/Roulette.js";
import { ScoreSystem }           from "./lib/ScoreSystem.js";
import { TimerCountdown }        from "./lib/TimerCountdown.js";
```

### Pré-requisito para AccessibilityLayer

```html
<div id="announcer" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
```

---

## Compatibilidade

- Browser (GitHub Pages)
- Android APK via [Capacitor](https://capacitorjs.com)
- TalkBack (Android) e NVDA (Windows)

---

## Licença / License

### 🇧🇷 Português

Esta biblioteca usa **licença dual**.

**Uso gratuito** (não comercial):
- Projetos pessoais e aprendizado
- Game jams (mesmo com premiação)
- Projetos open source
- Uso acadêmico e educacional
- Portfólio e demonstrações

**Uso comercial** (requer licença paga):
- Jogos ou produtos vendidos, monetizados ou distribuídos por taxa
- Jogos com compras in-app ou assinaturas
- Projetos usados em consultoria paga ou trabalho para clientes
- Ferramentas internas de empresas comerciais

👉 Adquira a licença comercial em: [ko-fi.com/euconcego](https://ko-fi.com/euconcego)

Dúvidas? euconcego@gmail.com

---

### 🇺🇸 English

This library uses a **dual license**.

**Free use** (non-commercial):
- Personal projects and learning
- Game jams (including entries with prize pools)
- Open source projects
- Academic and educational use
- Portfolio and demonstration projects

**Commercial use** (requires a paid license):
- Any game or product sold, monetized, or distributed for a fee
- Games with in-app purchases or subscriptions
- Projects used in paid consulting or client work
- Internal tools developed for a commercial entity

👉 Get a commercial license at: [ko-fi.com/euconcego](https://ko-fi.com/euconcego)

Questions? euconcego@gmail.com

---

See [LICENSE](./LICENSE) for the full legal text.