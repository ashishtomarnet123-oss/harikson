/**
 * telemetry.js — Voice Turn Latency Telemetry Module
 *
 * Captures per-turn stage timestamps for the full voice pipeline:
 *   VAD speech-end → STT → LLM → TTS
 *
 * All timestamps are stored as ms offsets from `sttStart` (= VAD speech-end).
 * This makes cross-turn and cross-session comparison easy.
 *
 * Usage:
 *   import { VoiceTurnTelemetry } from '../voice/telemetry';
 *
 *   const tel = new VoiceTurnTelemetry();
 *   tel.mark('sttStart');
 *   tel.mark('sttFirstPartial');
 *   // ... voice pipeline events ...
 *   tel.mark('ttsEnd');
 *   const payload = tel.finalize({ interrupted: false });
 *   // payload is ready to be sent to POST /api/v1/voice/usage
 *
 * Pipeline stages tracked:
 *   sttStart        — VAD speech-end fires, turn begins
 *   sttFirstPartial — first partial transcript received
 *   sttFinal        — STT final result / handleTurnCommit()
 *   llmRequest      — fetch() / SSE connection opened
 *   llmFirstToken   — first SSE token received
 *   ttsRequest      — ChunkedSpeaker.startStream() called
 *   ttsFirstAudio   — onFirstAudio callback fires (browser started playing)
 *   ttsEnd          — onFinished callback fires (all audio played)
 *   bargeIn         — user interrupted (null if turn completed normally)
 */

const STAGES = [
  'sttStart',
  'sttFirstPartial',
  'sttFinal',
  'llmRequest',
  'llmFirstToken',
  'ttsRequest',
  'ttsFirstAudio',
  'ttsEnd',
  'bargeIn',
];

export class VoiceTurnTelemetry {
  constructor() {
    this._marks = {};
    this._origin = null; // absolute timestamp of sttStart
  }

  /**
   * Record a pipeline stage. Call this exactly once per stage.
   * @param {string} stage — one of the STAGES constants
   */
  mark(stage) {
    if (!STAGES.includes(stage)) {
      console.warn(`[VoiceTelemetry] Unknown stage: ${stage}`);
      return;
    }
    const now = Date.now();
    this._marks[stage] = now;
    if (stage === 'sttStart') {
      this._origin = now;
    }
    console.debug(`[VoiceTelemetry] ⏱ ${stage}: +${this._origin ? now - this._origin : 0}ms`);
  }

  /**
   * Check if a stage has been marked.
   */
  has(stage) {
    return stage in this._marks;
  }

  /**
   * Reset all marks (start of new turn).
   */
  reset() {
    this._marks = {};
    this._origin = null;
  }

  /**
   * Compute ms offset from sttStart for a given stage.
   * Returns null if stage not marked or origin missing.
   */
  _offset(stage) {
    if (!this._origin || !(stage in this._marks)) return null;
    return this._marks[stage] - this._origin;
  }

  /**
   * Build the stageLatency payload for POST /api/v1/voice/usage.
   * All values are ms offsets from sttStart.
   *
   * @param {object} opts
   * @param {boolean} opts.interrupted — true if turn was barged-in
   * @returns {{ stageLatency: object, turnTotalMs: number|null, ttfaMs: number|null }}
   */
  finalize(opts = {}) {
    const stageLatency = {};
    for (const stage of STAGES) {
      stageLatency[stage] = this._offset(stage);
    }

    // turnTotalMs: sttStart → ttsEnd (or bargeIn if interrupted)
    const endStage = opts.interrupted ? 'bargeIn' : 'ttsEnd';
    const turnTotalMs = this._offset(endStage);

    // ttfaMs: sttFinal → ttsFirstAudio (most meaningful latency metric)
    const ttfaMs = (() => {
      if (!this._marks.sttFinal || !this._marks.ttsFirstAudio) return null;
      return this._marks.ttsFirstAudio - this._marks.sttFinal;
    })();

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[VoiceTelemetry] Turn summary:', {
        sttLatency:  this._offset('sttFinal'),
        llmFirstToken: this._offset('llmFirstToken'),
        ttfaMs,
        turnTotalMs,
        interrupted: !!opts.interrupted,
      });
    }

    return { stageLatency, turnTotalMs, ttfaMs };
  }
}

/**
 * Singleton turn telemetry instance.
 * Import and use this directly in chat.js — one instance per voice session.
 */
export const turnTelemetry = new VoiceTurnTelemetry();
