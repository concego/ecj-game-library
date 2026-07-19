/**
 * ResourceNode.js — ECJ Game Library
 * Gerencia nós de recursos no grid: árvores, jazidas, plantas, etc.
 * A narrativa é definida pelo jogo — a lib gerencia apenas extração, HP e drops.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Conceitos:
 *   - Node:      um recurso no grid com HP, ferramenta requerida e tabela de drops
 *   - Tool:      { id, power } — power define quanto HP remove e qual faixa de drop
 *   - Drop:      { item, weight, minPower } — sorteio ponderado por faixa de power
 *   - Biome:     template com pool de drops compartilhado por múltiplos nodes
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "extracted"  → { item, power, hpRemaining }   extração bem-sucedida
 *   "failed"     → { reason }                      sem ferramenta ou node depletado
 *   "depleted"   → { cell }                        HP chegou a zero
 *   "respawned"  → { cell }                        node regenerou
 *
 * Uso básico:
 *   const node = ResourceNode.create({ ... });
 *   node.extract({ id: "axe", power: 30 });
 *
 * Geração procedural por bioma:
 *   ResourceNode.registerBiome("forest", { ... });
 *   const tree = ResourceNode.fromBiome("forest", { cell: { col: 3, row: 2 } });
 */

export const ResourceNode = (() => {

  // ── Registro de biomas ────────────────────────────────────────────────────
  const _biomes = new Map();

  /**
   * Registra um template de bioma.
   * @param {string} biomeId
   * @param {object} template — mesmos parâmetros do create(), exceto cell
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
   * @param {object|null} opts.cell         — { col, row } no grid (null = sem posição fixa)
   * @param {string}      opts.biome        — tag de bioma (ex: "forest", "cave")
   * @param {number}      opts.hp           — HP total do node (padrão: 100)
   * @param {string|null} opts.requiredTool — id da ferramenta requerida (null = sem requisito)
   * @param {number}      opts.respawnMs    — ms para regenerar (0 = não regenera)
   * @param {Array}       opts.drops        — [{ item, weight, minPower }]
   *   item:     qualquer valor (string, objeto) — o jogo decide o que é
   *   weight:   probabilidade relativa (ex: 10 = comum, 1 = raro)
   *   minPower: power mínimo da ferramenta para este drop aparecer no sorteio (padrão: 0)
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
      // Filtra drops disponíveis para o power da ferramenta
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

    // ── Regeneração ─────────────────────────────────────────────────────────
    function _startRespawn() {
      if (!respawnMs) return;
      _respawnTimer = setTimeout(() => {
        _hp       = _maxHp;
        _depleted = false;
        _emit("respawned", { cell });
      }, respawnMs);
    }

    // ── API pública ─────────────────────────────────────────────────────────

    /**
     * Tenta extrair do node.
     * @param {object|null} tool — { id, power } ou null (sem ferramenta)
     *   power: número de 1–100 recomendado; define dano e faixa de drop
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

      // Verifica depleção
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
