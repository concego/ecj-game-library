/**
 * TimedStrike.js — ECJ Game Library
 * Mecânica de janela de oportunidade: pesca primitiva, caça com lança, emboscada etc.
 * A narrativa é definida pelo jogo — a lib gerencia apenas a lógica de timing e reação.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Fluxo:
 *   IDLE → SURFACING → HIT | MISS
 *   Ataque fora de hora (sem alvo) → SPOOKED (penalidade)
 *
 * Parâmetros do perfil de alvo (via CreatureProfile):
 *   surfaceWindowMs  → tempo que o alvo fica visível (ms)
 *   cooldownMs       → intervalo entre aparições normais (ms)
 *   spookCooldownMs  → cooldown após espantar (ms) — deve ser > cooldownMs
 *   weight           → probabilidade de aparecer
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "surfacing"  → { creature }           alvo apareceu no campo
 *   "submerged"  → { creature, reason }   alvo sumiu ("timeout" | "spooked")
 *   "hit"        → { creature }           jogador acertou
 *   "miss"       → { creature }           alvo fugiu antes do ataque
 *   "spooked"    → {}                     ataque sem alvo — penalidade
 *   "cooldown"   → { ms }                 início do cooldown, informa duração
 *   "ready"      → {}                     pronto para próxima rodada
 *
 * Uso:
 *   import { TimedStrike } from "../../lib/TimedStrike.js";
 *   import { CreatureProfile } from "../../lib/CreatureProfile.js";
 *   import { SensorKit } from "../../lib/SensorKit.js";
 *   import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";
 *
 *   const pool = CreatureProfile.createPool([...]);
 *   const game = TimedStrike.create({ pool });
 *
 *   game.on("surfacing", ({ creature }) => { a11y.vibrate("bite"); speak("Alvo no campo!"); });
 *   game.on("hit",       ({ creature }) => { speak(`Capturado: ${creature.name}!`); });
 *   game.on("miss",      ({ creature }) => { speak("Fugiu!"); });
 *   game.on("spooked",   ()            => { speak("Você espantou os alvos!"); });
 *
 *   SensorKit.on("tilt", ({ direction }) => { if (direction === "forward") game.attack(); });
 *   // Desktop: document.addEventListener("keydown", e => { if (e.key === " ") game.attack(); });
 *
 *   game.start();
 */

export const TimedStrike = {
  create({
    pool,                        // CreatureProfile pool — obrigatório
    autoAdvance     = true,      // inicia próxima rodada automaticamente após cooldown
    defaultCooldown = 3000,      // cooldown padrão se o perfil não definir (ms)
    defaultSpookCooldown = 6000, // cooldown de penalidade padrão (ms)
  } = {}) {

    if (!pool) throw new Error("[TimedStrike] pool é obrigatório.");

    // ── Eventos ─────────────────────────────────────────────────────────────
    const _callbacks = {};

    function on(event, cb) {
      if (!_callbacks[event]) _callbacks[event] = [];
      _callbacks[event].push(cb);
    }

    function off(event, cb) {
      if (!_callbacks[event]) return;
      _callbacks[event] = _callbacks[event].filter(fn => fn !== cb);
    }

    function _emit(event, data) {
      (_callbacks[event] || []).forEach(fn => fn(data));
    }

    // ── Estado interno ───────────────────────────────────────────────────────
    // "idle" | "surfacing" | "cooldown" | "stopped"
    let _state        = "idle";
    let _current      = null;   // criatura ativa
    let _surfaceTimer = null;
    let _cooldownTimer= null;

    function state() { return _state; }

    // ── Lógica principal ─────────────────────────────────────────────────────

    function _clearTimers() {
      clearTimeout(_surfaceTimer);
      clearTimeout(_cooldownTimer);
      _surfaceTimer  = null;
      _cooldownTimer = null;
    }

    function _startCooldown(ms) {
      _state   = "cooldown";
      _current = null;
      _emit("cooldown", { ms });
      if (autoAdvance) {
        _cooldownTimer = setTimeout(() => {
          _cooldownTimer = null;
          _emit("ready");
          _nextRound();
        }, ms);
      }
    }

    function _nextRound() {
      if (_state === "stopped") return;
      _state   = "surfacing";
      _current = pool.roll();

      const windowMs     = _current.surfaceWindowMs  ?? 2000;
      const cooldownMs   = _current.cooldownMs       ?? defaultCooldown;

      _emit("surfacing", { creature: { ..._current } });

      // Alvo some após surfaceWindowMs sem ataque
      _surfaceTimer = setTimeout(() => {
        _surfaceTimer = null;
        _state = "idle";
        const escaped = { ..._current };
        _current = null;
        _emit("submerged", { creature: escaped, reason: "timeout" });
        _emit("miss",      { creature: escaped });
        _startCooldown(cooldownMs);
      }, windowMs);
    }

    // ── API pública ──────────────────────────────────────────────────────────

    /** Jogador ataca — chamar no tilt forward ou Espaço (desktop) */
    function attack() {
      if (_state === "surfacing" && _current) {
        // Acerto
        _clearTimers();
        const hit = { ..._current };
        _current = null;
        _state   = "idle";
        _emit("submerged", { creature: hit, reason: "hit" });
        _emit("hit",       { creature: hit });
        const cooldownMs = hit.cooldownMs ?? defaultCooldown;
        _startCooldown(cooldownMs);

      } else if (_state === "idle" || _state === "cooldown") {
        // Ataque sem alvo — penalidade
        _clearTimers();
        _state = "idle";
        _emit("spooked");
        const spookMs = defaultSpookCooldown;
        _startCooldown(spookMs);
      }
      // Se _state === "surfacing" mas _current já foi limpo (race), ignora silenciosamente
    }

    /** Inicia o jogo */
    function start() {
      _clearTimers();
      _state   = "idle";
      _current = null;
      _nextRound();
    }

    /** Para o jogo */
    function stop() {
      _clearTimers();
      _state   = "stopped";
      _current = null;
    }

    /** Avança manualmente para a próxima rodada (quando autoAdvance=false) */
    function next() {
      if (_state === "cooldown" || _state === "idle") {
        _clearTimers();
        _nextRound();
      }
    }

    return { on, off, attack, start, stop, next, state };
  }
};
