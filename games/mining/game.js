/**
 * game.js — Minigame de Mineração (gh-pages)
 * Demonstra o RhythmTilt com narrativa de mineração.
 * Usa RhythmTilt, SensorKit e AccessibilityLayer da ECJ lib.
 */

import { RhythmTilt }         from "../../lib/RhythmTilt.js";
import { SensorKit }          from "../../lib/SensorKit.js";
import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";

// ── DOM ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const a11y = AccessibilityLayer.create({ announcerId: "announcer" });

function speak(text)      { a11y.speak(text); a11y.vibrate("tick"); }
function setLabel(text)   { $("state-label").textContent = text; }
function setHint(text)    { $("hint-area").textContent = text; }
function setProgress(v)   {
  const pct = Math.round(v * 100);
  $("progress-bar").style.width = pct + "%";
  $("progress-container").setAttribute("aria-valuenow", pct);
}
function setScore(s, b)   {
  $("score").textContent = s;
  $("best").textContent  = b;
}

// ── Estado do jogo ───────────────────────────────────────────────────────────
let score = 0;
let best  = parseInt(localStorage.getItem("mining_best") || "0");
let misses = 0;

// ── RhythmTilt ───────────────────────────────────────────────────────────────
const rhythm = RhythmTilt.create({
  bpm:          52,    // ~um golpe por segundo — confortável
  toleranceMs:  350,   // margem generosa para acessibilidade
  streakNeeded: 6,     // 6 batidas certas = um minério coletado
  maxMisses:    3,     // 3 erros = ferramenta danificada / falha
  resetOnMiss:  true,
});

rhythm.on("tick", ({ direction }) => {
  const arrow = direction === "forward" ? "⬇️" : "⬆️";
  const hint  = direction === "forward" ? "Incline para frente" : "Incline para trás";
  setHint(arrow);
  setLabel(hint);
  a11y.vibrate("tick");
});

rhythm.on("beat", ({ streak }) => {
  setProgress(streak / 6);
  speak(`Batida ${streak}`);
});

rhythm.on("miss", ({ misses: m }) => {
  misses = m;
  a11y.vibrate("warning");
  speak(`Erro! ${3 - m} chances restantes`);
  setHint("❌");
});

rhythm.on("complete", () => {
  score++;
  if (score > best) {
    best = score;
    localStorage.setItem("mining_best", best);
  }
  setScore(score, best);
  setProgress(1);
  a11y.vibrate("caught");
  speak(`Minério coletado! Total: ${score}`);
  setLabel("Minério coletado!");
  setHint("💎");

  // Reinicia após pausa curta com BPM levemente maior (dificuldade progressiva)
  setTimeout(() => {
    misses = 0;
    setProgress(0);
    const newBpm = Math.min(52 + score * 3, 90); // máximo 90 bpm
    rhythm.setBpm(newBpm);
    rhythm.start();
  }, 1500);
});

rhythm.on("fail", ({ misses: m }) => {
  a11y.vibrate("snap");
  speak(`Ferramenta danificada! ${m} erros. Recomeçando...`);
  setLabel("Ferramenta danificada!");
  setHint("🔨💥");
  setProgress(0);

  setTimeout(() => {
    misses = 0;
    rhythm.start();
  }, 2000);
});

// ── SensorKit ────────────────────────────────────────────────────────────────
SensorKit.on("tilt", ({ direction }) => {
  if (direction === "forward" || direction === "back") {
    rhythm.input(direction);
  }
});

// Desktop: ↑ = forward, ↓ = back
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp")   rhythm.input("forward");
  if (e.key === "ArrowDown") rhythm.input("back");
});

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  a11y.init();
  SensorKit.enableDesktopFallback();
  setScore(score, best);

  $("btn-start").addEventListener("click", async () => {
    $("btn-start").style.display = "none";
    await SensorKit.requestPermission();
    SensorKit.start();
    speak("Mineração iniciada. Siga o ritmo!");
    setLabel("Siga o ritmo!");
    setHint("⬇️");
    rhythm.start();
  });
});
