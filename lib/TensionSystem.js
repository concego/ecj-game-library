/**
 * TensionSystem.js — ECJ Game Library
 * Sistema de tensão genérico: jogador vs. oponente.
 * Reutilizável em pesca, cabo de guerra, escalada, arquearia etc.
 *
 * Uso:
 *   import { TensionSystem } from "../../lib/TensionSystem.js";
 *
 *   const tension = TensionSystem.create({
 *     initial: 50,
 *     playerForce: 2,    // redução por tick quando jogador age
 *     opponentForce: 1,  // aumento por tick passivo
 *     tickMs: 100,
 *     onUpdate: (value, level) => {},
 *     onSnap: () => {},
 *     onRelease: () => {},
 *   });
 *
 *   tension.start();
 *   tension.applyPlayer();  // jogador age (puxa, resiste...)
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

      if (_value >= snapAt)   { stop(); onSnap?.();    return; }
      if (_value <= releaseAt){ stop(); onRelease?.(); return; }
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

    return { value, applyPlayer, releasePlayer, set, start, stop, reset };
  }
};
