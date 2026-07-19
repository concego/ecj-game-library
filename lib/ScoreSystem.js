/**
 * ScoreSystem.js — ECJ Game Library
 * Gerencia pontuação, highscore (localStorage), multiplicadores e combos.
 * A narrativa é definida pelo jogo — a lib gerencia apenas os números.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "score"      → { points, total, multiplier }   ponto adicionado
 *   "combo"      → { combo, multiplier }            combo atingido
 *   "combobreak" → { combo }                        combo quebrado
 *   "highscore"  → { total, previous }              novo recorde
 *   "reset"      → {}                               pontuação zerada
 *
 * Uso:
 *   import { ScoreSystem } from "../../lib/ScoreSystem.js";
 *
 *   const score = ScoreSystem.create({ storageKey: "myjam_score" });
 *   score.on("score",     ({ points, total }) => updateUI(total));
 *   score.on("highscore", ({ total })         => celebrateRecord());
 *   score.add(100);
 *   score.combo();      // acerto em sequência — sobe multiplicador
 *   score.breakCombo(); // erro — reseta multiplicador
 */

export const ScoreSystem = {

  /**
   * Cria uma instância do ScoreSystem.
   *
   * @param {object} options
   * @param {string}   [options.storageKey]        chave no localStorage para o highscore (padrão: "ecj_highscore")
   * @param {number}   [options.baseMultiplier]    multiplicador inicial (padrão: 1)
   * @param {number}   [options.multiplierStep]    quanto cresce por combo (padrão: 0.5)
   * @param {number}   [options.maxMultiplier]     teto do multiplicador (padrão: 4)
   * @param {number[]} [options.comboThresholds]   combos que disparam evento "combo" (padrão: [3, 5, 10])
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
    }
    function _emit(event, data = {}) {
      (_listeners[event] ?? []).forEach(cb => cb(data));
    }

    // ── Estado ───────────────────────────────────────────────────────────────
    let _total      = 0;
    let _combo      = 0;
    let _multiplier = baseMultiplier;
    let _highscore  = parseInt(localStorage.getItem(storageKey) || "0");

    // ── Internos ─────────────────────────────────────────────────────────────
    function _checkHighscore() {
      if (_total > _highscore) {
        const previous = _highscore;
        _highscore = _total;
        localStorage.setItem(storageKey, _highscore);
        _emit("highscore", { total: _total, previous });
      }
    }

    function _updateMultiplier() {
      _multiplier = Math.min(baseMultiplier + (_combo * multiplierStep), maxMultiplier);
      // arredonda para evitar 1.4999...
      _multiplier = Math.round(_multiplier * 10) / 10;
    }

    // ── API pública ──────────────────────────────────────────────────────────

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
     * Registra um acerto em sequência — sobe o combo e o multiplicador.
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
     * Zera a pontuação e o combo (highscore persiste).
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
