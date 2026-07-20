/**
 * ScoreSystem.js — ECJ Game Library
 * Manages score, high score (localStorage), multipliers, and combos.
 * The narrative is defined by the game — the lib manages only the numbers.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Emitted events (use .on(event, cb)):
 *   "score"      → { points, total, multiplier }   ponto adicionado
 *   "combo"      → { combo, multiplier }            combo atingido
 *   "combobreak" → { combo }                        combo broken
 *   "highscore"  → { total, previous }              novo recorde
 *   "reset"      → {}                               score reset
 *
 * Usage:
 *   import { ScoreSystem } from "../../lib/ScoreSystem.js";
 *
 *   const score = ScoreSystem.create({ storageKey: "myjam_score" });
 *   score.on("score",     ({ points, total }) => updateUI(total));
 *   score.on("highscore", ({ total })         => celebrateRecord());
 *   score.add(100);
 *   score.combo();      // hit in sequence — increases multiplier
 *   score.breakCombo(); // erro — reseta multiplicador
 */

export const ScoreSystem = {

  /**
   * Creates a ScoreSystem instance.
   *
   * @param {object} options
   * @param {string}   [options.storageKey]        localStorage key for high score (default: "ecj_highscore")
   * @param {number}   [options.baseMultiplier]    initial multiplier (default: 1)
   * @param {number}   [options.multiplierStep]    growth per combo (default: 0.5)
   * @param {number}   [options.maxMultiplier]     multiplier cap (default: 4)
   * @param {number[]} [options.comboThresholds]   combos that fire "combo" event (default: [3, 5, 10])
   */
  create({
    storageKey      = "ecj_highscore",
    baseMultiplier  = 1,
    multiplierStep  = 0.5,
    maxMultiplier   = 4,
    comboThresholds = [3, 5, 10],
  } = {}) {

    // ── Eventos ──────────────────────────────────────────────────────────────
    const _listeners = {};

    function on(event, cb)  { (_listeners[event] ??= []).push(cb); }
    function off(event, cb) {
      if (_listeners[event]) _listeners[event] = _listeners[event].filter(f => f !== cb);
          return api;
    }
    function _emit(event, data = {}) {
      (_listeners[event] ?? []).forEach(cb => cb(data));
    }

    // ── Estado ───────────────────────────────────────────────────────────────
    let _total      = 0;
    let _combo      = 0;
    let _multiplier = baseMultiplier;
    let _highscore  = (() => { try { return parseInt(localStorage.getItem(storageKey) || "0"); } catch { return 0; } })();

    // ── Internos ─────────────────────────────────────────────────────────────
    function _checkHighscore() {
      if (_total > _highscore) {
        const previous = _highscore;
        _highscore = _total;
        try { localStorage.setItem(storageKey, _highscore); } catch { /* storage unavailable */ }
        _emit("highscore", { total: _total, previous });
      }
    }

    function _updateMultiplier() {
      _multiplier = Math.min(baseMultiplier + (_combo * multiplierStep), maxMultiplier);
      // arredonda para evitar 1.4999...
      _multiplier = Math.round(_multiplier * 10) / 10;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Adiciona pontos (aplicando multiplicador atual).
     * @param {number} points pontos base
     */
    function add(points) {
      const earned = Math.round(points * _multiplier);
      _total += earned;
      _emit("score", { points: earned, total: _total, multiplier: _multiplier });
      _checkHighscore();
    }

    /**
     * Registers a hit in sequence — increases combo and multiplier.
     */
    function combo() {
      _combo++;
      _updateMultiplier();
      if (comboThresholds.includes(_combo)) {
        _emit("combo", { combo: _combo, multiplier: _multiplier });
      }
    }

    /**
     * Registra um erro — reseta combo e multiplicador.
     */
    function breakCombo() {
      if (_combo > 0) {
        const broken = _combo;
        _combo      = 0;
        _multiplier = baseMultiplier;
        _emit("combobreak", { combo: broken });
      }
    }

    /**
     * Resets score and combo (high score persists).
     */
    function reset() {
      _total      = 0;
      _combo      = 0;
      _multiplier = baseMultiplier;
      _emit("reset");
    }

    /** Pontuação atual */
    function total()      { return _total; }

    /** Combo atual */
    function currentCombo() { return _combo; }

    /** Multiplicador atual */
    function multiplier() { return _multiplier; }

    /** Highscore salvo */
    function highscore()  { return _highscore; }

    return { on, off, add, combo, breakCombo, reset, total, currentCombo, multiplier, highscore };
  }
};
