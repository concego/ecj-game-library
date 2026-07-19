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

---

## Módulos

| Módulo | Descrição |
|---|---|
| `SensorKit` | Acelerômetro, giroscópio e shake — browser e Capacitor |
| `StateMachine` | Máquina de estados genérica com timers integrados |
| `TensionSystem` | Sistema de tensão jogador vs. oponente (pesca, cabo de guerra...) |
| `CreatureProfile` | Sorteio ponderado de criaturas/oponentes |
| `AccessibilityLayer` | Anúncios TalkBack/NVDA (speak) e vibração tátil |
| `SpearFishing` | Pesca primitiva: vibração + tilt — lança, mão, rede etc. |

---

## Estrutura

```
lib/                  ← módulos da biblioteca (branch: main)
games/                ← minigames de teste (branch: gh-pages)
  fishing/            ← pesca com linha (SensorKit + TensionSystem)
  spear/              ← pesca primitiva (SpearFishing)
```

---

## Uso

```js
import { SensorKit }          from "./lib/SensorKit.js";
import { StateMachine }       from "./lib/StateMachine.js";
import { TensionSystem }      from "./lib/TensionSystem.js";
import { CreatureProfile }    from "./lib/CreatureProfile.js";
import { AccessibilityLayer } from "./lib/AccessibilityLayer.js";
import { SpearFishing }       from "./lib/SpearFishing.js";
```

### Pré-requisito para AccessibilityLayer

O projeto deve criar o elemento `aria-live` no HTML — a lib não injeta estilo:

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
