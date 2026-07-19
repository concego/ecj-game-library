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
```

### Pré-requisito para AccessibilityLayer

O projeto deve criar o elemento `aria-live` no HTML — a lib não injeta estilo:

```html
<div id="announcer" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
```

---

## ScoreSystem — referência rápida

```js
const score = ScoreSystem.create({
  storageKey:      "myjam_score",  // chave no localStorage
  baseMultiplier:  1,
  multiplierStep:  0.5,            // +0.5x por combo threshold
  maxMultiplier:   4,
  comboThresholds: [3, 5, 10],     // combos que disparam evento "combo"
});

score.add(100);      // adiciona 100 × multiplicador atual
score.combo();       // acerto em sequência → sobe multiplicador
score.breakCombo();  // erro → reseta multiplicador
score.reset();       // zera pontuação (highscore persiste)
```

## TimerCountdown — referência rápida

```js
const timer = TimerCountdown.create({
  seconds:          60,   // duração total
  urgencyThreshold: 10,   // dispara "urgent" nos últimos N segundos
  loop:             false, // reinicia ao expirar
});

timer.start();         // inicia
timer.pause();         // pausa
timer.resume();        // retoma
timer.addTime(10);     // +10s de bônus
timer.reset(90);       // reinicia com nova duração
```

---

## Compatibilidade

- Browser (GitHub Pages)
- Android APK via [Capacitor](https://capacitorjs.com)
- TalkBack (Android) e NVDA (Windows)

---

## Licença

MIT