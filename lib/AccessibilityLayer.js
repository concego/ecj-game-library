/**
 * AccessibilityLayer.js — ECJ Game Library
 * Utilitários de acessibilidade para jogos: anúncios TalkBack/NVDA,
 * vibração e gerenciamento de foco.
 *
 * Uso:
 *   import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";
 *
 *   const a11y = AccessibilityLayer.create({ announcerId: "announcer" });
 *   a11y.speak("Peixe fisgado!");
 *   a11y.vibrate("bite");
 */

export const AccessibilityLayer = {
  create({ announcerId = "announcer" } = {}) {
    let _el = null;

    function init() {
      _el = document.getElementById(announcerId);
      if (!_el) {
        _el = document.createElement("div");
        _el.id = announcerId;
        _el.setAttribute("aria-live", "assertive");
        _el.setAttribute("aria-atomic", "true");
        Object.assign(_el.style, {
          position: "absolute", width: "1px", height: "1px",
          overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap",
        });
        document.body.appendChild(_el);
      }
    }

    // Double-rAF: força TalkBack a interromper leitura anterior
    function speak(text) {
      if (!_el) init();
      _el.textContent = "";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { _el.textContent = text; });
      });
    }

    // Padrões de vibração por evento
    const VIBRATION_PATTERNS = {
      bite:    [100, 50, 100],
      snap:    [500],
      caught:  [100, 50, 100, 50, 300],
      warning: [200, 100, 200],
      tick:    [30],
    };

    function vibrate(event) {
      if (!navigator.vibrate) return;
      const pattern = VIBRATION_PATTERNS[event] ?? [100];
      navigator.vibrate(pattern);
    }

    function addVibrationPattern(name, pattern) {
      VIBRATION_PATTERNS[name] = pattern;
    }

    function focusElement(id) {
      const el = document.getElementById(id);
      if (el) { el.focus(); }
    }

    return { init, speak, vibrate, addVibrationPattern, focusElement };
  }
};
