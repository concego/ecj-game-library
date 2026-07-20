/**
 * ResourceNode.js — ECJ Game Library
 * Manages resource nodes on the grid: trees, ore deposits, plants, etc.
 * The narrative is defined by the game — the lib manages only extraction, HP, and drops.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Concepts:
 *   - Node:      a resource on the grid with HP, required tool, and drop table
 *   - Tool:      { id, power } — power defines how much HP is removed and the drop tier
 *   - Drop:      { item, weight, minPower } — weighted draw filtered by power tier
 *   - Biome:     template with drop pool shared across multiple nodes
 *
 * Emitted events (use .on(event, cb)):
 *   "extracted"  → { item, power, hpRemaining }   successful extraction
 *   "failed"     → { reason }                      no tool equipped ou node depletado
 *   "depleted"   → { cell }                        HP chegou a zero
 *   "respawned"  → { cell }                        node regenerou
 *
 * Basic usage:
 *   const node = ResourceNode.create({ ... });
 *   node.extract({ id: "axe", power: 30 });
 *
 * Procedural generation by biome:
 *   ResourceNode.registerBiome("forest", { ... });
 *   const tree = ResourceNode.fromBiome("forest", { cell: { col: 3, row: 2 } });
 */

export const ResourceNode = (() => {

  // ── Registro de biomas ────────────────────────────────────────────────────
  const _biomes = new Map();

  /**
   * Registra um template de bioma.
   * @param {string} biomeId
   * @param {object} template — same parameters as create(), except cell
   */
  function registerBiome(biomeId, template) {
    _biomes.set(biomeId, template);
  }

  /**
   * Cria um node a partir de um bioma registrado.
   * @param {string} biomeId
   * @param {object} overrides — { cell, hp, respawnMs, ... } sobrescrevem o template
   */
  function fromBiome(biomeId, overrides = {}) {
    if (!_biomes.has(biomeId)) {
      throw new Error(`ResourceNode: biome "${biomeId}" not registered.`);
    }
    const template = _biomes.get(biomeId);
    return create({ ...template, ...overrides, biome: biomeId });
  }

  // ── Factory ───────────────────────────────────────────────────────────────
  /**
   * Cria um ResourceNode.
   *
   * @param {object} opts
   * @param {object|null} opts.cell         — { col, row } on the grid (null = no fixed position)
   * @param {string}      opts.biome        — tag de bioma (ex: "forest", "cave")
   * @param {number}      opts.hp           — total node HP (default: 100)
   * @param {string|null} opts.requiredTool — id da ferramenta requerida (null = sem requisito)
   * @param {number}      opts.respawnMs    — ms to respawn (0 = no respawn)
   * @param {Array}       opts.drops        — [{ item, weight, minPower }]
   *   item:     any value (string, object) — the game decides what it means
   *   weight:   probabilidade relativa (ex: 10 = comum, 1 = raro)
   *   minPower: minimum tool power for this drop to appear in the draw (default: 0)
   */
  function create({
    cell         = null,
    biome        = null,
    hp           = 100,
    requiredTool = null,
    respawnMs    = 0,
    drops        = [],
  } = {}) {

    // ── Estado interno ──────────────────────────────────────────────────────
    let _hp          = hp;
    let _maxHp       = hp;
    let _depleted    = false;
    let _respawnTimer = null;
    const _listeners  = new Map();

    // ── Eventos ─────────────────────────────────────────────────────────────
    function _emit(event, data = {}) {
      if (_listeners.has(event)) {
        _listeners.get(event).forEach(cb => cb(data));
      }
    }

    function on(event, cb) {
      if (!_listeners.has(event)) _listeners.set(event, []);
      _listeners.get(event).push(cb);
      return api;
    }

    function off(event, cb) {
      if (!_listeners.has(event)) return api;
      if (!cb) { _listeners.delete(event); return api; }
      _listeners.set(event, _listeners.get(event).filter(fn => fn !== cb));
      return api;
    }

    // ── Sorteio de drop ─────────────────────────────────────────────────────
    function _rollDrop(power) {
      // Filter drops available for the tool's power
      const available = drops.filter(d => (d.minPower ?? 0) <= power);
      if (available.length === 0) return null;

      // Sorteio ponderado
      const totalWeight = available.reduce((sum, d) => sum + (d.weight ?? 1), 0);
      let roll = Math.random() * totalWeight;
      for (const drop of available) {
        roll -= (drop.weight ?? 1);
        if (roll <= 0) return drop.item;
      }
      return available[available.length - 1].item;
    }

    // ── Respawn ─────────────────────────────────────────────────────────
    function _startRespawn() {
      if (!respawnMs) return;
      _respawnTimer = setTimeout(() => {
        _hp       = _maxHp;
        _depleted = false;
        _emit("respawned", { cell });
      }, respawnMs);
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Tenta extrair do node.
     * @param {object|null} tool — { id, power } ou null (no tool equipped)
     *   power: recommended 1–100; defines damage and drop tier
     */
    function extract(tool = null) {
      // Node esgotado
      if (_depleted) {
        _emit("failed", { reason: "depleted" });
        return api;
      }

      // Verifica ferramenta requerida
      if (requiredTool !== null) {
        if (!tool || tool.id !== requiredTool) {
          _emit("failed", { reason: "wrong_tool", required: requiredTool });
          return api;
        }
      }

      const power = tool?.power ?? 10;

      // Remove HP
      _hp = Math.max(0, _hp - power);

      // Sorteia drop
      const item = _rollDrop(power);

      _emit("extracted", { item, power, hpRemaining: _hp, cell });

      // Check depletion
      if (_hp <= 0) {
        _depleted = true;
        _emit("depleted", { cell });
        _startRespawn();
      }

      return api;
    }

    /** Reseta o node manualmente (sem aguardar respawn) */
    function reset() {
      if (_respawnTimer) clearTimeout(_respawnTimer);
      _hp       = _maxHp;
      _depleted = false;
      return api;
    }

    /** HP atual */
    function currentHp()   { return _hp; }

    /** HP máximo */
    function maxHp()       { return _maxHp; }

    /** Percentual de HP restante (0–1) */
    function hpPct()       { return _hp / _maxHp; }

    /** Se o node está esgotado */
    function isDepleted()  { return _depleted; }

    /** Célula no grid */
    function getCell()     { return cell; }

    /** Bioma do node */
    function getBiome()    { return biome; }

    const api = {
      on, off,
      extract, reset,
      currentHp, maxHp, hpPct, isDepleted,
      getCell, getBiome,
    };
    return api;
  }

  return { create, registerBiome, fromBiome };
})();
