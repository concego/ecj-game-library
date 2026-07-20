/**
 * DiceRoller.js — ECJ Game Library
 * Configurable dice: any number of faces and count, with modifiers.
 * The narrative is defined by the game — the lib manages only the results.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Emitted events (use .on(event, cb)):
 *   "roll"  → { dice, results, total, modified }
 *             dice[]   → configuration of each rolled die
 *             results[]→ raw result of each die
 *             total    → sum of raw results
 *             modified → total + modifier
 *
 * Usage:
 *   import { DiceRoller } from "../../lib/DiceRoller.js";
 *
 *   const roller = DiceRoller.create();
 *
 *   // Rola 2d6
 *   roller.roll({ count: 2, faces: 6 });
 *
 *   // rolls 1d20 with +3 bonus
 *   roller.roll({ faces: 20, modifier: 3 });
 *
 *   // rolls multiple groups at once (e.g. attack + damage)
 *   roller.rollMany([
 *     { faces: 20, label: "attack" },
 *     { count: 2, faces: 6, modifier: 2, label: "damage" },
 *   ]);
 *
 *   roller.on("roll", ({ results, total, modified }) => { ... });
 */

export const DiceRoller = {
  create() {
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

    // ── Core ───────────────────────────────────────────────────────────────

    function _rollOne(faces) {
      return Math.floor(Math.random() * faces) + 1;
    }

    /**
     * Rola um grupo de dados.
     * @param {object} cfg
     * @param {number} [cfg.count=1]     - number of dice
     * @param {number} [cfg.faces=6]     - faces per die
     * @param {number} [cfg.modifier=0]  - bonus/penalty added to total
     * @param {string} [cfg.label]       - optional label (e.g. "damage")
     * @returns {{ dice, results, total, modified }}
     */
    function roll({ count = 1, faces = 6, modifier = 0, label = null } = {}) {
      const results = Array.from({ length: count }, () => _rollOne(faces));
      const total   = results.reduce((a, b) => a + b, 0);
      const modified = total + modifier;
      const payload = {
        dice:     { count, faces, modifier, label },
        results,
        total,
        modified,
      };
      _emit("roll", payload);
      return payload;
    }

    /**
     * Rolls multiple dice groups at once.
     * Emite um evento "roll" por grupo.
     * @param {Array} groups - array of configurations
     * @returns {Array} results per group
     */
    function rollMany(groups = []) {
      return groups.map(cfg => roll(cfg));
    }

    /**
     * Rola o dado mais alto entre N dados (drop-highest / keep-highest).
     * Useful for advantage in d20 systems.
     */
    function rollAdvantage({ faces = 20, modifier = 0 } = {}) {
      const a = _rollOne(faces);
      const b = _rollOne(faces);
      const best = Math.max(a, b);
      const payload = {
        dice:     { count: 2, faces, modifier, label: "advantage" },
        results:  [a, b],
        total:    best,
        modified: best + modifier,
      };
      _emit("roll", payload);
      return payload;
    }

    /**
     * Rolls with disadvantage (keep-lowest).
     */
    function rollDisadvantage({ faces = 20, modifier = 0 } = {}) {
      const a = _rollOne(faces);
      const b = _rollOne(faces);
      const worst = Math.min(a, b);
      const payload = {
        dice:     { count: 2, faces, modifier, label: "disadvantage" },
        results:  [a, b],
        total:    worst,
        modified: worst + modifier,
      };
      _emit("roll", payload);
      return payload;
    }

    const api = { on, off, roll, rollMany, rollAdvantage, rollDisadvantage };
    return api;
  }
};
