/**
 * CreatureProfile.js — ECJ Game Library
 * Defines and draws creature/opponent profiles for capture mechanics.
 * Reusable for fishing, hunting, battle, gathering, etc.
 *
 * Usage:
 *   import { CreatureProfile } from "../../lib/CreatureProfile.js";
 *
 *   const pool = CreatureProfile.createPool([
 *     { id: "common_fish", name: "Peixe Comum", weight: 0.5, pull: 3, pullNeeded: 5, biteWindowMs: 2000, tiredBaseMs: 4000 },
 *     { id: "rare_fish",   name: "Peixe Raro",  weight: 0.1, pull: 8, pullNeeded: 12, biteWindowMs: 1000, tiredBaseMs: 8000 },
 *   ]);
 *
 *   const creature = pool.roll();  // sorteio ponderado
 */

export const CreatureProfile = {
  createPool(profiles = []) {
    // Normaliza pesos
    const total = profiles.reduce((s, p) => s + (p.weight ?? 1), 0);
    const normalized = profiles.map(p => ({ ...p, weight: (p.weight ?? 1) / total }));

    function roll() {
      let r = Math.random();
      for (const p of normalized) {
        r -= p.weight;
        if (r <= 0) return { ...p };
      }
      return { ...normalized[normalized.length - 1] };
    }

    function get(id) {
      return normalized.find(p => p.id === id) ?? null;
    }

    function all() { return normalized.map(p => ({ ...p })); }

    return { roll, get, all };
  }
};
