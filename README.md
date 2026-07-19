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

### Sensores e Acessibilidade
| Módulo | Descrição |
|---|---|
| `SensorKit` | Acelerômetro, giroscópio e shake — browser e Capacitor |
| `AccessibilityLayer` | Anúncios TalkBack/NVDA (speak) e vibração tátil |

### Mecânicas de Ação
| Módulo | Descrição |
|---|---|
| `TensionSystem` | Sistema de tensão jogador vs. oponente (pesca, cabo de guerra...) |
| `TimedStrike` | Janela de oportunidade + reação: caça, emboscada, pesca primitiva etc. |
| `RhythmTilt` | Inclinação ritmada: mineração, remo, serrar, forjar, bombear etc. |
| `TiltCompass` | Tilt → direção cardinal (N/S/E/W) — vira o personagem no grid |

### Mundo e Recursos
| Módulo | Descrição |
|---|---|
| `GridMap` | Posição, direção, distância, cone de visão e detecção em grid 2D |
| `ResourceNode` | Nós de recursos: HP, ferramenta, drops ponderados, bioma, respawn |
| `CreatureProfile` | Sorteio ponderado de criaturas/oponentes |

### Sorte e Aleatoriedade
| Módulo | Descrição |
|---|---|
| `CardDeck` | Baralho genérico: embaralha, compra, descarta, devolve |
| `DiceRoller` | Dados configuráveis: qualquer face, quantidade, modificador, vantagem |
| `Roulette` | Roleta com tilt: gira com tilt pra frente, para com segundo tilt |

### Progressão
| Módulo | Descrição |
|---|---|
| `ScoreSystem` | Pontuação, highscore (localStorage), combos e multiplicadores |
| `TimerCountdown` | Temporizador regressivo com pausa, bônus de tempo e urgência |
| `StateMachine` | Máquina de estados genérica com timers integrados |

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
COMBATE (TensionSystem + TimedStrike)
  Intenção definida pelo item ativo
  Minigame correspondente é lançado
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

## Uso rápido

```js
import { SensorKit }          from "./lib/SensorKit.js";
import { AccessibilityLayer } from "./lib/AccessibilityLayer.js";
import { StateMachine }       from "./lib/StateMachine.js";
import { TensionSystem }      from "./lib/TensionSystem.js";
import { TimedStrike }        from "./lib/TimedStrike.js";
import { RhythmTilt }         from "./lib/RhythmTilt.js";
import { TiltCompass }        from "./lib/TiltCompass.js";
import { GridMap }            from "./lib/GridMap.js";
import { CreatureProfile }    from "./lib/CreatureProfile.js";
import { ResourceNode }       from "./lib/ResourceNode.js";
import { CardDeck }           from "./lib/CardDeck.js";
import { DiceRoller }         from "./lib/DiceRoller.js";
import { Roulette }           from "./lib/Roulette.js";
import { ScoreSystem }        from "./lib/ScoreSystem.js";
import { TimerCountdown }     from "./lib/TimerCountdown.js";
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

## Licença

MIT