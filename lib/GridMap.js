/**
 * GridMap.js — ECJ Game Library
 * Gerencia posições, direções, distâncias e cones de visão num grid 2D.
 * Agnóstico de narrativa — funciona para RPG, dungeon crawler, puzzle etc.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Conceitos:
 *   - Entidade: qualquer objeto com posição e direção no grid (player, inimigo, NPC)
 *   - Célula:   { col, row } — ex: { col: 1, row: 2 } = B3 em notação alfanumérica
 *   - Direção:  "N" | "S" | "E" | "W"
 *   - Cone:     células à frente da entidade dentro de um alcance e ângulo
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "move"       → { id, from, to, direction }        entidade se moveu
 *   "turn"       → { id, from, to }                   entidade virou
 *   "enter"      → { id, cell }                       entidade entrou numa célula
 *   "leave"      → { id, cell }                       entidade saiu de uma célula
 *   "detect"     → { detector, target, cell }         entidade no cone de visão de outra
 *   "cellselect" → { cell, entities }                 célula selecionada pelo player
 *
 * Uso:
 *   import { GridMap } from "../../lib/GridMap.js";
 *
 *   const map = GridMap.create({ cols: 10, rows: 10 });
 *
 *   map.addEntity("player", { col: 0, row: 0 }, "E");
 *   map.addEntity("goblin", { col: 3, row: 0 }, "W");
 *
 *   map.move("player", { col: 1, row: 0 });
 *   map.turn("player", "N");
 *
 *   const dist = map.distance("player", "goblin"); // 2
 *   const inCone = map.inCone("goblin", "player", { range: 3, angle: 90 }); // true/false
 *
 *   map.on("detect", ({ detector, target }) => {
 *     // inimigo viu o player
 *   });
 */

export const GridMap = {
  create({ cols = 10, rows = 10 } = {}) {

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
    // _entities: Map<id, { cell: {col,row}, direction: "N"|"S"|"E"|"W" }>
    const _entities = new Map();

    // _cells: Map<"col,row", Set<id>> — índice inverso para lookup rápido
    const _cells = new Map();

    function _cellKey(cell) { return `${cell.col},${cell.row}`; }

    function _validCell(cell) {
      return cell.col >= 0 && cell.col < cols &&
             cell.row >= 0 && cell.row < rows;
    }

    function _addToCell(id, cell) {
      const key = _cellKey(cell);
      if (!_cells.has(key)) _cells.set(key, new Set());
      _cells.get(key).add(id);
    }

    function _removeFromCell(id, cell) {
      const key = _cellKey(cell);
      _cells.get(key)?.delete(id);
    }

    // ── Direções ───────────────────────────────────────────────────────────
    const _dirVectors = {
      N: { dc:  0, dr: -1 },
      S: { dc:  0, dr:  1 },
      E: { dc:  1, dr:  0 },
      W: { dc: -1, dr:  0 },
    };

    // Ângulo em graus de cada direção (N=0, sentido horário)
    const _dirAngles = { N: 0, E: 90, S: 180, W: 270 };

    function _angleBetween(fromDir, toCell, fromCell) {
      const dc = toCell.col - fromCell.col;
      const dr = toCell.row - fromCell.row;
      if (dc === 0 && dr === 0) return 0;
      // atan2 em graus, convertido para N=0 sentido horário
      const rad = Math.atan2(dc, -dr);
      return ((rad * 180 / Math.PI) + 360) % 360;
    }

    // ── Entidades ──────────────────────────────────────────────────────────

    /**
     * Adiciona uma entidade ao grid.
     * @param {string} id
     * @param {{ col, row }} cell
     * @param {"N"|"S"|"E"|"W"} direction
     */
    function addEntity(id, cell, direction = "N") {
      if (!_validCell(cell)) throw new Error(`Célula inválida: ${_cellKey(cell)}`);
      if (_entities.has(id)) removeEntity(id);
      _entities.set(id, { cell: { ...cell }, direction });
      _addToCell(id, cell);
      return api;
    }

    /** Remove uma entidade do grid */
    function removeEntity(id) {
      const entity = _entities.get(id);
      if (!entity) return api;
      _removeFromCell(id, entity.cell);
      _entities.delete(id);
      return api;
    }

    /**
     * Move uma entidade para uma nova célula.
     * Emite "leave", "move", "enter" e verifica detecções.
     */
    function move(id, toCell) {
      const entity = _entities.get(id);
      if (!entity) return api;
      if (!_validCell(toCell)) return api;

      const from = { ...entity.cell };
      const to   = { ...toCell };

      // Calcula direção do movimento automaticamente
      const dc = to.col - from.col;
      const dr = to.row - from.row;
      let movedDir = entity.direction;
      if      (dc > 0) movedDir = "E";
      else if (dc < 0) movedDir = "W";
      else if (dr > 0) movedDir = "S";
      else if (dr < 0) movedDir = "N";

      _removeFromCell(id, from);
      entity.cell      = to;
      entity.direction = movedDir;
      _addToCell(id, to);

      _emit("leave",  { id, cell: from });
      _emit("move",   { id, from, to, direction: movedDir });
      _emit("enter",  { id, cell: to });

      _checkDetections();
      return api;
    }

    /**
     * Vira uma entidade para uma direção sem mover.
     * Emite "turn" e verifica detecções.
     */
    function turn(id, direction) {
      const entity = _entities.get(id);
      if (!entity) return api;
      const from = entity.direction;
      entity.direction = direction;
      _emit("turn", { id, from, to: direction });
      _checkDetections();
      return api;
    }

    // ── Distância e geometria ──────────────────────────────────────────────

    /**
     * Distância de Manhattan entre dois pontos ou entidades.
     * @param {string|{col,row}} a — id de entidade ou célula
     * @param {string|{col,row}} b — id de entidade ou célula
     */
    function distance(a, b) {
      const ca = typeof a === "string" ? _entities.get(a)?.cell : a;
      const cb = typeof b === "string" ? _entities.get(b)?.cell : b;
      if (!ca || !cb) return Infinity;
      return Math.abs(ca.col - cb.col) + Math.abs(ca.row - cb.row);
    }

    /**
     * Verifica se o alvo está dentro do cone de visão do detector.
     * @param {string} detectorId
     * @param {string|{col,row}} target — id ou célula
     * @param {{ range: number, angle: number }} options
     *   range: alcance máximo em células (padrão: 3)
     *   angle: abertura total do cone em graus (padrão: 90 = 45° pra cada lado)
     */
    function inCone(detectorId, target, { range = 3, angle = 90 } = {}) {
      const detector = _entities.get(detectorId);
      if (!detector) return false;

      const targetCell = typeof target === "string"
        ? _entities.get(target)?.cell
        : target;
      if (!targetCell) return false;

      const dist = distance(detector.cell, targetCell);
      if (dist === 0 || dist > range) return false;

      const faceAngle   = _dirAngles[detector.direction];
      const targetAngle = _angleBetween(detector.direction, targetCell, detector.cell);
      let   diff        = Math.abs(targetAngle - faceAngle);
      if (diff > 180) diff = 360 - diff;

      return diff <= angle / 2;
    }

    /**
     * Retorna todas as células dentro do cone de visão de uma entidade.
     * @param {string} id
     * @param {{ range, angle }} options
     * @returns {{ col, row }[]}
     */
    function coneArea(id, { range = 3, angle = 90 } = {}) {
      const entity = _entities.get(id);
      if (!entity) return [];
      const result = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const cell = { col: c, row: r };
          if (inCone(id, cell, { range, angle })) result.push(cell);
        }
      }
      return result;
    }

    /**
     * Célula adjacente na direção especificada (ou direção atual da entidade).
     * @param {string} id
     * @param {"N"|"S"|"E"|"W"} [dir] — direção (padrão: direção atual)
     * @returns {{ col, row }|null}
     */
    function cellAhead(id, dir) {
      const entity = _entities.get(id);
      if (!entity) return null;
      const d = dir ?? entity.direction;
      const v = _dirVectors[d];
      const next = { col: entity.cell.col + v.dc, row: entity.cell.row + v.dr };
      return _validCell(next) ? next : null;
    }

    // ── Seleção de célula ──────────────────────────────────────────────────

    /**
     * Seleciona uma célula (ex: player clica no grid).
     * Emite "cellselect" com a lista de entidades presentes.
     * @param {{ col, row }} cell
     */
    function selectCell(cell) {
      const key      = _cellKey(cell);
      const ids      = [...(_cells.get(key) ?? [])];
      _emit("cellselect", { cell: { ...cell }, entities: ids });
      return api;
    }

    // ── Detecções automáticas ──────────────────────────────────────────────

    /**
     * Verifica todos os pares de entidades para detecções de cone.
     * Chamado automaticamente após move() e turn().
     * O jogo decide o que fazer com o evento "detect".
     */
    function _checkDetections() {
      const ids = [..._entities.keys()];
      for (let i = 0; i < ids.length; i++) {
        for (let j = 0; j < ids.length; j++) {
          if (i === j) continue;
          const detectorId = ids[i];
          const targetId   = ids[j];
          if (inCone(detectorId, targetId)) {
            _emit("detect", {
              detector: detectorId,
              target:   targetId,
              cell:     { ..._entities.get(targetId).cell },
            });
          }
        }
      }
    }

    // ── Consultas ──────────────────────────────────────────────────────────

    /** Retorna dados de uma entidade ({ cell, direction }) ou null */
    function getEntity(id) {
      const e = _entities.get(id);
      return e ? { cell: { ...e.cell }, direction: e.direction } : null;
    }

    /** Retorna ids das entidades numa célula */
    function entitiesAt(cell) {
      return [...(_cells.get(_cellKey(cell)) ?? [])];
    }

    /** Retorna ids de todas as entidades */
    function allEntities() { return [..._entities.keys()]; }

    /** Dimensões do grid */
    function size() { return { cols, rows }; }

    const api = {
      on, off,
      addEntity, removeEntity,
      move, turn,
      distance, inCone, coneArea, cellAhead,
      selectCell,
      getEntity, entitiesAt, allEntities, size,
    };
    return api;
  }
};
