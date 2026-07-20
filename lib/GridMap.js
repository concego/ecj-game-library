/**
 * GridMap.js — ECJ Game Library
 * Manages positions, directions, distances, and vision cones on a 2D grid.
 * Narrative-agnostic — works for RPG, dungeon crawler, puzzle, etc.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Concepts:
 *   - Entity:   any object with position and direction on the grid (player, enemy, NPC)
 *   - Cell:   { col, row } — e.g. { col: 1, row: 2 } = B3 in alphanumeric notation
 *   - Direction:  "N" | "S" | "E" | "W"
 *   - Cone:     cells in front of the entity within a range and angle
 *
 * Emitted events (use .on(event, cb)):
 *   "move"       → { id, from, to, direction }        entity moved
 *   "turn"       → { id, from, to }                   entity turned
 *   "enter"      → { id, cell }                       entity entered a cell
 *   "leave"      → { id, cell }                       entity left a cell
 *   "detect"     → { detector, target, cell }         entity detected in another's vision cone
 *   "cellselect" → { cell, entities }                 cell selected by the player
 *
 * Usage:
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

    // _cells: Map<"col,row", Set<id>> — reverse index for fast lookup
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

    // ── Directions ───────────────────────────────────────────────────────────
    const _dirVectors = {
      N: { dc:  0, dr: -1 },
      S: { dc:  0, dr:  1 },
      E: { dc:  1, dr:  0 },
      W: { dc: -1, dr:  0 },
    };

    // Angle in degrees per direction (N=0, clockwise)
    const _dirAngles = { N: 0, E: 90, S: 180, W: 270 };

    function _angleBetween(fromDir, toCell, fromCell) {
      const dc = toCell.col - fromCell.col;
      const dr = toCell.row - fromCell.row;
      if (dc === 0 && dr === 0) return 0;
      // atan2 in degrees, converted to N=0 clockwise
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
      if (!_validCell(cell)) throw new Error(`[GridMap] Invalid cell: ${_cellKey(cell)}`);
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
     * Moves an entity to a new cell.
     * Emits "leave", "move", "enter" and checks detections.
     */
    function move(id, toCell) {
      const entity = _entities.get(id);
      if (!entity) return api;
      if (!_validCell(toCell)) return api;

      const from = { ...entity.cell };
      const to   = { ...toCell };

      // Auto-compute movement direction
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
     * Turns an entity to a direction without moving.
     * Emits "turn" and checks detections.
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

    // ── Distance and geometry ──────────────────────────────────────────────

    /**
     * Manhattan distance between two points or entities.
     * @param {string|{col,row}} a — entity id or cell
     * @param {string|{col,row}} b — entity id or cell
     */
    function distance(a, b) {
      const ca = typeof a === "string" ? _entities.get(a)?.cell : a;
      const cb = typeof b === "string" ? _entities.get(b)?.cell : b;
      if (!ca || !cb) return Infinity;
      return Math.abs(ca.col - cb.col) + Math.abs(ca.row - cb.row);
    }

    /**
     * Checks whether the target is within the detector's vision cone.
     * @param {string} detectorId
     * @param {string|{col,row}} target — id or cell
     * @param {{ range: number, angle: number }} options
     *   range: maximum range in cells (default: 3)
     *   angle: total cone aperture in degrees (default: 90 = 45° each side)
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
     * Returns all cells within an entity's vision cone.
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
     * Adjacent cell in the specified direction (or current entity direction).
     * @param {string} id
     * @param {"N"|"S"|"E"|"W"} [dir] — direction (default: current entity direction)
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

    // ── Cell selection ──────────────────────────────────────────────────

    /**
     * Selects a cell (e.g. player taps on grid).
     * Emite "cellselect" com a lista de entidades presentes.
     * @param {{ col, row }} cell
     */
    function selectCell(cell) {
      const key      = _cellKey(cell);
      const ids      = [...(_cells.get(key) ?? [])];
      _emit("cellselect", { cell: { ...cell }, entities: ids });
      return api;
    }

    // ── Automatic detections ──────────────────────────────────────────────

    /**
     * Checks all entity pairs for cone detections.
     * Called automatically after move() and turn().
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
