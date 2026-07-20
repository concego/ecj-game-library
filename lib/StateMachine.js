/**
 * StateMachine.js — ECJ Game Library
 * Generic and reusable finite state machine.
 *
 * Usage:
 *   import { StateMachine } from "../../lib/StateMachine.js";
 *
 *   const fsm = StateMachine.create({
 *     initial: "IDLE",
 *     states: {
 *       IDLE:    { onEnter: () => {}, onExit: () => {} },
 *       RUNNING: { onEnter: () => {}, onExit: () => {} },
 *     },
 *     transitions: {
 *       start:  { from: "IDLE",    to: "RUNNING" },
 *       stop:   { from: "RUNNING", to: "IDLE"    },
 *     },
 *   });
 *
 *   fsm.send("start");
 *   fsm.state(); // "RUNNING"
 */

export const StateMachine = {
  create({ initial, states = {}, transitions = {}, onTransition } = {}) {
    let _current = initial;
    const _timers = new Set();

    function state() { return _current; }

    function is(...names) { return names.includes(_current); }

    function send(event, payload) {
      const t = transitions[event];
      if (!t) { console.warn(`[StateMachine] Unknown event: "${event}"`); return; }

      const allowed = Array.isArray(t.from) ? t.from : [t.from];
      if (!allowed.includes(_current) && t.from !== "*") {
        console.warn(`[StateMachine] Transition "${event}" not allowed from state "${_current}"`);
        return;
      }

      const prev = _current;
      states[prev]?.onExit?.({ from: prev, to: t.to, event, payload });
      _current = t.to;
      onTransition?.({ from: prev, to: t.to, event, payload });
      states[_current]?.onEnter?.({ from: prev, to: t.to, event, payload });
    }

    // Helpers de timer ligados ao ciclo de vida da FSM
    function after(ms, fn) {
      const id = setTimeout(() => { _timers.delete(id); fn(); }, ms);
      _timers.add(id);
      return id;
    }

    function every(ms, fn) {
      const id = setInterval(fn, ms);
      _timers.add(id);
      return id;
    }

    function cancel(id) {
      clearTimeout(id);
      clearInterval(id);
      _timers.delete(id);
    }

    function clearAllTimers() {
      _timers.forEach(id => { clearTimeout(id); clearInterval(id); });
      _timers.clear();
    }

    function reset() {
      clearAllTimers();
      _current = initial;
      states[initial]?.onEnter?.({ from: null, to: initial, event: "reset" });
    }

    return { state, is, send, after, every, cancel, clearAllTimers, reset };
  }
};
