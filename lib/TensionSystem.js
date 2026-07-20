/**
 * TensionSystem.js — ECJ Game Library
 * Generic tension system: player vs. opponent.
 * Reusable for fishing, tug-of-war, climbing, archery, etc.
 *
 * Usage:
 *   import { TensionSystem } from "../../lib/TensionSystem.js";
 *
 *   const tension = TensionSystem.create({
 *     initial: 50,
 *     playerForce: 2,    // reduction per tick when player acts
 *     opponentForce: 1,  // increase per tick passively
 *     tickMs: 100,
 *     onUpdate: (value, level) => {},
 *     onSnap: () => {},
 *     onRelease: () => {},
 *   });
 *
 *   tension.start();
 *   tension.applyPlayer();  // player acts (pulls, resists...)
 *   tension.stop();
 */

export const TensionSystem = {
  create({
    initial       = 50,
    playerForce   = 2,
    opponentForce = 1,
    tickMs        = 100,
    snapAt        = 100,
    releaseAt     = 0,
    onUpdate,
    onSnap,
    onRelease,
  } = {}) {
    // Event emitter — consistent with all other ECJ modules
    const _listeners = {};
    function _emit(event, data = {}) {
      (_listeners[event] || []).forEach(cb => cb(data));
    }
    function on(event, cb)  { (_listeners[event] = _listeners[event] || []).push(cb); return api; }
    function off(event, cb) {
      if (_listeners[event]) _listeners[event] = _listeners[event].filter(f => f !== cb);
      return api;
    }

    let _value    = initial;
    let _interval = null;
    let _playerActive = false;

    const LEVELS = [
      { max: 30,  label: "low"      },
      { max: 60,  label: "medium"   },
      { max: 80,  label: "high"     },
      { max: 100, label: "critical" },
    ];

    function _level(v) {
      return LEVELS.find(l => v <= l.max)?.label ?? "critical";
    }

    function value() { return _value; }

    function applyPlayer() { _playerActive = true; }
    function releasePlayer() { _playerActive = false; }

    function set(v) {
      _value = Math.max(0, Math.min(100, v));
    }

    function _tick() {
      if (_playerActive) {
        _value = Math.max(0, _value - playerForce);
        _playerActive = false; // consumido por tick
      } else {
        _value = Math.min(100, _value + opponentForce);
      }

      onUpdate?.(_value, _level(_value));
      _emit("update", { value: _value, level: _level(_value) });

      if (_value >= snapAt)   { stop(); onSnap?.();    _emit("snap",    { value: _value }); return; }
      if (_value <= releaseAt){ stop(); onRelease?.(); _emit("release", { value: _value }); return; }
    }

    function start() {
      if (_interval) return;
      _interval = setInterval(_tick, tickMs);
    }

    function stop() {
      clearInterval(_interval);
      _interval = null;
    }

    function reset(v = initial) {
      stop();
      _value = v;
      _playerActive = false;
    }

    const api = { on, off, value, applyPlayer, releasePlayer, set, start, stop, reset };
    return api;
  }
};
