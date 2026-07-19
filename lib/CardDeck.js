/**
 * CardDeck.js — ECJ Game Library
 * Baralho genérico: embaralha, compra, descarta e devolve cartas.
 * A narrativa é definida pelo jogo — a lib gerencia apenas o estado do baralho.
 *
 * REGRA DE OURO: sem áudio, sem visual. Emite eventos; o jogo decide o que fazer.
 *
 * Conceitos:
 *   - Carta:    qualquer objeto { id, ...props } definido pelo jogo
 *   - Deck:     pilha de compra
 *   - Hand:     mão do jogador
 *   - Discard:  pilha de descarte
 *
 * Eventos emitidos (use .on(event, cb)):
 *   "shuffle"   → { count }               deck embaralhado
 *   "draw"      → { card, hand, remaining } carta comprada
 *   "discard"   → { card, hand }           carta descartada
 *   "return"    → { card }                 carta devolvida ao deck
 *   "empty"     → {}                       deck esgotado ao tentar comprar
 *   "reset"     → {}                       deck reiniciado
 *
 * Uso:
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
 *   deck.draw();          // compra 1 carta para a mão
 *   deck.draw(2);         // compra 2 cartas
 *   deck.discard("A_spades");
 *   deck.recycleDiscard(); // devolve descarte ao deck e embaralha
 */

export const CardDeck = {
  create(cards = []) {
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

    // ── Estado ───────────────────────────────────────────────────────────────
    let _deck    = [];
    let _hand    = [];
    let _discard = [];

    // Copia inicial
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

    /** Devolve toda a pilha de descarte ao deck e embaralha */
    function recycleDiscard() {
      _deck.push(..._discard);
      _discard = [];
      shuffle();
      return api;
    }

    /** Reinicia o deck com as cartas originais */
    function reset() {
      _deck    = _copy(cards);
      _hand    = [];
      _discard = [];
      _emit("reset", {});
      return api;
    }

    /** Peek: olha o topo do deck sem comprar */
    function peek(n = 1) { return _deck.slice(-n).reverse(); }

    // Leituras
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
