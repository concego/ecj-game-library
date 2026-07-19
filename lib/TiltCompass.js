/**
 * TiltCompass.js — ECJ Game Library
 * Traduz inclinação do dispositivo em direção cardinal (N/S/E/W).
 * Usado para virar o personagem durante exploração de grid.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Fluxo:
 *   Player inclina o dispositivo → evento "turn" com nova direção
 *   Deve estar "assentado" na direção por deadZoneMs antes de confirmar
 *   (evita giros acidentais durante navegação normal)
 *
 * Direções:
 *   "N" → inclinado para frente (topo do celular afasta)
 *   "S" → inclinado para trás  (topo do celular aproxima)
 *   "E" → inclinado para direita
 *   "W" → inclinado para esquerda
 *
 * Parâmetros:
 *   threshold    → graus mínimos de inclinação para detectar direção (padrão: 20)
 *   deadZoneMs   → ms que deve manter a inclinação antes de confirmar (padrão: 300)
 *   sensorKey    → chave do SensorKit a usar: "tilt" (padrão)
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "turn"    → { direction, previous }   direção confirmada (N/S/E/W)
 *   "holding" → { direction, progress }   progresso do deadzone (0–1)
 *   "neutral" → {}                        voltou para posição neutra
 *
 * Uso:
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

    // ── Lógica ────────────────────────────────────────────────────────────
    function _angleToDirection(beta, gamma) {
      // beta  = inclinação frente/trás  (-180 a 180)
      // gamma = inclinação esquerda/direita (-90 a 90)
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
        // Nova direção candidata — reinicia o deadzone
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
        // Mantendo mesma direção — reporta progresso
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

    // ── API pública ────────────────────────────────────────────────────────

    /**
     * Inicia o compass conectado ao SensorKit.
     * @param {object} sensorKit — instância do SensorKit já iniciada
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
