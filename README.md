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
| `ResourceNode` | Nós de recursos no grid: HP, ferramenta, drops ponderados, bioma, respawn |

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
import { ResourceNode }       from "./lib/ResourceNode.js";
```

---

## ResourceNode — referência rápida

```js
// Registra um bioma (geração procedural)
ResourceNode.registerBiome("forest", {
  hp:           80,
  requiredTool: "axe",
  respawnMs:    30000,
  drops: [
    { item: "wood",        weight: 10, minPower: 0  },
    { item: "hardwood",    weight: 3,  minPower: 40 },
    { item: "rare_resin",  weight: 1,  minPower: 70 },
  ],
});

// Cria node a partir do bioma — pronto para geração procedural
const tree = ResourceNode.fromBiome("forest", { cell: { col: 3, row: 2 } });

tree.on("extracted", ({ item, power, hpRemaining }) => { /* drop sorteado */ });
tree.on("depleted",  ({ cell }) => { /* remove do mapa visualmente */ });
tree.on("respawned", ({ cell }) => { /* recoloca no mapa */ });

// Extrai com ferramenta
tree.extract({ id: "axe", power: 50 });  // power alto → drops melhores, menos tentativas
tree.extract(null);                       // sem ferramenta → "failed" se requiredTool != null
```

---

## Compatibilidade

- Browser (GitHub Pages)
- Android APK via [Capacitor](https://capacitorjs.com)
- TalkBack (Android) e NVDA (Windows)

---

## Licença

MIT