# ECJ Game Library 🐉

Modular library of reusable mechanics for accessible games — part of the [Eu Concego Jogar](https://concego.github.io) project.

---

## Golden Rule

> **The library does not touch audio or visuals.**
>
> - **Lives in the lib:** mechanic logic, sensors, states, tension, creatures, accessibility (announcements and vibration).
> - **Lives in the project:** sounds, sprites, CSS, animations, themes, palettes.
>
> Modules **emit events**. The game listens and decides what to do.

## Movement Principle

> **Physical interaction must not prevent the player from looking at the screen.**
>
> Smooth, punctual movements (light tilt, single shake, vibration) are preferred over continuous and wide gestures.

---

## Modules

### ECJ Motion Systems
*The heart of the library — what sets it apart from everything else.*

| Module | Description |
|---|---|
| `SensorKit` | Accelerometer, gyroscope and shake — browser and Capacitor |
| `TensionSystem` | Player vs. opponent tension: fishing, tug-of-war, pulling a heavy door... |
| `RhythmTilt` | Rhythmic tilt: mining, rowing, sawing, forging, pumping... |
| `TiltCompass` | Tilt → cardinal direction N/S/E/W — turns the character on the grid |
| `TimedStrike` | Opportunity window + reaction: hunting, ambush, primitive fishing... |
| `InteractionSequence` | Gesture sequences: lock-picking, casting spells, rituals, traps... |

### World and Resources

| Module | Description |
|---|---|
| `GridMap` | Position, direction, distance, vision cone and detection on a 2D grid |
| `ResourceNode` | Resource nodes: HP, tool requirement, weighted drops, biome, respawn |
| `CreatureProfile` | Weighted random draw of creatures/opponents |

### Luck and Randomness

| Module | Description |
|---|---|
| `CardDeck` | Generic deck: shuffle, draw, discard, return |
| `DiceRoller` | Configurable dice: any faces, count, modifier, advantage/disadvantage |
| `Roulette` | Tilt roulette: spin with tilt forward, stop with second tilt + deceleration delay |

### Accessibility

| Module | Description |
|---|---|
| `AccessibilityLayer` | TalkBack/NVDA announcements (speak) and haptic feedback |

### Core Systems
*Generic infrastructure — useful in any game.*

| Module | Description |
|---|---|
| `StateMachine` | Generic finite state machine with integrated timers |
| `ScoreSystem` | Score, high score (localStorage), combos and multipliers |
| `TimerCountdown` | Countdown timer with pause, time bonus and urgency |

---

## InteractionSequence — quick reference

```js
// Sequence: shake → tilt_left → tilt_right (e.g. open a lock)
const lock = InteractionSequence.create({
  sequence: [
    { gesture: "shake"      },
    { gesture: "tilt_left",  timeoutMs: 2000 },
    { gesture: "tilt_right", timeoutMs: 2000 },
  ],
  globalTimeoutMs: 6000,
  strict: true,   // wrong gesture = failure
});

lock.on("started",   ()                       => { /* first correct gesture */ });
lock.on("progress",  ({ step, total })        => { /* progress feedback     */ });
lock.on("completed", ({ elapsed })            => { /* door open!            */ });
lock.on("failed",    ({ expected, received }) => { /* wrong gesture         */ });
lock.on("timeout",   ({ step })               => { /* time ran out          */ });

// SensorKit integration
SensorKit.on("shake",     () => lock.input("shake"));
SensorKit.on("tiltLeft",  () => lock.input("tilt_left"));
SensorKit.on("tiltRight", () => lock.input("tilt_right"));

// Shorthand for simple sequences
const combo = InteractionSequence.fromGestures(
  ["tilt_forward", "shake", "tilt_left"],
  { globalTimeoutMs: 5000 }
);
```

---

## Game architecture with grid

```
EXPLORATION (TiltCompass + GridMap + ResourceNode)
  Tilt turns the character → N/S/E/W
  TalkBack navigates the grid
  GridMap tracks position, direction and vision cone
  Resource nodes anchored to grid cells
         ↓
  Player selects cell (TalkBack double-tap)
  Shortcut bar at the bottom → active item/tool
  GridMap calculates distance player → target
         ↓
EXTRACTION (ResourceNode + RhythmTilt)
  ResourceNode checks tool, removes HP, draws drop
  RhythmTilt runs the collection mechanic
         ↓
COMBAT / INTERACTION (TensionSystem + TimedStrike + InteractionSequence)
  Tension, reaction windows or gesture sequences
  ScoreSystem and TimerCountdown integrated
         ↓
REWARD (CardDeck | DiceRoller | Roulette)
  Loot drawn via card, die or tilt roulette
```

---

## Structure

```
lib/                  ← library modules (branch: main)
games/                ← test minigames (branch: gh-pages)
  fishing/            ← line fishing (SensorKit + TensionSystem)
  spear/              ← primitive fishing / hunting (TimedStrike)
  mining/             ← mining (RhythmTilt)
```

---

## Usage

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

### Requirement for AccessibilityLayer

```html
<div id="announcer" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
```

---

## License / Licença

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

See [LICENSE](./LICENSE) for the full legal text.

---

## Compatibility

- Browser (GitHub Pages)
- Android APK via [Capacitor](https://capacitorjs.com)
- TalkBack (Android) and NVDA (Windows)