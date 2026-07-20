/**
 * CardDeck.js — ECJ Game Library
 * Generic deck: shuffle, draw, discard, and return cards.
 * The narrative is defined by the game — the lib manages only the deck state.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Concepts:
 *   - Card:     any object { id, ...props } defined by the game
 *   - Deck:     draw pile
 *   - Hand:     player's hand
 *   - Discard:  discard pile
 *
 * Emitted events (use .on(event, cb)):
 *   "shuffle"   → { count }               deck shuffled
 *   "draw"      → { card, hand, remaining } card drawn
 *   "discard"   → { card, hand }           card discarded
 *   "return"    → { card }                 card returned to deck
 *   "empty"     → {}                       deck exhausted on draw attempt
 *   "reset"     → {}                       deck reset
 *
 * Usage:
 *   import { CardDeck } from "../../lib/CardDeck.js";
 *
 *   const deck = CardDeck.create([
 *     { id: "A_spades",  value: 11, suit: "spades" },
 *     { id: "K_hearts",  value: 10, suit: "hearts" },
 *     // ...
 *   ]);
 *
 *   deck.on("draw", ({ card, hand }) => { ... });
 *   deck.shuffle();
 *   deck.draw();          // draws 1 card into hand
 *   deck.draw(2);         // draws 2 cards
 *   deck.discard("A_spades");
 *   deck.recycleDiscard(); // moves discard pile back to deck and shuffles
 */

export const CardDeck = {
  create(cards = []) {
    // ── Events ───────────────────────────────────────────────────────────────
    const _listeners = {};
    function _emit(event, data = {}) {
      (_listeners[event] || []).forEach(cb => cb(data));
    }
    function on(event, cb)  { (_listeners[event] = _listeners[event] || []).push(cb); return api; }
    function off(event, cb) {
      if (_listeners[event]) _listeners[event] = _listeners[event].filter(f => f !== cb);
      return api;
    }

    // ── State ────────────────────────────────────────────────────────────────
    let _deck    = [];
    let _hand    = [];
    let _discard = [];

    // Initial copy
    function _copy(arr) { return arr.map(c => ({ ...c })); }

    // Fisher-Yates
    function _shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // ── API ──────────────────────────────────────────────────────────────────

    /** Embaralha o deck atual */
    function shuffle() {
      _shuffle(_deck);
      _emit("shuffle", { count: _deck.length });
      return api;
    }

    /** Compra N cartas do deck para a mão */
    function draw(n = 1) {
      const drawn = [];
      for (let i = 0; i < n; i++) {
        if (_deck.length === 0) {
          _emit("empty", {});
          break;
        }
        const card = _deck.pop();
        _hand.push(card);
        drawn.push(card);
        _emit("draw", { card, hand: [..._hand], remaining: _deck.length });
      }
      return drawn;
    }

    /** Descarta uma carta da mão pelo id */
    function discard(cardId) {
      const idx = _hand.findIndex(c => c.id === cardId);
      if (idx === -1) return null;
      const [card] = _hand.splice(idx, 1);
      _discard.push(card);
      _emit("discard", { card, hand: [..._hand] });
      return card;
    }

    /** Devolve uma carta da mão ao deck (sem embaralhar) */
    function returnCard(cardId) {
      const idx = _hand.findIndex(c => c.id === cardId);
      if (idx === -1) return null;
      const [card] = _hand.splice(idx, 1);
      _deck.unshift(card);
      _emit("return", { card });
      return card;
    }

    /** Moves entire discard pile back to deck and shuffles */
    function recycleDiscard() {
      _deck.push(..._discard);
      _discard = [];
      shuffle();
      return api;
    }

    /** Resets the deck with the original cards */
    function reset() {
      _deck    = _copy(cards);
      _hand    = [];
      _discard = [];
      _emit("reset", {});
      return api;
    }

    /** Peek: look at the top of the deck without drawing */
    function peek(n = 1) { return _deck.slice(-n).reverse(); }

    // Read-only accessors
    function deckCount()    { return _deck.length; }
    function hand()         { return [..._hand]; }
    function discardPile()  { return [..._discard]; }
    function handCard(id)   { return _hand.find(c => c.id === id) || null; }

    // Init
    reset();

    const api = {
      on, off,
      shuffle, draw, discard, returnCard, recycleDiscard, reset,
      peek, deckCount, hand, discardPile, handCard,
    };
    return api;
  }
};
