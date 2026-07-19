/**
 * game.js — Minigame de Pesca (gh-pages)
 * Porta a lógica do Bites & Baits usando a ECJ Game Library.
 *
 * Módulos usados:
 *   SensorKit        → tilt (lançar/puxar) e shake (fisgar)
 *   StateMachine     → máquina de estados do jogo
 *   TensionSystem    → tensão da linha durante o REELING
 *   CreatureProfile  → sorteio ponderado de peixes
 *   AccessibilityLayer → speak() TalkBack-safe e vibração
 *
 * Estados:
 *   IDLE     → aguardando início (incline para frente)
 *   CASTING  → lançamento em andamento
 *   WAITING  → isca na água, esperando peixe
 *   BITING   → peixe mordeu — shake para fisgar!
 *   REELING  → fisgado, incline para trás para puxar
 *   CAUGHT   → peixe capturado
 *   SNAPPED  → linha arrebentou
 */

import { SensorKit }          from "../../lib/SensorKit.js";
import { StateMachine }       from "../../lib/StateMachine.js";
import { TensionSystem }      from "../../lib/TensionSystem.js";
import { CreatureProfile }    from "../../lib/CreatureProfile.js";
import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";

// ── UI ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const ui = {
  stateLabel:       () => $("state-label"),
  hintArea:         () => $("hint-area"),
  score:            () => $("score"),
  best:             () => $("best"),
  tensionContainer: () => $("tension-container"),
  tensionBar:       () => $("tension-bar"),
  btnStart:         () => $("btn-start"),
};

// ── Acessibilidade ────────────────────────────────────────────────────────
const a11y = AccessibilityLayer.create({ announcerId: "announcer" });

function speak(text) { a11y.speak(text); }

function setLabel(text) {
  ui.stateLabel().textContent = text;
}

function setHint(emoji, text) {
  ui.hintArea().textContent = `${emoji} ${text}`;
}

// ── Pool de peixes ────────────────────────────────────────────────────────
const fishPool = CreatureProfile.createPool([
  { id: "lambari",   name: "Lambari",      weight: 0.40, pull: 2, pullNeeded: 4,  biteWindowMs: 2200, tiredBaseMs: 3000, rare: false },
  { id: "tilapia",   name: "Tilápia",      weight: 0.25, pull: 4, pullNeeded: 7,  biteWindowMs: 1800, tiredBaseMs: 4500, rare: false },
  { id: "tucunare",  name: "Tucunaré",     weight: 0.18, pull: 6, pullNeeded: 10, biteWindowMs: 1400, tiredBaseMs: 6000, rare: false },
  { id: "dourado",   name: "Dourado",      weight: 0.10, pull: 8, pullNeeded: 14, biteWindowMs: 1000, tiredBaseMs: 8000, rare: false },
  { id: "piranha",   name: "Piranha",      weight: 0.05, pull: 7, pullNeeded: 10, biteWindowMs: 900,  tiredBaseMs: 5000, rare: true  },
  { id: "pirarucu",  name: "Pirarucu 🏆",  weight: 0.02, pull: 10,pullNeeded: 20, biteWindowMs: 800,  tiredBaseMs:12000, rare: true  },
]);

// ── Estado do jogo ────────────────────────────────────────────────────────
let score       = 0;
let best        = 0;
let currentFish = null;
let pullCount   = 0;

// ── TensionSystem ─────────────────────────────────────────────────────────
let tension = null;

function buildTension(fish) {
  return TensionSystem.create({
    initial:       30,
    playerForce:   3,
    opponentForce: fish.pull * 0.5,
    tickMs:        120,
    snapAt:        100,
    releaseAt:     0,
    onUpdate(value, level) {
      const bar = ui.tensionBar();
      bar.style.width = `${value}%`;
      bar.className = `tension-${level === "critical" ? "danger" : level}`;
      ui.tensionContainer().setAttribute("aria-valuenow", value);
      if (level === "critical") a11y.vibrate("warning");
    },
    onSnap() {
      fsm.send("snap");
    },
  });
}

// ── StateMachine ──────────────────────────────────────────────────────────
const fsm = StateMachine.create({
  initial: "IDLE",
  states: {

    IDLE: {
      onEnter() {
        setLabel("Pronto para pescar");
        setHint("↕", "Incline para frente para lançar");
        a11y.vibrate([60, 40, 60]);   // feedback tátil: pronto pra lançar de novo
        speak("Incline o celular para frente para lançar a isca.");
        ui.tensionContainer().classList.add("hidden");
        ui.btnStart().style.display = "block";
      },
    },

    CASTING: {
      onEnter() {
        setLabel("Lançando...");
        setHint("↑", "Lançando a isca...");
        speak("Lançando.");
        window.FishingAudio?.cast();
        a11y.vibrate("tick");
        fsm.after(600, () => fsm.send("land"));
      },
    },

    WAITING: {
      onEnter() {
        currentFish = fishPool.roll();
        pullCount   = 0;
        setLabel("Aguardando...");
        setHint("🎣", "Isca na água. Aguarde o peixe...");
        speak("Isca na água. Aguarde.");
        window.FishingAudio?.splash();
        ui.tensionContainer().classList.add("hidden");

        const waitMs = 2000 + Math.random() * 4000;
        fsm.after(waitMs, () => fsm.send("bite"));
      },
    },

    BITING: {
      onEnter({ to }) {
        setLabel("Peixe mordeu!");
        setHint("🐟", "SHAKE para fisgar!");
        speak(`Peixe mordeu! Sacuda o celular para fisgar!`);
        window.FishingAudio?.bite();
        a11y.vibrate("bite");

        fsm.after(currentFish.biteWindowMs, () => {
          if (fsm.is("BITING")) {
            a11y.vibrate([200, 100, 200]);  // feedback tátil: peixe escapou
            fsm.send("miss");
          }
        });
      },
    },

    REELING: {
      onEnter() {
        pullCount = 0;
        setLabel(`Puxando — ${currentFish.name}!`);
        setHint("↓", "Incline para trás para puxar!");
        speak(`Fisgou! Incline para trás para puxar o ${currentFish.name}.`);
        window.FishingAudio?.startReel();
        ui.tensionContainer().classList.remove("hidden");

        tension = buildTension(currentFish);
        tension.start();

        // Peixe cansa após tiredBaseMs e a tensão começa a cair sozinha
        fsm.after(currentFish.tiredBaseMs, () => {
          if (fsm.is("REELING") && tension) {
            tension.stop();
            // tensão passa a cair sozinha
            tension = TensionSystem.create({
              initial: tension.value(),
              playerForce:   5,
              opponentForce: 0,
              tickMs:        120,
              snapAt:        100,
              releaseAt:     0,
              onUpdate(value, level) {
                const bar = ui.tensionBar();
                bar.style.width = `${value}%`;
                bar.className = `tension-${level === "critical" ? "danger" : level}`;
                ui.tensionContainer().setAttribute("aria-valuenow", value);
              },
            });
            tension.start();
            speak("O peixe cansou! Continue puxando!");
          }
        });
      },
      onExit() {
        window.FishingAudio?.stopReel();
        tension?.stop();
        tension = null;
      },
    },

    CAUGHT: {
      onEnter() {
        const pts = currentFish.rare ? currentFish.pullNeeded * 2 : currentFish.pullNeeded;
        score += pts;
        if (score > best) best = score;
        ui.score().textContent = score;
        ui.best().textContent  = best;

        setLabel(`Capturado! ${currentFish.name} (+${pts} pts)`);
        setHint("🏆", "");
        speak(`Capturou ${currentFish.name}! Mais ${pts} pontos. Total: ${score}.`);
        window.FishingAudio?.[currentFish.rare ? "pointSpecial" : "pointNormal"]();
        window.FishingAudio?.caught();
        a11y.vibrate("caught");
        ui.tensionContainer().classList.add("hidden");

        fsm.after(2500, () => fsm.send("reset"));
      },
    },

    SNAPPED: {
      onEnter() {
        setLabel("Linha arrebentou!");
        setHint("💔", "Linha arrebentou...");
        speak("A linha arrebentou. Tente novamente.");
        window.FishingAudio?.snap();
        a11y.vibrate("snap");
        ui.tensionContainer().classList.add("hidden");

        fsm.after(2000, () => fsm.send("reset"));
      },
    },
  },

  transitions: {
    start:  { from: "IDLE",    to: "CASTING"  },
    land:   { from: "CASTING", to: "WAITING"  },
    bite:   { from: "WAITING", to: "BITING"   },
    hook:   { from: "BITING",  to: "REELING"  },
    miss:   { from: "BITING",  to: "WAITING"  },
    catch:  { from: "REELING", to: "CAUGHT"   },
    snap:   { from: ["REELING", "BITING"], to: "SNAPPED" },
    reset:  { from: "*",       to: "IDLE"     },
  },
});

// ── Sensores ──────────────────────────────────────────────────────────────
SensorKit.on("tilt", ({ direction }) => {
  if (fsm.is("IDLE") && direction === "forward") {
    fsm.send("start");
  }

  if (fsm.is("REELING") && direction === "back") {
    tension?.applyPlayer();
    pullCount++;
    if (pullCount >= currentFish.pullNeeded) {
      fsm.send("catch");
    }
  }
});

SensorKit.on("shake", () => {
  if (fsm.is("BITING")) {
    fsm.send("hook");
  }
});

// ── Inicialização ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  a11y.init();
  SensorKit.enableDesktopFallback();

  ui.btnStart().addEventListener("click", async () => {
    ui.btnStart().style.display = "none";
    await SensorKit.requestPermission();
    SensorKit.start();
    speak("Jogo iniciado. Incline o celular para frente para lançar.");
    setLabel("Incline para frente para lançar");
    setHint("↕", "Incline para frente para lançar");
  });
});
