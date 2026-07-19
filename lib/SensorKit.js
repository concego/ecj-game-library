/**
 * SensorKit.js — ECJ Game Library
 * Abstrai DeviceOrientation (tilt) e DeviceMotion (shake)
 * Compatível com browser (GitHub Pages) e Capacitor (APK)
 *
 * Eixos (portrait):
 *   beta  → frente/trás  (-180..180)
 *   gamma → esquerda/direita (-90..90)
 *
 * Uso:
 *   import { SensorKit } from "../../lib/SensorKit.js";
 *   SensorKit.on("tilt", ({ direction, beta, gamma, normBeta, normGamma }) => {});
 *   SensorKit.on("shake", () => {});
 *   await SensorKit.requestPermission();
 *   SensorKit.start();
 */

export const SensorKit = (() => {
  const _callbacks = {};

  const CONFIG = {
    tiltForwardThreshold:  -18,   // beta abaixo → inclinou para frente
    tiltBackThreshold:      18,   // beta acima  → inclinou para trás
    tiltLeftThreshold:     -18,   // gamma abaixo → esquerda
    tiltRightThreshold:     18,   // gamma acima  → direita
    shakeThreshold:         22,   // m/s²
    shakeCooldownMs:       600,
  };

  let _lastTilt    = "neutral";
  let _lastShakeAt = 0;
  let _permitted   = false;

  // ── Eventos ──────────────────────────────────────────────────────────────
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

  // ── Permissão (iOS 13+) ──────────────────────────────────────────────────
  async function requestPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const r1 = await DeviceOrientationEvent.requestPermission();
        const r2 = await DeviceMotionEvent.requestPermission();
        _permitted = (r1 === "granted" && r2 === "granted");
      } catch (e) {
        _permitted = false;
      }
    } else {
      _permitted = true;
    }
    return _permitted;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  function _handleOrientation(e) {
    const beta  = e.beta  ?? 0;
    const gamma = e.gamma ?? 0;
    const normBeta  = Math.max(-1, Math.min(1, beta  / 90));
    const normGamma = Math.max(-1, Math.min(1, gamma / 90));

    let direction = "neutral";
    if (beta  < CONFIG.tiltForwardThreshold) direction = "forward";
    else if (beta > CONFIG.tiltBackThreshold) direction = "back";
    else if (gamma < CONFIG.tiltLeftThreshold)  direction = "left";
    else if (gamma > CONFIG.tiltRightThreshold) direction = "right";

    if (direction !== _lastTilt) {
      _lastTilt = direction;
      _emit("tilt", { direction, beta, gamma, normBeta, normGamma });
    }
  }

  function _handleMotion(e) {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const magnitude = Math.sqrt((acc.x??0)**2 + (acc.y??0)**2 + (acc.z??0)**2);
    const now = Date.now();
    if (magnitude > CONFIG.shakeThreshold && (now - _lastShakeAt) > CONFIG.shakeCooldownMs) {
      _lastShakeAt = now;
      _emit("shake");
    }
  }

  // ── Start / Stop ─────────────────────────────────────────────────────────
  function start() {
    window.addEventListener("deviceorientation", _handleOrientation);
    window.addEventListener("devicemotion",      _handleMotion);
  }

  function stop() {
    window.removeEventListener("deviceorientation", _handleOrientation);
    window.removeEventListener("devicemotion",      _handleMotion);
  }

  // ── Fallback desktop ─────────────────────────────────────────────────────
  function enableDesktopFallback() {
    document.addEventListener("keydown", e => {
      const map = { ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right" };
      if (map[e.key]) _emit("tilt", { direction: map[e.key], beta: 0, gamma: 0, normBeta: 0, normGamma: 0 });
      if (e.key === " ") _emit("shake");
    });
    console.info("[SensorKit] Desktop: ↑↓←→ = tilt | Espaço = shake");
  }

  // ── Config ───────────────────────────────────────────────────────────────
  function configure(opts = {}) {
    Object.assign(CONFIG, opts);
  }

  return { on, off, requestPermission, start, stop, enableDesktopFallback, configure };
})();
