/**
 * InteractionSequence.js — ECJ Game Library
 * Recognizes gesture sequences and fires events on completion or failure.
 * The narrative is defined by the game — the lib manages only the recognition.
 *
 * GOLDEN RULE: no audio, no visuals. Emits events; the game decides what to do.
 *
 * Concepts:
 *   - Step:     one expected gesture in the sequence { gesture, timeoutMs? }
 *   - Gesture:  string defined by the game (e.g. "shake", "tilt_left", "tilt_right")
 *   - Sequence: array of Steps defining a complete pattern
 *
 * Flow:
 *   IDLE → input(gesture) → advances step → ... → "completed" | "failed" | "timeout"
 *
 * Emitted events (use .on(event, cb)):
 *   "started"    → { sequence }                  first correct gesture received
 *   "progress"   → { step, total, gesture }       correct gesture, advances
 *   "completed"  → { sequence, elapsed }          sequence complete
 *   "failed"     → { expected, received, step }   wrong gesture
 *   "timeout"    → { step, total }                time ran out on current step
 *   "reset"      → {}                             sequence manually reset
 *
 * Basic usage:
 *
 *   const seq = InteractionSequence.create({
 *     sequence: [
 *       { gesture: "shake"      },
 *       { gesture: "tilt_left",  timeoutMs: 2000 },
 *       { gesture: "tilt_right", timeoutMs: 2000 },
 *     ],
 *     globalTimeoutMs: 5000,   // total sequence timeout (optional)
 *     strict: true,            // wrong gestures fail the sequence (default: true)
 *   });
 *
 *   seq.on("completed", ({ elapsed }) => { // open lock, cast spell... });
 *   seq.on("failed",    ({ expected, received }) => { // feedback negativo });
 *   seq.on("timeout",   ({ step }) => { // tempo esgotado });
 *
 *   // SensorKit integration:
 *   SensorKit.on("shake",      () => seq.input("shake"));
 *   SensorKit.on("tiltLeft",   () => seq.input("tilt_left"));
 *   SensorKit.on("tiltRight",  () => seq.input("tilt_right"));
 *   SensorKit.on("tiltForward",() => seq.input("tilt_forward"));
 */

const InteractionSequence = (() => {

  /**
   * Creates a gesture sequence recognition instance.
   *
   * @param {Object}   opts
   * @param {Array}    opts.sequence         - Steps: [{ gesture, timeoutMs? }, ...]
   * @param {number}   [opts.globalTimeoutMs]- Total sequence timeout (ms)
   * @param {boolean}  [opts.strict=true]    - Se true, wrong gesture → "failed"
   *                                           If false, wrong gestures are ignored
   * @param {boolean}  [opts.loop=false]     - If true, restarts after completion
   */
  function create(opts = {}) {
    const sequence        = (opts.sequence || []).map((s, i) => ({ ...s, index: i }));
    const globalTimeoutMs = opts.globalTimeoutMs || null;
    const strict          = opts.strict !== false;
    const loop            = opts.loop   || false;

    if (!sequence.length) throw new Error("InteractionSequence: sequence cannot be empty.");

    // ── Estado interno ────────────────────────────────────────────────────────
    let _listeners       = {};
    let _currentStep     = 0;
    let _state           = "idle";       // idle | running | completed | failed
    let _stepTimer       = null;
    let _globalTimer     = null;
    let _startedAt       = null;

    // ── EventEmitter ─────────────────────────────────────────────────────────
    function _emit(event, data) {
      (_listeners[event] || []).forEach(cb => cb(data));
    }

    function on(event, cb) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(cb);
      return () => off(event, cb);
    }

    function off(event, cb) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(fn => fn !== cb);
    }

    // ── Timers ────────────────────────────────────────────────────────────────
    function _clearTimers() {
      if (_stepTimer)   { clearTimeout(_stepTimer);   _stepTimer   = null; }
      if (_globalTimer) { clearTimeout(_globalTimer); _globalTimer = null; }
    }

    function _startStepTimer(step) {
      if (!step.timeoutMs) return;
      _stepTimer = setTimeout(() => {
        _clearTimers();
        _state = "idle";
        _currentStep = 0;
        _emit("timeout", { step: step.index, total: sequence.length });
      }, step.timeoutMs);
    }

    function _startGlobalTimer() {
      if (!globalTimeoutMs) return;
      _globalTimer = setTimeout(() => {
        _clearTimers();
        _state = "idle";
        _currentStep = 0;
        _emit("timeout", { step: _currentStep, total: sequence.length });
      }, globalTimeoutMs);
    }

    // ── Core ──────────────────────────────────────────────────────────────────

    /**
     * Envia um gesto para o reconhecedor.
     * @param {string} gesture - nome do gesto (ex: "shake", "tilt_left")
     */
    function input(gesture) {
      if (_state === "completed" || _state === "failed") return;

      const expected = sequence[_currentStep];

      // Gesto correto
      if (gesture === expected.gesture) {

        // First step — sequence starts
        if (_currentStep === 0) {
          _state     = "running";
          _startedAt = Date.now();
          _startGlobalTimer();
          _emit("started", { sequence });
        }

        _clearTimers();  // cancela timer do step anterior

        _emit("progress", {
          step:    _currentStep,
          total:   sequence.length,
          gesture,
        });

        _currentStep++;

        // Sequence complete
        if (_currentStep >= sequence.length) {
          _clearTimers();
          const elapsed = Date.now() - _startedAt;
          _state = loop ? "idle" : "completed";
          if (loop) _currentStep = 0;
          _emit("completed", { sequence, elapsed });
          return;
        }

        // Start timer for next step
        _startStepTimer(sequence[_currentStep]);
        return;
      }

      // Gesto errado
      if (strict && _state === "running") {
        _clearTimers();
        _emit("failed", {
          expected: expected.gesture,
          received: gesture,
          step:     _currentStep,
        });
        _state       = "idle";
        _currentStep = 0;
        return;
      }

      // Non-strict mode: ignore wrong gestures before sequence starts
      // but fail if already in the middle of the sequence
      if (!strict && _state === "running") {
        _clearTimers();
        _emit("failed", {
          expected: expected.gesture,
          received: gesture,
          step:     _currentStep,
        });
        _state       = "idle";
        _currentStep = 0;
      }
      // If idle and non-strict, silently ignore wrong gesture
    }

    /**
     * Manually resets the sequence.
     */
    function reset() {
      _clearTimers();
      _currentStep = 0;
      _state       = "idle";
      _startedAt   = null;
      _emit("reset", {});
    }

    /** Current state: idle | running | completed | failed */
    function state() { return _state; }

    /** Current step (0-based) */
    function currentStep() { return _currentStep; }

    /** Total number of steps */
    function totalSteps() { return sequence.length; }

    /** Progress 0..1 */
    function progress() {
      return sequence.length ? _currentStep / sequence.length : 0;
    }

    const api = {
      on, off,
      input, reset,
      state, currentStep, totalSteps, progress,
    };
    return api;
  }

  // ── Factory helpers ────────────────────────────────────────────────────────

  /**
   * Shorthand for simple sequences without per-step timeout.
   * @param {string[]} gestures  - ex: ["shake", "tilt_left", "tilt_right"]
   * @param {Object}   [opts]    - globalTimeoutMs, strict, loop
   */
  function fromGestures(gestures, opts = {}) {
    return create({ ...opts, sequence: gestures.map(g => ({ gesture: g })) });
  }

  return { create, fromGestures };
})();
