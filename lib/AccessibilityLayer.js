/**
 * AccessibilityLayer.js — ECJ Game Library
 *
 * GOLDEN RULE:
 *   This lib does not touch audio or visuals.
 *   Its sole responsibility is accessibility infrastructure:
 *   screen reader announcements (speak) and haptic feedback (vibrate).
 *   Styling, layout, and appearance of the aria-live element are the
 *   responsibility of the project using this lib.
 *
 * Requirement:
 *   The project must create an element with aria-live="assertive" and
 *   aria-atomic="true" in the HTML and pass its id to
 *   AccessibilityLayer.create({ announcerId: "..." }).
 *   Example:
 *     <div id="announcer" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
 *
 * Usage:
 *   import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";
 *
 *   const a11y = AccessibilityLayer.create({ announcerId: "announcer" });
 *   a11y.speak("Fish hooked!");
 *   a11y.vibrate("bite");
 */

export const AccessibilityLayer = {
  create({ announcerId = "announcer" } = {}) {
    let _el = null;

    function init() {
      _el = document.getElementById(announcerId);
      if (!_el) {
        console.warn(
          `[AccessibilityLayer] Element #${announcerId} not found. ` +
          `Create a <div id="${announcerId}" aria-live="assertive" aria-atomic="true"> in your HTML.`
        );
      }
    }

    // Double-rAF: forces TalkBack/NVDA to interrupt previous reading
    function speak(text) {
      if (!_el) init();
      if (!_el) return;
      _el.textContent = "";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { _el.textContent = text; });
      });
    }

    // Semantic vibration patterns — haptic feedback is part of accessible mechanics
    const _patterns = {
      bite:    [100, 50, 100],
      snap:    [500],
      caught:  [100, 50, 100, 50, 300],
      warning: [200, 100, 200],
      tick:    [30],
    };

    function vibrate(event) {
      if (!navigator.vibrate) return;
      const pattern = Array.isArray(event) ? event : (_patterns[event] ?? [100]);
      navigator.vibrate(pattern);
    }

    // Allows the developer to register additional patterns without modifying the lib
    function addVibrationPattern(name, pattern) {
      _patterns[name] = pattern;
    }

    function focusElement(id) {
      const el = document.getElementById(id);
      if (el) el.focus();
    }

    return { init, speak, vibrate, addVibrationPattern, focusElement };
  }
};
