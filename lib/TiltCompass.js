/**
 * TiltCompass.js — ECJ Game Library
 * Translates device tilt into cardinal direction (N/S/E/W).
 * Used to turn the character during grid exploration.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Fluxo:
 *   Player tilts device → "turn" event with new direction
 *   Must "settle" in the direction for deadZoneMs before confirming
 *   (prevents accidental turns during normal navigation)
 *
 * Directions:
 *   "N" → inclinado para frente (topo do celular afasta)
 *   "S" → tilted backward  (top of phone comes closer)
 *   "E" → inclinado para direita
 *   "W" → inclinado para esquerda
 *
 * Parameters:
 *   threshold    → minimum tilt degrees to detect a direction (default: 20)
 *   deadZoneMs   → ms the tilt must be held before confirming (default: 300)
 *   sensorKey    → SensorKit event key to use: "tilt" (default)
 *
 * Emitted events (use .on(event, cb)):
 *   "turn"    → { direction, previous }   confirmed direction (N/S/E/W)
 *   "holding" → { direction, progress }   progresso do deadzone (0–1)
 *   "neutral" → {}                        returned to neutral position
 *
 * Usage:
 *   import { TiltCompass } from "../../lib/TiltCompass.js";
 *   import { SensorKit }   from "../../lib/SensorKit.js";
 *
 *   const compass = TiltCompass.create({ threshold: 20, deadZoneMs: 300 });
 *   compass.on("turn", ({ direction, previous }) => {
 *     player.face(direction); // N/S/E/W
 *   });
 *   compass.start(SensorKit);
 */

export const TiltCompass = {
  create({ threshold = 20, deadZoneMs = 300 } = {}) {

    // ── Eventos ────────────────────────────────────────────────────────────
    const _listeners = {};
    function on(event, cb)  { (_listeners[event] ??= []).push(cb); return api; }
    function off(event, cb) {
      if (!_listeners[event]) return api;
      _listeners[event] = _listeners[event].filter(fn => fn !== cb);
      return api;
    }
    function _emit(event, data = {}) {
      (_listeners[event] ?? []).forEach(fn => fn(data));
    }

    // ── Estado ─────────────────────────────────────────────────────────────
    let _current   = null;   // direção confirmada atual
    let _candidate = null;   // direção sendo segurada
    let _holdStart = null;   // timestamp início do hold
    let _holdTimer = null;
    let _running   = false;
    let _sensor    = null;

    // ── Logic ────────────────────────────────────────────────────────────
    function _angleToDirection(beta, gamma) {
      // beta  = forward/back tilt  (-180 to 180)
      // gamma = left/right tilt (-90 to 90)
      const absBeta  = Math.abs(beta  ?? 0);
      const absGamma = Math.abs(gamma ?? 0);

      if (absBeta < threshold && absGamma < threshold) return null; // neutro

      // Eixo dominante
      if (absBeta >= absGamma) {
        return beta > 0 ? "S" : "N";
      } else {
        return gamma > 0 ? "E" : "W";
      }
    }

    function _onSensorData({ beta, gamma }) {
      if (!_running) return;

      const detected = _angleToDirection(beta, gamma);

      if (!detected) {
        // Voltou para neutro
        if (_candidate) {
          _candidate = null;
          _holdStart  = null;
          clearTimeout(_holdTimer);
          _holdTimer  = null;
          _emit("neutral");
        }
        return;
      }

      if (detected !== _candidate) {
        // New candidate direction — restart deadzone
        _candidate = detected;
        _holdStart  = Date.now();
        clearTimeout(_holdTimer);

        _emit("holding", { direction: _candidate, progress: 0 });

        _holdTimer = setTimeout(() => {
          if (_candidate === detected) {
            const previous = _current;
            _current = _candidate;
            _emit("turn", { direction: _current, previous });
          }
        }, deadZoneMs);

      } else if (_candidate && _holdStart) {
        // Holding same direction — report progress
        const progress = Math.min((Date.now() - _holdStart) / deadZoneMs, 1);
        _emit("holding", { direction: _candidate, progress });
      }
    }

    // ── Fallback teclado (PC) ──────────────────────────────────────────────
    const _keyMap = {
      ArrowUp:    "N",
      ArrowDown:  "S",
      ArrowRight: "E",
      ArrowLeft:  "W",
      w: "N", s: "S", d: "E", a: "W",
      W: "N", S: "S", D: "E", A: "W",
    };

    function _onKeyDown(e) {
      if (!_running) return;
      const dir = _keyMap[e.key];
      if (!dir) return;
      const previous = _current;
      _current = dir;
      _emit("turn", { direction: dir, previous });
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Inicia o compass conectado ao SensorKit.
     * @param {object} sensorKit — already-started SensorKit instance
     */
    function start(sensorKit) {
      if (_running) return api;
      _running = true;
      _sensor  = sensorKit;
      _sensor.on("orientation", _onSensorData);
      document.addEventListener("keydown", _onKeyDown);
      return api;
    }

    /** Para o compass */
    function stop() {
      _running = false;
      clearTimeout(_holdTimer);
      _holdTimer  = null;
      _candidate  = null;
      _holdStart  = null;
      if (_sensor) {
        _sensor.off("orientation", _onSensorData);
        _sensor = null;
      }
      document.removeEventListener("keydown", _onKeyDown);
      return api;
    }

    /** Direção atual confirmada (N/S/E/W ou null) */
    function direction() { return _current; }

    /** Força uma direção manualmente (útil para inicializar o personagem) */
    function setDirection(dir) {
      const previous = _current;
      _current = dir;
      if (dir !== previous) _emit("turn", { direction: dir, previous });
      return api;
    }

    const api = { on, off, start, stop, direction, setDirection };
    return api;
  }
};
