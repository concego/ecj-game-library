/**
 * TimerCountdown.js — ECJ Game Library
 * Temporizador regressivo com suporte a pausar, retomar, prorrogar e urgência.
 * A narrativa é definida pelo jogo — a lib gerencia apenas o tempo.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "tick"    → { remaining, total, pct }   a cada segundo
 *   "urgent"  → { remaining }               quando atinge urgencyThreshold
 *   "expired" → {}                           tempo esgotado
 *   "paused"  → { remaining }               pausado
 *   "resumed" → { remaining }               retomado
 *   "added"   → { added, remaining }        tempo adicionado (bônus/prorrogação)
 *   "reset"   → { total }                   reiniciado
 *
 * Uso:
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
   * Cria uma instância do TimerCountdown.
   *
   * @param {object} options
   * @param {number}  [options.seconds]           duração total em segundos (padrão: 60)
   * @param {number}  [options.urgencyThreshold]  segundos restantes para emitir "urgent" (padrão: 10)
   * @param {boolean} [options.loop]              reinicia automaticamente ao expirar (padrão: false)
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

    // ── API pública ──────────────────────────────────────────────────────────

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
     * Reinicia com a duração original (ou uma nova).
     * @param {number} [newSeconds] nova duração opcional
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
     * Adiciona segundos ao tempo restante (bônus, prorrogação).
     * @param {number} secs segundos a adicionar
     */
    function addTime(secs) {
      _remaining = Math.min(_remaining + secs, _total + secs);
      // Se estava urgente mas o bônus puxou acima do threshold, permite re-disparar
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
