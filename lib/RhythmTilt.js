/**
 * RhythmTilt.js — ECJ Game Library
 * Rhythmic tilt mechanic: mining, rowing, sawing, forging, pumping, etc.
 * The narrative is defined by the game — the lib manages only the rhythm and beat detection.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Fluxo:
 *   IDLE → RUNNING → (correct beats until streakNeeded) → "complete"
 *                  → (accumulated misses until maxMisses)    → "fail"
 *
 * Parameters:
 *   bpm           → target rhythm in beats per minute (default: 60)
 *   toleranceMs   → timing tolerance per beat in ms (default: 300)
 *   streakNeeded  → consecutive correct beats for "complete" (default: 8)
 *   maxMisses     → misses until "fail" (default: 3, 0 = no limit)
 *   resetOnMiss   → lose streak on miss? (default: true)
 *
 * Emitted events (use .on(event, cb)):
 *   "beat"      → { streak, direction }   beat hit on time
 *   "miss"      → { streak, misses }      beat hit off rhythm or wrong direction
 *   "complete"  → { totalBeats }          streakNeeded atingido
 *   "fail"      → { misses }              maxMisses atingido
 *   "tick"      → { direction, progress } pulso interno — indica quando bater
 *
 * Usage:
 *   import { RhythmTilt } from "../../lib/RhythmTilt.js";
 *
 *   const rhythm = RhythmTilt.create({
 *     bpm: 60,
 *     toleranceMs: 300,
 *     streakNeeded: 8,
 *     maxMisses: 3,
 *     resetOnMiss: true,
 *   });
 *
 *   rhythm.on("beat",     ({ streak }) => { ... });
 *   rhythm.on("miss",     ({ misses }) => { ... });
 *   rhythm.on("complete", ()           => { ... });
 *   rhythm.on("fail",     ()           => { ... });
 *   rhythm.on("tick",     ({ direction }) => { ... }); // mostra dica visual/sonora
 *
 *   // Conectar ao SensorKit:
 *   SensorKit.on("tilt", ({ direction }) => rhythm.input(direction));
 *
 *   rhythm.start();
 */

export const RhythmTilt = {
  create({
    bpm          = 60,
    toleranceMs  = 300,
    streakNeeded = 8,
    maxMisses    = 3,
    resetOnMiss  = true,
  } = {}) {

    const _callbacks = {};
    let _state      = "idle";   // "idle" | "running" | "stopped"
    let _streak     = 0;
    let _misses     = 0;
    let _totalBeats = 0;
    let _tickInterval = null;
    let _tickIndex    = 0;      // 0 = espera "forward", 1 = espera "back"
    let _lastTickAt   = 0;
    let _inputConsumed = false; // impede múltiplos inputs no mesmo tick

    // ── Eventos ─────────────────────────────────────────────────────────────
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

    // ── Expected direction per tick ────────────────────────────────────────────
    // Alterna: forward → back → forward → back...
    function _expectedDirection() {
      return _tickIndex % 2 === 0 ? "forward" : "back";
    }

    // ── Tick interno (pulso do ritmo) ────────────────────────────────────────
    function _tick() {
      if (_state !== "running") return;

      // If previous tick was not answered → miss by omission
      if (!_inputConsumed && _tickIndex > 0) {
        _registerMiss();
        if (_state !== "running") return;
      }

      _inputConsumed = false;
      _lastTickAt    = Date.now();

      const direction = _expectedDirection();
      const progress  = streakNeeded > 0 ? _streak / streakNeeded : 0;
      _emit("tick", { direction, progress, streak: _streak });

      _tickIndex++;
    }

    // ── Miss ────────────────────────────────────────────────────────────────
    function _registerMiss() {
      if (resetOnMiss) _streak = 0;
      _misses++;
      _emit("miss", { streak: _streak, misses: _misses });

      if (maxMisses > 0 && _misses >= maxMisses) {
        _stop();
        _emit("fail", { misses: _misses });
      }
    }

    // ── Input externo (vem do SensorKit ou teclado) ─────────────────────────
    function input(direction) {
      if (_state !== "running") return;

      const now     = Date.now();
      const elapsed = now - _lastTickAt;
      const inWindow = elapsed <= toleranceMs;

      if (_inputConsumed) return; // já respondeu neste tick

      if (inWindow && direction === _expectedDirection()) {
        // Batida correta
        _inputConsumed = true;
        _streak++;
        _totalBeats++;
        _emit("beat", { streak: _streak, direction, totalBeats: _totalBeats });

        if (streakNeeded > 0 && _streak >= streakNeeded) {
          _stop();
          _emit("complete", { totalBeats: _totalBeats });
        }
      } else {
        // Out of window or wrong direction
        _inputConsumed = true; // consumido mesmo no erro para evitar spam
        _registerMiss();
      }
    }

    // ── Controle ─────────────────────────────────────────────────────────────
    function _stop() {
      clearInterval(_tickInterval);
      _tickInterval = null;
      _state = "idle";
    }

    function start() {
      if (_state === "running") return;
      _streak        = 0;
      _misses        = 0;
      _totalBeats    = 0;
      _tickIndex     = 0;
      _inputConsumed = false;
      _lastTickAt    = 0;
      _state         = "running";

      const intervalMs = Math.round(60000 / bpm);
      _tick(); // dispara imediatamente o primeiro tick
      _tickInterval = setInterval(_tick, intervalMs);
    }

    function stop() {
      _stop();
      _state = "stopped";
    }

    function reset() {
      stop();
      _streak     = 0;
      _misses     = 0;
      _totalBeats = 0;
      _tickIndex  = 0;
    }

    // Dynamic BPM adjustment at runtime (progressive difficulty)
    function setBpm(newBpm) {
      bpm = newBpm;
      if (_state === "running") {
        _stop();
        _state = "running";
        const intervalMs = Math.round(60000 / bpm);
        _tickInterval = setInterval(_tick, intervalMs);
      }
    }

    function state()  { return _state; }
    function streak() { return _streak; }
    function misses() { return _misses; }

    return { on, off, input, start, stop, reset, setBpm, state, streak, misses };
  }
};
