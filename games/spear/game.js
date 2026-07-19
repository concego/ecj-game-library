/**
 * game.js — Minigame de Pesca Primitiva (gh-pages)
 * Usa SpearFishing, CreatureProfile, SensorKit, AccessibilityLayer da ECJ lib.
 */

import { SpearFishing }       from "../../lib/SpearFishing.js";
import { CreatureProfile }    from "../../lib/CreatureProfile.js";
import { SensorKit }          from "../../lib/SensorKit.js";
import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";

// ── Pool de alvos ────────────────────────────────────────────────────────────
const pool = CreatureProfile.createPool([
  {
    id: "small_fish",
    name: "Peixinho",
    weight: 0.45,
    points: 1,
    surfaceWindowMs: 2200,
    cooldownMs: 2500,
    spookCooldownMs: 5000,
  },
  {
    id: "medium_fish",
    name: "Peixe",
    weight: 0.30,
    points: 2,
    surfaceWindowMs: 1800,
    cooldownMs: 2800,
    spookCooldownMs: 6000,
  },
  {
    id: "large_fish",
    name: "Peixão",
    weight: 0.15,
    points: 4,
    surfaceWindowMs: 1400,
    cooldownMs: 3200,
    spookCooldownMs: 7000,
  },
  {
    id: "rare_fish",
    name: "Peixe Raro",
    weight: 0.07,
    points: 8,
    surfaceWindowMs: 1000,
    cooldownMs: 4000,
    spookCooldownMs: 9000,
  },
  {
    id: "legendary",
    name: "Lendário",
    weight: 0.03,
    points: 15,
    surfaceWindowMs: 800,
    cooldownMs: 5000,
    spookCooldownMs: 12000,
  },
]);

// ── UI helpers ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function setLabel(text)  { $("state-label").textContent = text; }
function setHint(text)   { $("hint-area").textContent = text; }
function setScore(s, b)  {
  $("score").textContent = s;
  $("best").textContent  = b;
}

// ── Estado da sessão ─────────────────────────────────────────────────────────
let score = 0;
let best  = parseInt(localStorage.getItem("spear_best") || "0");

function addPoints(n) {
  score += n;
  if (score > best) {
    best = score;
    localStorage.setItem("spear_best", best);
  }
  setScore(score, best);
}

// ── Acessibilidade ───────────────────────────────────────────────────────────
const a11y = AccessibilityLayer.create({ announcerId: "announcer" });

function speak(text) { a11y.speak(text); }

// ── Jogo ─────────────────────────────────────────────────────────────────────
const game = SpearFishing.create({
  pool,
  defaultCooldown:      3000,
  defaultSpookCooldown: 7000,
});

game.on("surfacing", ({ creature }) => {
  setLabel(`${creature.name} na água!`);
  setHint("🌊");
  speak(`${creature.name} na água! Ataque agora!`);
  a11y.vibrate("bite");
  FishingAudio.bite();
});

game.on("hit", ({ creature }) => {
  setLabel(`Acertou! +${creature.points} pontos`);
  setHint("🎯");
  speak(`Acertou! ${creature.name} capturado. ${creature.points} pontos.`);
  a11y.vibrate("caught");
  FishingAudio.pointNormal();
  addPoints(creature.points);
});

game.on("miss", ({ creature }) => {
  setLabel(`${creature.name} fugiu!`);
  setHint("💨");
  speak(`${creature.name} fugiu.`);
  a11y.vibrate("warning");
});

game.on("spooked", () => {
  setLabel("Você espantou os alvos!");
  setHint("😱");
  speak("Você espantou os alvos. Aguarde mais tempo.");
  a11y.vibrate("snap");
  FishingAudio.snap();
});

game.on("cooldown", ({ ms }) => {
  const sec = (ms / 1000).toFixed(1);
  setLabel(`Aguardando... (${sec}s)`);
  setHint("⏳");
});

game.on("ready", () => {
  setLabel("Pronto — fique atento!");
  setHint("👁");
  speak("Pronto. Fique atento à vibração.");
});

// ── Sensor: tilt forward = ataque ───────────────────────────────────────────
SensorKit.on("tilt", ({ direction }) => {
  if (direction === "forward") game.attack();
});

// ── Desktop: Espaço = ataque ─────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === " ") { e.preventDefault(); game.attack(); }
});

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  a11y.init();
  setScore(score, best);
  SensorKit.enableDesktopFallback();

  $("btn-start").addEventListener("click", async () => {
    $("btn-start").style.display = "none";
    await SensorKit.requestPermission();
    SensorKit.start();
    score = 0;
    setScore(score, best);
    speak("Jogo iniciado. Fique atento à vibração.");
    setLabel("Fique atento!");
    setHint("👁");
    game.start();
  });
});
