/**
 * TimerCountdown.js — ECJ Game Library
 * Countdown timer with pause, resume, extend, and urgency support.
 * The narrative is defined by the game — the lib manages only the time.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Emitted events (use .on(event, cb)):
 *   "tick"    → { remaining, total, pct }   a cada segundo
 *   "urgent"  → { remaining }               quando atinge urgencyThreshold
 *   "expired" → {}                           time ran out
 *   "paused"  → { remaining }               pausado
 *   "resumed" → { remaining }               retomado
 *   "added"   → { added, remaining }        time added (bonus/extension)
 *   "reset"   → { total }                   reiniciado
 *
 * Usage:
 *   import { TimerCountdown } from "../../lib/TimerCountdown.js";
 *
 *   const timer = TimerCountdown.create({ seconds: 60, urgencyThreshold: 10 });
 *   timer.on("tick",    ({ remaining, pct }) => updateBar(pct));
 *   timer.on("urgent",  ()                  => playUrgentSound());
 *   timer.on("expired", ()                  => endGame());
 *   timer.start();
 */

export const TimerCountdown = {

  /**
   * Creates a TimerCountdown instance.
   *
   * @param {object} options
   * @param {number}  [options.seconds]           total duration in seconds (default: 60)
   * @param {number}  [options.urgencyThreshold]  seconds remaining to emit "urgent" (default: 10)
   * @param {boolean} [options.loop]              auto-restart on expiry (default: false)
   */
  create({
    seconds           = 60,
    urgencyThreshold  = 10,
    loop              = false,
  } = {}) {

    // ── Eventos ──────────────────────────────────────────────────────────────
    const _listeners = {};

    function on(event, cb)  { (_listeners[event] ??= []).push(cb); }
    function off(event, cb) {
      if (_listeners[event]) _listeners[event] = _listeners[event].filter(f => f !== cb);
    }
    function _emit(event, data = {}) {
      (_listeners[event] ?? []).forEach(cb => cb(data));
    }

    // ── Estado ───────────────────────────────────────────────────────────────
    let _total     = seconds;
    let _remaining = seconds;
    let _interval  = null;
    let _state     = "idle";      // idle | running | paused | expired
    let _urgentFired = false;

    // ── Internos ─────────────────────────────────────────────────────────────
    function _tick() {
      _remaining--;

      const pct = _remaining / _total;
      _emit("tick", { remaining: _remaining, total: _total, pct });

      if (!_urgentFired && _remaining <= urgencyThreshold && _remaining > 0) {
        _urgentFired = true;
        _emit("urgent", { remaining: _remaining });
      }

      if (_remaining <= 0) {
        _clearInterval();
        _state = "expired";
        _emit("expired");
        if (loop) _startRunning();
      }
    }

    function _clearInterval() {
      if (_interval) { clearInterval(_interval); _interval = null; }
    }

    function _startRunning() {
      _clearInterval();
      _state       = "running";
      _urgentFired = _remaining <= urgencyThreshold;
      _interval    = setInterval(_tick, 1000);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /** Inicia o temporizador */
    function start() {
      if (_state === "running") return;
      _remaining   = _total;
      _urgentFired = false;
      _startRunning();
    }

    /** Pausa */
    function pause() {
      if (_state !== "running") return;
      _clearInterval();
      _state = "paused";
      _emit("paused", { remaining: _remaining });
    }

    /** Retoma após pausa */
    function resume() {
      if (_state !== "paused") return;
      _startRunning();
      _emit("resumed", { remaining: _remaining });
    }

    /** Para completamente (sem emitir expired) */
    function stop() {
      _clearInterval();
      _state = "idle";
    }

    /**
     * Resets with the original duration (or a new one).
     * @param {number} [newSeconds] optional new duration
     */
    function reset(newSeconds) {
      _clearInterval();
      if (newSeconds != null) _total = newSeconds;
      _remaining   = _total;
      _urgentFired = false;
      _state       = "idle";
      _emit("reset", { total: _total });
    }

    /**
     * Adds seconds to remaining time (bonus, extension).
     * @param {number} secs segundos a adicionar
     */
    function addTime(secs) {
      _remaining = Math.min(_remaining + secs, _total + secs);
      // If it was urgent but bonus pushed above threshold, allow re-firing
      if (_remaining > urgencyThreshold) _urgentFired = false;
      _emit("added", { added: secs, remaining: _remaining });
    }

    /** Segundos restantes */
    function remaining() { return _remaining; }

    /** Duração total configurada */
    function total()     { return _total; }

    /** Estado atual: idle | running | paused | expired */
    function state()     { return _state; }

    /** Percentual restante (0–1) */
    function pct()       { return _remaining / _total; }

    return { on, off, start, pause, resume, stop, reset, addTime, remaining, total, state, pct };
  }
};
