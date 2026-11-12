import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import {
  voiceFSMReducer,
  INITIAL_FSM_STATE,
  isVoiceActive,
} from '../../../src/voice/fsm.js';
import { BrowserSTTProvider } from '../../../src/voice/providers/BrowserSTTProvider';
import { BrowserTTSProvider } from '../../../src/voice/providers/BrowserTTSProvider';
import { ChunkedSpeaker } from '../../../src/voice/tts/chunked-speaker';
import { VADController } from '../../../src/voice/vad-controller';
import { turnTelemetry } from '../../../src/voice/telemetry';

export function useVoiceChat({
  apiBase,
  tenantSlug,
  activeConvId,
  setInputText,
  setLoading,
  sendMessageRef,
  setError,
}) {
  const [voiceState, dispatchVoice] = useReducer(voiceFSMReducer, INITIAL_FSM_STATE);
  const voiceStateRef = useRef(voiceState);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  const [voiceDevices, setVoiceDevices] = useState([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [audioRms, setAudioRms] = useState(0);

  // Extended voice settings (rate, pitch, VAD threshold, echo gate)
  const [voiceRate, setVoiceRate] = useState(1.05);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [vadThreshold, setVadThreshold] = useState(-42);
  const [echoGateEnabled, setEchoGateEnabled] = useState(true);

  const sttProviderRef = useRef(null);
  const chunkedSpeakerRef = useRef(null);
  const vadControllerRef = useRef(null);
  const voiceSessionIdRef = useRef(null);
  const voiceTurnCountRef = useRef(0);
  const abortControllerRef = useRef(null);
  const loadingRef = useRef(false);
  const pendingVoiceTranscriptRef = useRef('');
  const isPttActiveRef = useRef(false);
  const sttCallbacksRef = useRef(null);

  // Observability & Telemetry Timestamps
  const vadEndOfSpeechTimeRef = useRef(null);
  const sttFinalizeTimeRef = useRef(null);
  const firstTtsAudioTimeRef = useRef(null);
  const lastTurnTtfaRef = useRef(null);
  const lastUserVoiceTextRef = useRef('');
  const lastBotVoiceTextRef = useRef('');

  const detectBrowserName = () => {
    if (typeof navigator === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome') && !ua.includes('Edg/')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    return 'Other';
  };

  const recordVoiceTurnUsage = (opts = {}) => {
    const sessId = voiceSessionIdRef.current;
    const userText = lastUserVoiceTextRef.current || '';
    const botText = lastBotVoiceTextRef.current || '';

    const { stageLatency, turnTotalMs, ttfaMs: computedTtfa } = turnTelemetry.finalize(opts);
    const ttfa = computedTtfa || lastTurnTtfaRef.current;

    fetch(`${apiBase || ''}/api/v1/voice/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': tenantSlug || 'default',
      },
      credentials: 'include',
      body: JSON.stringify({
        sessionId: sessId || null,
        sttChars: userText.length,
        ttsChars: botText.length,
        llmTokens: Math.ceil(botText.length / 4),
        ttfaMs: ttfa || null,
        browser: detectBrowserName(),
        interrupted: !!opts.interrupted,
        sttError: !!opts.sttError,
        errorType: opts.errorType || null,
        stageLatency,
        turnTotalMs,
      }),
    }).catch((e) => console.warn('[Voice] Telemetry logging warning:', e));

    turnTelemetry.reset();

    if (!opts.keepTtfa) {
      lastTurnTtfaRef.current = null;
    }
  };

  const handleTurnCommit = () => {
    const text = pendingVoiceTranscriptRef.current.trim();
    if (!text) return;

    sttFinalizeTimeRef.current = Date.now();
    lastUserVoiceTextRef.current = text;
    lastBotVoiceTextRef.current = '';
    lastTurnTtfaRef.current = null;

    turnTelemetry.reset();
    if (vadEndOfSpeechTimeRef.current) {
      turnTelemetry._marks.sttStart = vadEndOfSpeechTimeRef.current;
      turnTelemetry._origin = vadEndOfSpeechTimeRef.current;
    } else {
      turnTelemetry.mark('sttStart');
    }
    turnTelemetry.mark('sttFinal');

    console.debug(`[Voice] Turn commit: "${text}"`);
    dispatchVoice({ type: 'STT_FINAL', transcript: text });
    setInputText(text);
    pendingVoiceTranscriptRef.current = '';

    sttProviderRef.current?.stop();
    vadControllerRef.current?.stop();

    if (sendMessageRef?.current) {
      voiceTurnCountRef.current += 1;
      sendMessageRef.current(null, text);
    }
  };

  const handleBargeIn = () => {
    console.debug('[Voice] ⚡ Barge-in - immediate cancel, fire-and-forget interrupt');

    chunkedSpeakerRef.current?.cancel();
    vadControllerRef.current?.setEchoGated(false);

    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch (_) {}
      abortControllerRef.current = null;
    }

    if (activeConvId) {
      fetch(`${apiBase || ''}/api/v1/chat/${activeConvId}/interrupt`, {
        method: 'POST',
        headers: { 'x-tenant-slug': tenantSlug || 'default' },
        credentials: 'include',
      }).catch(() => {});
    }

    turnTelemetry.mark('bargeIn');
    recordVoiceTurnUsage({ interrupted: true });

    dispatchVoice({ type: 'BARGE_IN' });
    pendingVoiceTranscriptRef.current = '';
    setLoading(false);

    if (isVoiceActive(voiceStateRef.current.state)) {
      vadControllerRef.current?.resume();
      dispatchVoice({ type: 'RESUME_LISTENING' });
    }
  };

  const resumeListeningForNextTurnRef = useRef(null);
  const _resumeListeningForNextTurn = useCallback(async () => {
    if (!voiceSessionIdRef.current) {
      console.debug('[Voice] Session closed - not resuming listen loop');
      return;
    }
    const curState = voiceStateRef.current.state;
    if (curState === 'processing' || curState === 'streaming' || curState === 'speaking') {
      console.debug('[Voice] Already busy - skipping relisten');
      return;
    }

    console.debug('[Voice] ▶ Resuming listen for next turn (persistent session)…');
    pendingVoiceTranscriptRef.current = '';
    setInputText('');

    try {
      if (vadControllerRef.current?.isSuspended) {
        vadControllerRef.current.resume();
      } else {
        await vadControllerRef.current?.start(voiceStateRef.current.deviceId);
      }

      vadControllerRef.current?.setHangoverMs(600);

      if (sttCallbacksRef.current) {
        sttProviderRef.current?.start(
          sttCallbacksRef.current,
          voiceStateRef.current.language,
          voiceStateRef.current.deviceId
        );
      }
    } catch (err) {
      console.warn('[Voice] Relisten start error:', err);
      dispatchVoice({ type: 'ERROR', message: err.message });
    }
  }, [setInputText]);
  resumeListeningForNextTurnRef.current = _resumeListeningForNextTurn;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stt = new BrowserSTTProvider();
    sttProviderRef.current = stt;

    const tts = new BrowserTTSProvider();
    const speaker = new ChunkedSpeaker(tts);
    chunkedSpeakerRef.current = speaker;

    speaker.setCallbacks({
      onFirstAudio: (ttfa) => {
        firstTtsAudioTimeRef.current = Date.now();
        const computedTtfa =
          ttfa ||
          (vadEndOfSpeechTimeRef.current
            ? Date.now() - vadEndOfSpeechTimeRef.current
            : null);
        console.debug(`[Voice] First audio playback started. TTFA: ${computedTtfa}ms`);
        lastTurnTtfaRef.current = computedTtfa;
        turnTelemetry.mark('ttsFirstAudio');
        dispatchVoice({ type: 'TTS_START' });
        vadControllerRef.current?.setEchoGated(true);
      },
      onSentenceStart: () => {
        dispatchVoice({ type: 'TTS_START' });
        vadControllerRef.current?.setEchoGated(true);
      },
      onFinished: () => {
        console.debug('[Voice] TTS finished - suspending VAD (not stopping), resuming next turn');
        turnTelemetry.mark('ttsEnd');
        vadControllerRef.current?.setEchoGated(false);
        vadControllerRef.current?.suspend();
        sttProviderRef.current?.stop();
        dispatchVoice({ type: 'TTS_END' });
        recordVoiceTurnUsage({ interrupted: false });
        resumeListeningForNextTurnRef.current?.();
      },
      onError: (err) => {
        console.warn('[Voice] TTS playback error:', err);
        vadControllerRef.current?.setEchoGated(false);
        vadControllerRef.current?.suspend();
        sttProviderRef.current?.stop();
        dispatchVoice({ type: 'TTS_END' });
        resumeListeningForNextTurnRef.current?.();
      },
    });

    const vad = new VADController({
      speechHangoverMs: 600,
      silenceThresholdDb: -42,
      echoGateThresholdDb: -26,
    });
    vadControllerRef.current = vad;

    vad.setCallbacks({
      onSpeechStart: () => {
        dispatchVoice({ type: 'VAD_SPEECH_START' });
      },
      onSpeechEnd: () => {
        vadEndOfSpeechTimeRef.current = Date.now();
        turnTelemetry.mark('sttStart');
        dispatchVoice({ type: 'VAD_SPEECH_END' });
        if (pendingVoiceTranscriptRef.current && pendingVoiceTranscriptRef.current.trim()) {
          handleTurnCommit();
        }
      },
      onRms: (rms) => {
        setAudioRms(rms);
      },
      onBargeIn: () => {
        handleBargeIn();
      },
      onError: (err) => {
        console.warn('[Voice] VAD audio warning:', err);
      },
    });

    fetch(`${apiBase || ''}/api/v1/voice/settings`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          if (data.settings.language) {
            dispatchVoice({ type: 'SET_LANGUAGE', language: data.settings.language });
          }
          if (typeof data.settings.pushToTalk === 'boolean') {
            dispatchVoice({ type: 'SET_PUSH_TO_TALK', pushToTalk: data.settings.pushToTalk });
          }
          if (typeof data.settings.rate === 'number') setVoiceRate(data.settings.rate);
          if (typeof data.settings.pitch === 'number') setVoicePitch(data.settings.pitch);
          if (typeof data.settings.vadThreshold === 'number') {
            setVadThreshold(data.settings.vadThreshold);
            if (vadControllerRef.current?.options) {
              vadControllerRef.current.options.silenceThresholdDb = data.settings.vadThreshold;
            }
          }
          if (typeof data.settings.echoGateEnabled === 'boolean') setEchoGateEnabled(data.settings.echoGateEnabled);
          chunkedSpeakerRef.current?.setOptions({
            rate: data.settings.rate || 1.05,
            pitch: data.settings.pitch || 1.0,
          });
        }
      })
      .catch(() => {});

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setVoiceDevices(audioInputs);
      }).catch(() => {});
    }

    return () => {
      stt.stop();
      speaker.cancel();
      vad.stop();
    };
  }, []);

  const startVoiceMode = async () => {
    if (setError) setError(null);
    if (typeof window === 'undefined') return;

    if (!sttProviderRef.current?.isSupported()) {
      dispatchVoice({ type: 'UNSUPPORTED_BROWSER' });
      return;
    }

    try {
      try {
        const res = await fetch(`${apiBase || ''}/api/v1/voice/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-slug': tenantSlug || 'default',
          },
          credentials: 'include',
          body: JSON.stringify({
            conversationId: activeConvId,
            language: voiceStateRef.current.language,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          voiceSessionIdRef.current = data.session?.id;
          voiceTurnCountRef.current = 0;
        }
      } catch (sessErr) {
        console.warn('[Voice] Session init warning:', sessErr);
      }

      await vadControllerRef.current?.start(voiceStateRef.current.deviceId);

      const sttCbs = {
        onStart: () => {
          if (voiceStateRef.current.state === 'idle') {
            dispatchVoice({ type: 'START' });
          }
        },
        onPartial: (partial) => {
          pendingVoiceTranscriptRef.current = partial;
          dispatchVoice({ type: 'STT_PARTIAL', transcript: partial });
          setInputText(partial);
          if (!turnTelemetry.has('sttFirstPartial')) {
            turnTelemetry.mark('sttFirstPartial');
          }
          const adaptiveMs = vadControllerRef.current?.adaptiveHangoverMs?.(partial);
          if (adaptiveMs) vadControllerRef.current.setHangoverMs(adaptiveMs);
        },
        onFinal: (finalPart) => {
          pendingVoiceTranscriptRef.current = (pendingVoiceTranscriptRef.current + ' ' + finalPart).trim();
          setInputText(pendingVoiceTranscriptRef.current);
        },
        onError: (err) => {
          if (err === 'permission_denied' || err === 'not-allowed') {
            dispatchVoice({ type: 'PERMISSION_DENIED' });
            stopVoiceMode();
          } else if (err === 'unsupported_browser') {
            dispatchVoice({ type: 'UNSUPPORTED_BROWSER' });
          } else {
            console.warn('[Voice] STT warning:', err);
            recordVoiceTurnUsage({ sttError: true, errorType: String(err) });
          }
        },
        onEnd: () => {},
      };
      sttCallbacksRef.current = sttCbs;
      sttProviderRef.current?.start(
        sttCbs,
        voiceStateRef.current.language,
        voiceStateRef.current.deviceId
      );

      dispatchVoice({ type: 'START' });
    } catch (err) {
      console.error('[Voice] Failed to start voice mode:', err);
      dispatchVoice({ type: 'ERROR', message: err.message });
    }
  };

  const stopVoiceMode = () => {
    sttProviderRef.current?.stop();
    chunkedSpeakerRef.current?.cancel();
    vadControllerRef.current?.stop();

    if (voiceSessionIdRef.current) {
      fetch(`${apiBase || ''}/api/v1/voice/session/${voiceSessionIdRef.current}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug || 'default',
        },
        credentials: 'include',
        body: JSON.stringify({
          turnCount: voiceTurnCountRef.current,
          endedReason: 'completed',
        }),
      }).catch(() => {});
      voiceSessionIdRef.current = null;
    }

    dispatchVoice({ type: 'STOP' });
    pendingVoiceTranscriptRef.current = '';
    setInputText('');
  };

  const toggleVoiceMode = () => {
    if (isVoiceActive(voiceState.state)) {
      if (pendingVoiceTranscriptRef.current?.trim()) {
        handleTurnCommit();
      } else {
        stopVoiceMode();
      }
    } else {
      startVoiceMode();
    }
  };

  // Push-to-Talk Spacebar Listener
  useEffect(() => {
    if (!voiceState.pushToTalk || !isVoiceActive(voiceState.state)) return;

    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
        e.preventDefault();
        if (!isPttActiveRef.current) {
          isPttActiveRef.current = true;
          dispatchVoice({ type: 'VAD_SPEECH_START' });
        }
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space' && isPttActiveRef.current) {
        e.preventDefault();
        isPttActiveRef.current = false;
        dispatchVoice({ type: 'VAD_SPEECH_STOP' });
        handleTurnCommit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [voiceState.pushToTalk, voiceState.state]);

  return {
    voiceState,
    dispatchVoice,
    voiceStateRef,
    voiceDevices,
    showVoiceSettings,
    setShowVoiceSettings,
    audioRms,
    voiceRate,
    setVoiceRate,
    voicePitch,
    setVoicePitch,
    vadThreshold,
    setVadThreshold,
    echoGateEnabled,
    setEchoGateEnabled,
    startVoiceMode,
    stopVoiceMode,
    toggleVoiceMode,
    handleBargeIn,
    recordVoiceTurnUsage,
    sttProviderRef,
    chunkedSpeakerRef,
    vadControllerRef,
    abortControllerRef,
    loadingRef,
    lastUserVoiceTextRef,
    lastBotVoiceTextRef,
    vadEndOfSpeechTimeRef,
    sttFinalizeTimeRef,
    firstTtsAudioTimeRef,
    lastTurnTtfaRef,
  };
}

