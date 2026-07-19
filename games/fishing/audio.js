/**
 * audio.js — Minigame de Pesca (gh-pages)
 * Sons sintéticos via Web Audio API — apenas para testes.
 * NÃO faz parte da ECJ Game Library (lib/).
 *
 * Exporta o objeto FishingAudio para uso no game.js.
 */

const _ctx = new (window.AudioContext || window.webkitAudioContext)();

function _unlock() {
  if (_ctx.state === "suspended") _ctx.resume();
  document.removeEventListener("click",     _unlock);
  document.removeEventListener("touchstart", _unlock);
  document.removeEventListener("keydown",   _unlock);
}
document.addEventListener("click",      _unlock, { once: true });
document.addEventListener("touchstart", _unlock, { once: true });
document.addEventListener("keydown",    _unlock, { once: true });

// ── Primitivos ────────────────────────────────────────────────────────────

function _tone({ freq = 440, type = "sine", duration = 0.2, gain = 0.4,
                 attack = 0.01, decay = 0.05, freqEnd, delay = 0 } = {}) {
  const t = _ctx.currentTime + delay;
  const osc = _ctx.createOscillator();
  const env = _ctx.createGain();
  osc.connect(env);
  env.connect(_ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + attack);
  env.gain.linearRampToValueAtTime(0, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function _noise({ duration = 0.15, gain = 0.3, freq = 800, q = 1, delay = 0 } = {}) {
  const t = _ctx.currentTime + delay;
  const buf = _ctx.createBuffer(1, _ctx.sampleRate * duration, _ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = _ctx.createBufferSource();
  src.buffer = buf;
  const filter = _ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = _ctx.createGain();
  src.connect(filter);
  filter.connect(env);
  env.connect(_ctx.destination);
  env.gain.setValueAtTime(gain, t);
  env.gain.linearRampToValueAtTime(0, t + duration);
  src.start(t);
  src.stop(t + duration + 0.05);
}

// ── Sons do jogo ──────────────────────────────────────────────────────────

let _reelInterval = null;

export const FishingAudio = {

  // Lançamento: whoosh descendente
  cast() {
    _tone({ freq: 600, freqEnd: 200, type: "sawtooth", duration: 0.35, gain: 0.3, attack: 0.01 });
  },

  // Splash na água
  splash() {
    _noise({ duration: 0.25, gain: 0.5, freq: 1200, q: 0.8 });
    _tone({ freq: 180, freqEnd: 80, type: "sine", duration: 0.3, gain: 0.25, delay: 0.05 });
  },

  // Mordida: dois clicks rápidos
  bite() {
    _tone({ freq: 900, type: "square", duration: 0.06, gain: 0.5, attack: 0.005 });
    _tone({ freq: 700, type: "square", duration: 0.06, gain: 0.4, attack: 0.005, delay: 0.1 });
  },

  // Carretel: loop de tick enquanto puxa
  startReel() {
    if (_reelInterval) return;
    _reelInterval = setInterval(() => {
      _tone({ freq: 1200, type: "square", duration: 0.04, gain: 0.15, attack: 0.005 });
    }, 120);
  },

  stopReel() {
    clearInterval(_reelInterval);
    _reelInterval = null;
  },

  // Captura: acorde ascendente
  caught() {
    [523, 659, 784, 1047].forEach((f, i) => {
      _tone({ freq: f, type: "triangle", duration: 0.3, gain: 0.4, attack: 0.01, delay: i * 0.08 });
    });
  },

  // Linha arrebentada: queda descendente + ruído
  snap() {
    _tone({ freq: 400, freqEnd: 80, type: "sawtooth", duration: 0.4, gain: 0.5, attack: 0.005 });
    _noise({ duration: 0.3, gain: 0.4, freq: 600, q: 0.5, delay: 0.05 });
  },

  // Ponto normal
  pointNormal() {
    _tone({ freq: 660, type: "sine", duration: 0.15, gain: 0.35, attack: 0.01 });
    _tone({ freq: 880, type: "sine", duration: 0.15, gain: 0.35, attack: 0.01, delay: 0.12 });
  },

  // Ponto especial (peixe raro)
  pointSpecial() {
    [523, 659, 784, 880, 1047].forEach((f, i) => {
      _tone({ freq: f, type: "sine", duration: 0.2, gain: 0.4, attack: 0.01, delay: i * 0.06 });
    });
  },
};

window.FishingAudio = FishingAudio;
