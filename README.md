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

| Módulo | Descrição |
|---|---|
| `SensorKit` | Acelerômetro, giroscópio e shake — browser e Capacitor |
| `StateMachine` | Máquina de estados genérica com timers integrados |
| `TensionSystem` | Sistema de tensão jogador vs. oponente (pesca, cabo de guerra...) |
| `CreatureProfile` | Sorteio ponderado de criaturas/oponentes |
| `AccessibilityLayer` | Anúncios TalkBack/NVDA (speak) e vibração tátil |
| `TimedStrike` | Janela de oportunidade + reação: pesca primitiva, caça com lança, emboscada etc. |
| `RhythmTilt` | Inclinação ritmada: mineração, remo, serrar, forjar, bombear etc. |
| `ScoreSystem` | Pontuação, highscore (localStorage), combos e multiplicadores |
| `TimerCountdown` | Temporizador regressivo com pausa, bônus de tempo e urgência |
| `TiltCompass` | Tilt → direção cardinal (N/S/E/W) — vira o personagem na exploração de grid |
| `GridMap` | Posição, direção, distância, cone de visão e detecção em grid 2D |

---

## Arquitetura de jogo com grid

```
EXPLORAÇÃO (TiltCompass + GridMap)
  Tilt vira o personagem → N/S/E/W
  TalkBack navega o grid
  GridMap rastreia posição, direção e cone de visão
  Inimigo no cone → evento "detect"
         ↓
  Player seleciona célula (dois toques TalkBack)
  Guia de atalhos no rodapé → item ativo selecionado
  GridMap calcula distância player → alvo
         ↓
COMBATE (TensionSystem + TimedStrike + item ativo)
  Intenção já definida pelo item ativo
  Minigame correspondente é lançado
  ScoreSystem e TimerCountdown integrados
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
import { SensorKit }          from "./lib/SensorKit.js";
import { StateMachine }       from "./lib/StateMachine.js";
import { TensionSystem }      from "./lib/TensionSystem.js";
import { CreatureProfile }    from "./lib/CreatureProfile.js";
import { AccessibilityLayer } from "./lib/AccessibilityLayer.js";
import { TimedStrike }        from "./lib/TimedStrike.js";
import { RhythmTilt }         from "./lib/RhythmTilt.js";
import { ScoreSystem }        from "./lib/ScoreSystem.js";
import { TimerCountdown }     from "./lib/TimerCountdown.js";
import { TiltCompass }        from "./lib/TiltCompass.js";
import { GridMap }            from "./lib/GridMap.js";
```

### Pré-requisito para AccessibilityLayer

```html
<div id="announcer" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
```

---

## GridMap — referência rápida

```js
const map = GridMap.create({ cols: 10, rows: 10 });

map.addEntity("player", { col: 0, row: 0 }, "E");
map.addEntity("goblin", { col: 3, row: 0 }, "W");

map.move("player", { col: 1, row: 0 }); // emite move, enter, leave
map.turn("player", "N");                // emite turn

map.distance("player", "goblin");       // 2 (Manhattan)
map.inCone("goblin", "player", { range: 4, angle: 90 }); // true/false

map.on("detect", ({ detector, target }) => { /* inimigo viu o player */ });
map.on("cellselect", ({ cell, entities }) => { /* player clicou numa célula */ });

map.selectCell({ col: 3, row: 0 }); // dispara cellselect
```

## TiltCompass — referência rápida

```js
const compass = TiltCompass.create({ threshold: 20, deadZoneMs: 300 });

compass.on("turn", ({ direction, previous }) => {
  map.turn("player", direction); // N/S/E/W
});

compass.on("holding", ({ direction, progress }) => {
  // feedback visual/sonoro do progresso do deadzone (0–1)
});

compass.start(SensorKit); // conecta ao sensor
// Teclado: A/W/S/D ou ←↑↓→ funcionam automaticamente
```

---

## Compatibilidade

- Browser (GitHub Pages)
- Android APK via [Capacitor](https://capacitorjs.com)
- TalkBack (Android) e NVDA (Windows)

---

## Licença

MIT