/**
 * fsm.ts / fsm.js — Voice State Machine (Reducer Pattern)
 *
 * Single source of truth for all voice UI state.
 * Zero scattered booleans. Illegal transitions log a warning and are ignored.
 *
 * States:
 *  idle                → mic is off, nothing active
 *  listening           → mic active, waiting for speech to start
 *  vad_detecting       → VAD heard energy, SpeechRecognition collecting
 *  processing          → STT finalized, LLM request in flight
 *  streaming           → LLM is streaming tokens
 *  speaking            → TTS is playing audio to the user
 *  interrupted         → user barged in during speaking; new turn about to begin
 *  error               → recoverable error (mic denied, STT fail, etc.)
 *  permission_denied   → mic permission denied (terminal until page reload)
 *  unsupported_browser → browser lacks SpeechRecognition (e.g. Firefox)
 */

export const INITIAL_FSM_STATE = {
  state: 'idle',
  transcript: '',
  finalTranscript: '',
  error: null,
  language: 'en-US',
  pushToTalk: false,
  deviceId: null,
  ttfaStart: null, // timestamp: user finished speaking
  ttfaMs: null,    // time to first audio
};

// Valid transitions map: state → allowed next states
const VALID = {
  idle:                ['listening', 'unsupported_browser', 'permission_denied'],
  listening:           ['vad_detecting', 'processing', 'idle', 'error', 'permission_denied'],
  vad_detecting:       ['processing', 'listening', 'idle', 'error'],
  processing:          ['streaming', 'speaking', 'listening', 'error', 'idle', 'interrupted'],
  streaming:           ['speaking', 'listening', 'error', 'idle', 'interrupted'],
  speaking:            ['listening', 'interrupted', 'idle', 'error'],
  interrupted:         ['vad_detecting', 'listening', 'idle', 'error', 'processing'],
  error:               ['listening', 'idle'],
  permission_denied:   ['idle'],
  unsupported_browser: ['idle'],
};

function canTransition(from, to) {
  return VALID[from]?.includes(to) ?? false;
}

export function voiceFSMReducer(state, action) {
  const ts = Date.now();

  const go = (next, extra) => {
    if (!canTransition(state.state, next)) {
      console.debug(
        `[VoiceFSM] ⚠️ Illegal transition: ${state.state} → ${next} (action: ${action.type}) — ignored`
      );
      return state;
    }
    console.debug(`[VoiceFSM] ${state.state} → ${next} (${action.type}) +${ts}ms`);
    return { ...state, state: next, error: null, ...(extra || {}) };
  };

  switch (action.type) {
    case 'START':
      return go('listening', { error: null });

    case 'STOP':
      if (state.state === 'idle') return state;
      console.debug(`[VoiceFSM] STOP from ${state.state}`);
      return {
        ...INITIAL_FSM_STATE,
        language: state.language,
        pushToTalk: state.pushToTalk,
        deviceId: state.deviceId,
      };

    case 'VAD_SPEECH_START':
      if (state.state === 'speaking' || state.state === 'streaming' || state.state === 'processing') {
        // Barge-in during AI generation or speech
        return go('interrupted', { transcript: '' });
      }
      return go('vad_detecting');

    case 'VAD_SPEECH_STOP':
      return state;

    case 'STT_PARTIAL':
      return { ...state, transcript: action.transcript };

    case 'STT_FINAL':
      return go('processing', {
        finalTranscript: action.transcript,
        transcript: '',
        ttfaStart: ts,
      });

    case 'LLM_STREAM_START':
      return go('streaming');

    case 'LLM_STREAM_END':
      if (state.state === 'streaming') {
        return go('speaking');
      }
      return state;

    case 'TTS_START':
      if (state.state !== 'speaking') {
        const extra = {};
        if (state.ttfaStart && !state.ttfaMs) {
          extra.ttfaMs = ts - state.ttfaStart;
          console.debug(`[VoiceFSM] ⚡ TTFA: ${extra.ttfaMs}ms`);
        }
        return go('speaking', extra);
      }
      return state;

    case 'TTS_END':
      // After AI finishes speaking a full turn, return to listening for the next
      // turn — NOT idle. Explicit stop is handled by the STOP action below.
      return go('listening', { transcript: '', ttfaStart: null });

    case 'BARGE_IN':
      return go('interrupted', { transcript: '' });

    case 'RESUME_LISTENING':
      return go('listening', { transcript: '', ttfaStart: null });

    case 'ERROR':
      return { ...state, state: 'error', error: action.message };

    case 'PERMISSION_DENIED':
      return { ...state, state: 'permission_denied', error: 'Microphone permission denied.' };

    case 'UNSUPPORTED':
    case 'UNSUPPORTED_BROWSER':
      return {
        ...state,
        state: 'unsupported_browser',
        error: 'Voice not supported in this browser. Use Chrome or Edge.',
      };

    case 'SET_LANGUAGE':
      return { ...state, language: action.language };

    case 'SET_PUSH_TO_TALK':
      return { ...state, pushToTalk: action.pushToTalk };

    case 'SET_DEVICE_ID':
      return { ...state, deviceId: action.deviceId };

    case 'RESET':
      return {
        ...INITIAL_FSM_STATE,
        language: state.language,
        pushToTalk: state.pushToTalk,
        deviceId: state.deviceId,
      };

    default:
      return state;
  }
}

// ── Derived state helpers (replace all scattered useState/useRef) ──────────
export const isVoiceActive = (s) =>
  !['idle', 'permission_denied', 'unsupported_browser'].includes(s);

export const isListening = (s) =>
  ['listening', 'vad_detecting'].includes(s);

export const isAISpeaking = (s) => s === 'speaking';

export const isBusy = (s) =>
  ['processing', 'streaming'].includes(s);

export const canBargeIn = (s) =>
  ['speaking', 'streaming', 'processing'].includes(s);

export const isTerminal = (s) =>
  ['permission_denied', 'unsupported_browser'].includes(s);
