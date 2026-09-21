/**
 * VoiceModeOverlay.js — Floating bottom-center voice mode overlay
 *
 * Shown when voice mode is active. Contains:
 *  - Animated VoiceOrb (state + RMS driven)
 *  - State label (Listening, Thinking, Speaking, etc.)
 *  - Rolling transcript (user spoke + AI response)
 *  - Settings gear button (opens settings panel)
 *  - Stop button
 *
 * Floats above the chat bar without blocking the message history.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Volume2,
  Loader2,
  Zap,
  X,
  Settings,
} from 'lucide-react';
import VoiceOrb from './VoiceOrb';

// State-to-label mapping
const STATE_LABELS = {
  idle:                { text: 'Voice Off',     icon: null },
  listening:           { text: 'Listening\u2026',     icon: Mic },
  vad_detecting:       { text: 'Hearing you\u2026',   icon: Mic },
  processing:          { text: 'Thinking\u2026',      icon: Loader2 },
  streaming:           { text: 'Generating\u2026',    icon: Loader2 },
  speaking:            { text: 'Speaking\u2026',      icon: Volume2 },
  interrupted:         { text: 'Interrupted',   icon: Zap },
  error:               { text: 'Voice Error',   icon: null },
  permission_denied:   { text: 'Mic Denied',    icon: null },
  unsupported_browser: { text: 'Not Supported', icon: null },
};

const STATE_COLORS = {
  idle:                '#64748b',
  listening:           '#3b82f6',
  vad_detecting:       '#10b981',
  processing:          '#8b5cf6',
  streaming:           '#6366f1',
  speaking:            '#06b6d4',
  interrupted:         '#f59e0b',
  error:               '#ef4444',
  permission_denied:   '#ef4444',
  unsupported_browser: '#64748b',
};

export default function VoiceModeOverlay({
  voiceState,       // full voiceState object from FSM
  audioRms = 0,
  onStop,
  onSettings,
  isVisible = false,
}) {
  const transcriptRef = useRef(null);
  const [historyItems, setHistoryItems] = useState([]);
  const prevStateRef = useRef(voiceState?.state);

  const state = voiceState?.state || 'idle';
  const transcript = voiceState?.transcript || '';
  const cfg = STATE_LABELS[state] || STATE_LABELS.idle;
  const color = STATE_COLORS[state] || '#64748b';

  // Auto-scroll transcript when new content arrives
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, historyItems]);

  // Track state transitions to push transcript turns into history
  useEffect(() => {
    const prev = prevStateRef.current;
    // When STT finalizes and we go to processing, push the user transcript
    if (prev === 'vad_detecting' && state === 'processing' && voiceState?.finalTranscript) {
      setHistoryItems((h) => [
        ...h.slice(-6), // Keep last 6 turns max
        { role: 'user', text: voiceState.finalTranscript, ts: Date.now() },
      ]);
    }
    prevStateRef.current = state;
  }, [state, voiceState?.finalTranscript]);

  if (!isVisible) return null;

  const IconComp = cfg.icon;

  return (
    <>
      {/* Backdrop blur overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'voiceOverlayFadeIn 0.25s ease',
        }}
        onClick={onStop}
        aria-hidden="true"
      />

      {/* Floating panel — sits above chat input */}
      <div
        role="dialog"
        aria-label="Voice Mode"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '90px', // clears the chat input bar
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(480px, calc(100vw - 32px))',
          background: 'rgba(15, 23, 42, 0.96)',
          border: `1px solid ${color}40`,
          borderRadius: '24px',
          boxShadow: `0 0 0 1px ${color}20, 0 24px 64px rgba(0,0,0,0.6), 0 0 80px ${color}18`,
          padding: '28px 24px 20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          animation: 'voicePanelSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Orb */}
        <div style={{ position: 'relative' }}>
          <VoiceOrb voiceState={state} audioRms={audioRms} size={140} />
        </div>

        {/* State label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: color,
          fontSize: '16px',
          fontWeight: 600,
          letterSpacing: '0.02em',
          transition: 'color 0.3s ease',
        }}>
          {IconComp && (
            <IconComp
              size={16}
              style={
                state === 'processing' || state === 'streaming'
                  ? { animation: 'spin 1.2s linear infinite' }
                  : state === 'speaking'
                  ? { animation: 'voicePulse 1.4s ease-in-out infinite' }
                  : undefined
              }
            />
          )}
          {cfg.text}
        </div>

        {/* Live transcript (current partial STT) */}
        {transcript && (
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '14px',
            color: '#e2e8f0',
            width: '100%',
            textAlign: 'center',
            fontStyle: 'italic',
            lineHeight: 1.5,
            maxHeight: '60px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            "{transcript}"
          </div>
        )}

        {/* Conversation history panel */}
        {historyItems.length > 0 && (
          <div
            ref={transcriptRef}
            style={{
              width: '100%',
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '2px 0',
            }}
          >
            {historyItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12px',
                  color: item.role === 'user' ? '#94a3b8' : '#64748b',
                  lineHeight: 1.5,
                }}
              >
                <span style={{
                  flexShrink: 0,
                  width: '32px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: item.role === 'user' ? '#6366f1' : '#06b6d4',
                  paddingTop: '1px',
                }}>
                  {item.role === 'user' ? 'You' : 'AI'}
                </span>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Browser incompatibility warning */}
        {state === 'unsupported_browser' && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#fca5a5',
            textAlign: 'center',
            width: '100%',
          }}>
            Voice requires Chrome or Edge. Firefox lacks Web Speech API support.
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '4px',
        }}>
          {/* Settings */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSettings?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
            aria-label="Voice settings"
          >
            <Settings size={14} />
            Settings
          </button>

          {/* Stop voice */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStop?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            aria-label="Stop voice mode"
          >
            <X size={14} />
            Stop Voice
          </button>
        </div>

        {/* Subtle instructions hint */}
        <p style={{
          margin: 0,
          fontSize: '11px',
          color: '#334155',
          textAlign: 'center',
        }}>
          Speak naturally — Xarwiz listens automatically.{' '}
          {voiceState?.pushToTalk ? 'Hold Space to talk.' : 'Say anything to interrupt.'}
        </p>
      </div>

      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes voiceOverlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes voicePanelSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes voicePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}
