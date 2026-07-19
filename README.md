# ECJ Game Library 🐉

Biblioteca modular de mecânicas reutilizáveis para jogos acessíveis — parte do projeto [Eu Concego Jogar](https://concego.github.io).

## Módulos

| Módulo | Descrição |
|---|---|
| `SensorKit` | Acelerômetro, giroscópio e shake — browser e Capacitor |
| `StateMachine` | Máquina de estados genérica com timers integrados |
| `TensionSystem` | Sistema de tensão jogador vs. oponente (pesca, cabo de guerra...) |
| `CreatureProfile` | Sorteio ponderado de criaturas/oponentes |
| `AccessibilityLayer` | Anúncios TalkBack/NVDA, vibração e foco |

## Estrutura

```
lib/                  ← módulos da biblioteca (branch: main)
games/                ← minigames de teste (branch: gh-pages)
```

## Uso

```js
import { SensorKit }          from "./lib/SensorKit.js";
import { StateMachine }       from "./lib/StateMachine.js";
import { TensionSystem }      from "./lib/TensionSystem.js";
import { CreatureProfile }    from "./lib/CreatureProfile.js";
import { AccessibilityLayer } from "./lib/AccessibilityLayer.js";
```

## Compatibilidade

- Browser (GitHub Pages)
- Android APK via Capacitor
- TalkBack (Android) e NVDA (Windows)

## Licença

MIT
