/**
 * VoiceModeOverlay.js — Ultra-premium floating voice mode overlay
 *
 * Designed with modern glassmorphism, dynamic ambient lighting,
 * live audio feedback, balanced controls, and crisp typography.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  Zap,
  X,
  Settings,
  Sparkles,
  PhoneOff,
  Radio,
  AudioWaveform,
} from 'lucide-react';
import VoiceOrb from './VoiceOrb';

// State-to-label mapping
const STATE_LABELS = {
  idle:                { text: 'Voice Off',     hint: 'Voice mode is inactive.',                    icon: null },
  listening:           { text: 'Listening…',    hint: 'Speak naturally — Xarwiz is listening.',       icon: Mic },
  vad_detecting:       { text: 'Hearing you…',  hint: 'Receiving voice input…',                      icon: Mic },
  processing:          { text: 'Thinking…',     hint: 'Analyzing your query…',                       icon: Loader2 },
  streaming:           { text: 'Generating…',   hint: 'Synthesizing response…',                      icon: Loader2 },
  speaking:            { text: 'Speaking…',     hint: 'Say anything to interrupt at any time.',      icon: Volume2 },
  interrupted:         { text: 'Interrupted',   hint: 'Listening for your next message…',            icon: Zap },
  error:               { text: 'Voice Error',   hint: 'An error occurred. Try speaking again.',      icon: null },
  permission_denied:   { text: 'Mic Denied',    hint: 'Please allow microphone access in browser.',  icon: MicOff },
  unsupported_browser: { text: 'Not Supported', hint: 'Voice requires Chrome or Edge.',              icon: null },
};

const STATE_COLORS = {
  idle:                '#64748b',
  listening:           '#3b82f6',
  vad_detecting:       '#10b981',
  processing:          '#a855f7',
  streaming:           '#818cf8',
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
  const isAudioActive = state === 'vad_detecting' || state === 'speaking' || audioRms > 0.03;

  return (
    <>
      {/* Backdrop blur overlay with smooth fade */}
      <div
        className="voice-backdrop"
        onClick={onStop}
        aria-hidden="true"
      />

      {/* Floating Panel — centered above chat input */}
      <div
        role="dialog"
        aria-label="Voice Mode"
        aria-live="polite"
        className="voice-panel-dialog"
      >
        {/* Ambient Top Glow Layer */}
        <div className="voice-ambient-glow" />

        {/* ── Top Header Row ── */}
        <div className="voice-header-bar">
          <div className="voice-brand-pill">
            <span className="live-status-dot" />
            <span className="voice-brand-text">XARWIZ VOICE</span>
            <span className="voice-mode-tag">
              {voiceState?.pushToTalk ? (
                <>
                  <Radio size={11} />
                  <span>PTT</span>
                </>
              ) : (
                <>
                  <Sparkles size={11} />
                  <span>Live</span>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onStop}
            className="voice-close-btn"
            aria-label="Close voice mode"
            title="Close voice mode"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Center Stage: Luminous Animated Orb ── */}
        <div className="voice-orb-wrapper">
          <div className="orb-backlight" />
          <VoiceOrb voiceState={state} audioRms={audioRms} size={150} />
          
          {/* Subtle audio reactivity waves beneath orb */}
          <div className="voice-audio-bars">
            <span className={`bar bar-1 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar bar-2 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar bar-3 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar bar-4 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar bar-5 ${isAudioActive ? 'active' : ''}`} />
          </div>
        </div>

        {/* ── State Pill Badge ── */}
        <div className="voice-state-pill">
          {IconComp && (
            <span className="state-icon-wrapper">
              <IconComp
                size={14}
                className={`state-icon ${
                  state === 'processing' || state === 'streaming'
                    ? 'icon-spin'
                    : state === 'speaking'
                    ? 'icon-pulse'
                    : ''
                }`}
              />
            </span>
          )}
          <span className="state-text">{cfg.text}</span>
        </div>

        {/* ── Context Hint or Live Transcript ── */}
        {transcript ? (
          <div className="voice-live-transcript">
            <div className="transcript-quotes">
              <AudioWaveform size={14} className="transcript-icon" />
              <span>"{transcript}"</span>
            </div>
          </div>
        ) : (
          <p className="voice-hint-text">{cfg.hint}</p>
        )}

        {/* ── Conversation Turn History (if present) ── */}
        {historyItems.length > 0 && (
          <div ref={transcriptRef} className="voice-history-panel">
            {historyItems.map((item, idx) => (
              <div key={idx} className="voice-history-row">
                <span className={`history-role-tag ${item.role === 'user' ? 'role-user' : 'role-ai'}`}>
                  {item.role === 'user' ? 'You' : 'AI'}
                </span>
                <span className="history-text">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Browser Warning ── */}
        {state === 'unsupported_browser' && (
          <div className="voice-alert-warning">
            Voice requires Chrome or Edge. Firefox lacks Web Speech API support.
          </div>
        )}

        {/* ── Action Controls Bar ── */}
        <div className="voice-actions-row">
          {/* Settings */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettings?.();
            }}
            className="action-btn settings-btn"
            aria-label="Voice settings"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>

          {/* Stop Voice */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStop?.();
            }}
            className="action-btn stop-voice-btn"
            aria-label="Stop voice mode"
          >
            <PhoneOff size={14} />
            <span>Stop Voice</span>
          </button>
        </div>

        {/* ── Bottom Instructional Footer ── */}
        <div className="voice-footer-hint">
          <span>
            {voiceState?.pushToTalk
              ? 'Hold Spacebar to speak · Release to send'
              : 'Speak naturally — Xarwiz listens automatically. Say anything to interrupt.'}
          </span>
        </div>
      </div>

      <style jsx>{`
        /* ── Backdrop ── */
        .voice-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 7, 18, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 999;
          animation: overlayFadeIn 0.25s ease-out forwards;
        }

        /* ── Floating Dialog Panel ── */
        .voice-panel-dialog {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          width: min(430px, calc(100vw - 32px));
          background: radial-gradient(circle at 50% 20%, ${color}14 0%, rgba(15, 23, 42, 0.94) 55%, rgba(9, 14, 26, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 26px;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 24px 60px -12px rgba(0, 0, 0, 0.75),
            0 0 50px -10px ${color}20;
          padding: 18px 22px 18px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: panelSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          overflow: hidden;
          box-sizing: border-box;
        }

        .voice-ambient-glow {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 140px;
          background: ${color};
          opacity: 0.12;
          filter: blur(50px);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          transition: background 0.4s ease;
        }

        /* ── Header Bar ── */
        .voice-header-bar {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1;
          margin-bottom: 2px;
        }

        .voice-brand-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .live-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color};
          animation: dotGlow 2s infinite ease-in-out;
        }

        .voice-brand-text {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.07em;
          color: #e2e8f0;
          font-family: inherit;
        }

        .voice-mode-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: ${color};
          background: ${color}18;
          padding: 1.5px 7px;
          border-radius: 999px;
          border: 1px solid ${color}30;
        }

        .voice-close-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .voice-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        /* ── Orb Container ── */
        .voice-orb-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 4px 0 2px;
          z-index: 1;
        }

        .orb-backlight {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.2;
          filter: blur(32px);
          pointer-events: none;
          animation: orbBreath 3s ease-in-out infinite;
        }

        /* Audio activity wave bars */
        .voice-audio-bars {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 12px;
          margin-top: 6px;
        }

        .bar {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: ${color};
          opacity: 0.35;
          transition: all 0.18s ease;
        }

        .bar.active {
          opacity: 0.9;
        }

        .bar-1.active { animation: audioWave 0.8s ease-in-out infinite alternate; }
        .bar-2.active { animation: audioWave 0.6s ease-in-out infinite alternate 0.15s; }
        .bar-3.active { animation: audioWave 0.9s ease-in-out infinite alternate 0.3s; }
        .bar-4.active { animation: audioWave 0.7s ease-in-out infinite alternate 0.2s; }
        .bar-5.active { animation: audioWave 0.85s ease-in-out infinite alternate 0.1s; }

        @keyframes audioWave {
          0% { height: 3px; }
          100% { height: 12px; }
        }

        /* ── State Pill Badge ── */
        .voice-state-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: ${color}16;
          border: 1px solid ${color}40;
          color: ${color};
          box-shadow: 0 2px 10px ${color}15;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .state-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .state-text {
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #f1f5f9;
        }

        .icon-spin {
          animation: spin 1.2s linear infinite;
        }

        .icon-pulse {
          animation: voicePulse 1.4s ease-in-out infinite;
        }

        /* ── Live Transcript & Hint ── */
        .voice-live-transcript {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px 14px;
          width: 100%;
          text-align: center;
          box-sizing: border-box;
          z-index: 1;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .transcript-quotes {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13px;
          color: #f1f5f9;
          font-style: italic;
          line-height: 1.45;
          max-height: 54px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .transcript-icon {
          color: ${color};
          flex-shrink: 0;
        }

        .voice-hint-text {
          margin: 0;
          font-size: 12.5px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.4;
          min-height: 18px;
          z-index: 1;
          font-weight: 500;
        }

        /* ── History Panel ── */
        .voice-history-panel {
          width: 100%;
          max-height: 84px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.28);
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-sizing: border-box;
          z-index: 1;
        }

        .voice-history-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          line-height: 1.45;
        }

        .history-role-tag {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .role-user {
          color: #818cf8;
          background: rgba(99, 102, 241, 0.12);
        }

        .role-ai {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
        }

        .history-text {
          flex: 1;
          word-break: break-word;
          color: #cbd5e1;
        }

        /* ── Warning Alert ── */
        .voice-alert-warning {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          color: #fca5a5;
          text-align: center;
          width: 100%;
          z-index: 1;
          box-sizing: border-box;
        }

        /* ── Action Buttons ── */
        .voice-actions-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          margin-top: 4px;
          z-index: 1;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 20px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          font-family: inherit;
          white-space: nowrap;
        }

        .settings-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          font-weight: 500;
        }

        .settings-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .stop-voice-btn {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(220, 38, 38, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.38);
          color: #fca5a5;
          font-weight: 600;
          box-shadow: 0 2px 12px rgba(239, 68, 68, 0.15);
        }

        .stop-voice-btn:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(220, 38, 38, 0.25));
          border-color: rgba(239, 68, 68, 0.6);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
          transform: translateY(-1px);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        /* ── Footer Hint ── */
        .voice-footer-hint {
          z-index: 1;
          margin-top: 2px;
          text-align: center;
          padding: 5px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.4;
          max-width: 100%;
        }

        /* ── Keyframes ── */
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes panelSlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @keyframes dotGlow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(1.2);
          }
        }

        @keyframes orbBreath {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            transform: scale(1.15);
          }
        }

        @keyframes voicePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.12); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .voice-panel-dialog {
            bottom: 75px;
            width: calc(100vw - 24px);
            padding: 16px 16px 14px;
            border-radius: 22px;
          }
          .action-btn {
            padding: 8px 16px;
            font-size: 12.5px;
          }
        }
      `}</style>
    </>
  );
}
