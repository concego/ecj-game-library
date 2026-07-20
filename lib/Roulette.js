/**
 * Roulette.js — ECJ Game Library
 * Tilt-controlled roulette: tilt forward to spin, second tilt to start stopping.
 * The narrative is defined by the game — the lib manages only the spin, delay, and slot.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Flow:
 *   IDLE → tilt "forward" → SPINNING → tilt "forward" → STOPPING → LANDED
 *
 * Parameters:
 *   slots          → array of { id, label, weight } — roulette slots
 *   spinDuration   → minimum spin time before stop input is accepted (ms, default: 1500)
 *   stopDuration   → deceleration delay after stop input (ms, default: 1200)
 *   tiltThreshold  → minimum tilt to activate (degrees, default: 20)
 *
 * Emitted events (use .on(event, cb)):
 *   "spinning"  → {}                  roulette started spinning
 *   "tick"      → { slot, index, pct} passed a slot during spin
 *   "stopping"  → { remaining }       deceleration started, ms until stop
 *   "landed"    → { slot }            final slot drawn
 *   "reset"     → {}                  voltou para idle
 *
 * Usage:
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
 *   // Keyboard (PC): Space
 *   document.addEventListener("keydown", e => {
 *     if (e.code === "Space") roulette.input("forward");
 *   });
 */

export const Roulette = {
  create({
    slots        = [],
    spinDuration = 1500,
    stopDuration = 1200,
    tickMs       = 120,   // interval between slot ticks during spin
    tiltThreshold = 20,
  } = {}) {

    if (slots.length === 0) throw new Error("Roulette: slots cannot be empty.");

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

    // ── Weighted random draw ───────────────────────────────────────────────────
    function _weighted() {
      const total = slots.reduce((s, sl) => s + (sl.weight ?? 1), 0);
      let r = Math.random() * total;
      for (const sl of slots) {
        r -= (sl.weight ?? 1);
        if (r <= 0) return sl;
      }
      return slots[slots.length - 1];
    }

    // ── State ──────────────────────────────────────────────────────────────────
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

    // ── Slot ticks during spin ─────────────────────────────────────────────────
    function _startTicking() {
      _tickTimer = setInterval(() => {
        _tickIndex = (_tickIndex + 1) % slots.length;
        const pct  = Math.min(1, (Date.now() - _startedAt) / spinDuration);
        _emit("tick", { slot: slots[_tickIndex], index: _tickIndex, pct });
      }, tickMs);
    }

    // ── Initiate stop ──────────────────────────────────────────────────────────
    function _beginStop() {
      _state = "stopping";
      clearInterval(_tickTimer);
      _emit("stopping", { remaining: stopDuration });

      // Decelerate — ticks progressively slower
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
        // Interval grows as it decelerates
        setTimeout(decel, step + Math.floor(progress * 400));
      }
      setTimeout(decel, step);
    }

    // ── Land on final slot ─────────────────────────────────────────────────────
    // NOTE: The final landed slot is drawn via weighted random at stop time,
    // independent of the visual slot indicator shown during deceleration.
    // The tick animation is cosmetic; it does not determine the result.
    function _land() {
      _clearTimers();
      _state = "landed";
      const slot = _weighted();
      _emit("landed", { slot });
    }

    // ── Main input handler ──────────────────────────────────────────────────────
    /**
     * Processes directional input.
     * Chame com "forward" tanto para girar quanto para iniciar a parada.
     * @param {string} direction — "forward" | "back" | "left" | "right"
     */
    function input(direction) {
      if (direction !== "forward") return;

      // Debounce — prevents double-firing from sensor jitter
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
        // If spinDuration not yet reached, ignore — prevents immediate stop
        return;
      }
    }

    // ── Spin ─────────────────────────────────────────────────────────────────
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

    /** Current state */
    function state() { return _state; }

    /** Lista de slots */
    function getSlots() { return [...slots]; }

    const api = { on, off, input, spin, stop, reset, state, getSlots };
    return api;
  }
};
