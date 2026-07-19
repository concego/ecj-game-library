/**
 * DiceRoller.js — ECJ Game Library
 * Dados configuráveis: qualquer número de faces e quantidade, com modificadores.
 * A narrativa é definida pelo jogo — a lib gerencia apenas os resultados.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "roll"  → { dice, results, total, modified }
 *             dice[]   → configuração de cada dado rolado
 *             results[]→ resultado bruto de cada dado
 *             total    → soma dos resultados brutos
 *             modified → total + modifier
 *
 * Uso:
 *   import { DiceRoller } from "../../lib/DiceRoller.js";
 *
 *   const roller = DiceRoller.create();
 *
 *   // Rola 2d6
 *   roller.roll({ count: 2, faces: 6 });
 *
 *   // Rola 1d20 com +3 de bônus
 *   roller.roll({ faces: 20, modifier: 3 });
 *
 *   // Rola múltiplos grupos de uma vez (ex: ataque + dano)
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

    // ── Núcleo ───────────────────────────────────────────────────────────────

    function _rollOne(faces) {
      return Math.floor(Math.random() * faces) + 1;
    }

    /**
     * Rola um grupo de dados.
     * @param {object} cfg
     * @param {number} [cfg.count=1]     - quantidade de dados
     * @param {number} [cfg.faces=6]     - faces por dado
     * @param {number} [cfg.modifier=0]  - bônus/penalidade somado ao total
     * @param {string} [cfg.label]       - identificador opcional (ex: "damage")
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
     * Rola múltiplos grupos de dados de uma vez.
     * Emite um evento "roll" por grupo.
     * @param {Array} groups - array de configurações
     * @returns {Array} resultados de cada grupo
     */
    function rollMany(groups = []) {
      return groups.map(cfg => roll(cfg));
    }

    /**
     * Rola o dado mais alto entre N dados (drop-highest / keep-highest).
     * Útil para vantagem em sistemas d20.
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
     * Rola com desvantagem (keep-lowest).
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
