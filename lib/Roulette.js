/**
 * Roulette.js — ECJ Game Library
 * Roleta com controle via tilt: tilt pra frente gira, segundo tilt inicia parada.
 * A narrativa é definida pelo jogo — a lib gerencia apenas o giro, o delay e o slot.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Fluxo:
 *   IDLE → tilt "forward" → SPINNING → tilt "forward" → STOPPING → LANDED
 *
 * Parâmetros:
 *   slots          → array de { id, label, weight } — slots da roleta
 *   spinDuration   → tempo mínimo girando antes de aceitar parada (ms, padrão: 1500)
 *   stopDuration   → delay de desaceleração após o input de parada (ms, padrão: 1200)
 *   tiltThreshold  → inclinação mínima para ativar (graus, padrão: 20)
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "spinning"  → {}                  roleta começou a girar
 *   "tick"      → { slot, index, pct} passando por um slot durante o giro
 *   "stopping"  → { remaining }       desaceleração iniciada, ms até parar
 *   "landed"    → { slot }            slot final sorteado
 *   "reset"     → {}                  voltou para idle
 *
 * Uso:
 *   import { Roulette }   from "../../lib/Roulette.js";
 *   import { SensorKit }  from "../../lib/SensorKit.js";
 *
 *   const roulette = Roulette.create({
 *     slots: [
 *       { id: "gold",   label: "Ouro",   weight: 1 },
 *       { id: "silver", label: "Prata",  weight: 3 },
 *       { id: "wood",   label: "Madeira",weight: 6 },
 *       { id: "empty",  label: "Vazio",  weight: 8 },
 *     ],
 *     spinDuration: 1500,
 *     stopDuration: 1200,
 *   });
 *
 *   roulette.on("spinning", () => { ... });
 *   roulette.on("tick",     ({ slot }) => { ... });
 *   roulette.on("stopping", ({ remaining }) => { ... });
 *   roulette.on("landed",   ({ slot }) => { ... });
 *
 *   // Conectar ao SensorKit
 *   SensorKit.on("tilt", ({ direction }) => roulette.input(direction));
 *
 *   // Teclado (PC): Espaço
 *   document.addEventListener("keydown", e => {
 *     if (e.code === "Space") roulette.input("forward");
 *   });
 */

export const Roulette = {
  create({
    slots        = [],
    spinDuration = 1500,
    stopDuration = 1200,
    tickMs       = 120,   // intervalo entre ticks de slot durante o giro
    tiltThreshold = 20,
  } = {}) {

    if (slots.length === 0) throw new Error("Roulette: slots não pode ser vazio.");

    // ── Eventos ──────────────────────────────────────────────────────────────
    const _listeners = {};
    function _emit(event, data = {}) {
      (_listeners[event] || []).forEach(cb => cb(data));
    }
    function on(event, cb)  { (_listeners[event] = _listeners[event] || []).push(cb); return api; }
    function off(event, cb) {
      if (_listeners[event]) _listeners[event] = _listeners[event].filter(f => f !== cb);
      return api;
    }

    // ── Sorteio ponderado ─────────────────────────────────────────────────────
    function _weighted() {
      const total = slots.reduce((s, sl) => s + (sl.weight ?? 1), 0);
      let r = Math.random() * total;
      for (const sl of slots) {
        r -= (sl.weight ?? 1);
        if (r <= 0) return sl;
      }
      return slots[slots.length - 1];
    }

    // ── Estado ───────────────────────────────────────────────────────────────
    let _state      = "idle";    // idle | spinning | stopping | landed
    let _startedAt  = 0;
    let _tickTimer  = null;
    let _stopTimer  = null;
    let _tickIndex  = 0;
    let _lastTilt   = 0;         // debounce de tilt

    function _clearTimers() {
      clearInterval(_tickTimer);
      clearTimeout(_stopTimer);
      _tickTimer = _stopTimer = null;
    }

    // ── Ticks de slot durante o giro ─────────────────────────────────────────
    function _startTicking() {
      _tickTimer = setInterval(() => {
        _tickIndex = (_tickIndex + 1) % slots.length;
        const pct  = Math.min(1, (Date.now() - _startedAt) / spinDuration);
        _emit("tick", { slot: slots[_tickIndex], index: _tickIndex, pct });
      }, tickMs);
    }

    // ── Iniciar parada ────────────────────────────────────────────────────────
    function _beginStop() {
      _state = "stopping";
      clearInterval(_tickTimer);
      _emit("stopping", { remaining: stopDuration });

      // Desacelera — ticks cada vez mais lentos
      let elapsed = 0;
      const step  = 80;
      function decel() {
        elapsed += step;
        const progress = elapsed / stopDuration;
        if (progress >= 1) {
          _land();
          return;
        }
        _tickIndex = (_tickIndex + 1) % slots.length;
        _emit("tick", { slot: slots[_tickIndex], index: _tickIndex, pct: 1 });
        // Intervalo cresce conforme desacelera
        setTimeout(decel, step + Math.floor(progress * 400));
      }
      setTimeout(decel, step);
    }

    // ── Pousar no slot final ──────────────────────────────────────────────────
    function _land() {
      _clearTimers();
      _state = "landed";
      const slot = _weighted();
      _emit("landed", { slot });
    }

    // ── Input principal ───────────────────────────────────────────────────────
    /**
     * Processa input de direção.
     * Chame com "forward" tanto para girar quanto para iniciar a parada.
     * @param {string} direction — "forward" | "back" | "left" | "right"
     */
    function input(direction) {
      if (direction !== "forward") return;

      // Debounce — evita duplo disparo por oscilação do sensor
      const now = Date.now();
      if (now - _lastTilt < 600) return;
      _lastTilt = now;

      if (_state === "idle") {
        _spin();
        return;
      }

      if (_state === "spinning") {
        const elapsed = Date.now() - _startedAt;
        if (elapsed >= spinDuration) {
          _beginStop();
        }
        // Se ainda não atingiu spinDuration, ignora — evita parada imediata
        return;
      }
    }

    // ── Girar ────────────────────────────────────────────────────────────────
    function _spin() {
      _clearTimers();
      _state     = "spinning";
      _startedAt = Date.now();
      _tickIndex = 0;
      _emit("spinning", {});
      _startTicking();
    }

    /** Inicia manualmente (sem sensor) */
    function spin()  { if (_state === "idle") _spin(); }

    /** Para manualmente (sem sensor) */
    function stop()  { if (_state === "spinning") _beginStop(); }

    /** Reseta para idle */
    function reset() {
      _clearTimers();
      _state = "idle";
      _emit("reset", {});
    }

    /** Estado atual */
    function state() { return _state; }

    /** Lista de slots */
    function getSlots() { return [...slots]; }

    const api = { on, off, input, spin, stop, reset, state, getSlots };
    return api;
  }
};
