/**
 * VoiceModeOverlay.js — Compact, luminous voice popover anchored near the mic button
 *
 * Designed as an unobtrusive, state-of-the-art voice capsule positioned
 * directly above the composer mic button, featuring real-time VoiceOrb animation,
 * live audio equalizer waves, live transcription preview, and instant controls.
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
  listening:           { text: 'Listening…',    hint: 'Speak naturally — listening…',               icon: Mic },
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
  const state = voiceState?.state || 'idle';
  const transcript = voiceState?.transcript || '';
  const cfg = STATE_LABELS[state] || STATE_LABELS.idle;
  const color = STATE_COLORS[state] || '#64748b';

  if (!isVisible) return null;

  const IconComp = cfg.icon;
  const isAudioActive = state === 'vad_detecting' || state === 'speaking' || audioRms > 0.03;

  return (
    <div
      role="dialog"
      aria-label="Voice Mode"
      aria-live="polite"
      className="voice-popover-card"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Downward pointer caret pointing directly to the mic button */}
      <div className="popover-caret" />

      {/* Ambient Top Glow Layer */}
      <div className="popover-ambient-glow" />

      {/* ── Top Header Row ── */}
      <div className="popover-header">
        <div className="popover-brand">
          <span className="live-dot" />
          <span className="brand-title">XARWIZ VOICE</span>
          <span className="mode-badge">
            {voiceState?.pushToTalk ? (
              <>
                <Radio size={9.5} />
                <span>PTT</span>
              </>
            ) : (
              <>
                <Sparkles size={9.5} />
                <span>Live</span>
              </>
            )}
          </span>
        </div>

        <div className="popover-header-actions">
          <button
            type="button"
            className="icon-action-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSettings?.();
            }}
            title="Voice Settings"
            aria-label="Voice Settings"
          >
            <Settings size={13} />
          </button>
          <button
            type="button"
            className="icon-action-btn close-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStop?.();
            }}
            title="Stop Voice"
            aria-label="Stop Voice"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Center Stage: Compact Luminous Orb & Audio Waves ── */}
      <div className="popover-center-stage">
        <div className="orb-wrapper">
          <div className="orb-glow-backlight" />
          <VoiceOrb voiceState={state} audioRms={audioRms} size={76} />
        </div>

        <div className="popover-state-info">
          {/* State Pill Badge */}
          <div className="state-badge">
            {IconComp && (
              <IconComp
                size={12.5}
                className={`state-icon ${
                  state === 'processing' || state === 'streaming'
                    ? 'icon-spin'
                    : state === 'speaking'
                    ? 'icon-pulse'
                    : ''
                }`}
              />
            )}
            <span className="state-badge-text">{cfg.text}</span>
          </div>

          {/* Micro Audio Equalizer Waves */}
          <div className="mini-audio-bars">
            <span className={`bar b1 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar b2 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar b3 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar b4 ${isAudioActive ? 'active' : ''}`} />
            <span className={`bar b5 ${isAudioActive ? 'active' : ''}`} />
          </div>
        </div>
      </div>

      {/* ── Live Transcript or Context Hint ── */}
      <div className="popover-transcript-container">
        {transcript ? (
          <div className="transcript-box" title={transcript}>
            <AudioWaveform size={12} className="transcript-wave-icon" />
            <span className="transcript-text">"{transcript}"</span>
          </div>
        ) : (
          <p className="popover-hint-text">{cfg.hint}</p>
        )}
      </div>

      {/* ── Browser Alert (if unsupported) ── */}
      {state === 'unsupported_browser' && (
        <div className="popover-warning-alert">
          Voice requires Chrome or Edge browser.
        </div>
      )}

      {/* ── Footer Bar: Quick stop & guidance ── */}
      <div className="popover-footer">
        <span className="footer-guidance">
          {voiceState?.pushToTalk ? 'Hold Space to talk' : 'Interrupt anytime'}
        </span>
        <button
          type="button"
          className="stop-voice-pill"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStop?.();
          }}
          title="End voice session"
        >
          <PhoneOff size={11} />
          <span>Stop</span>
        </button>
      </div>

      <style jsx>{`
        /* ── Popover Capsule Container ── */
        .voice-popover-card {
          position: absolute;
          bottom: calc(100% + 12px);
          right: 0;
          width: 300px;
          max-width: calc(100vw - 28px);
          background: radial-gradient(circle at 75% 15%, ${color}1e 0%, rgba(15, 23, 42, 0.96) 60%, rgba(9, 14, 26, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-top: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 20px;
          box-shadow:
            0 16px 40px -8px rgba(0, 0, 0, 0.65),
            0 0 35px -8px ${color}28,
            0 0 0 1px rgba(255, 255, 255, 0.04);
          padding: 12px 14px 10px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 9px;
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          animation: popoverFadeSlide 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-sizing: border-box;
          user-select: none;
        }

        /* Downward triangle caret pointing directly down to mic button */
        .popover-caret {
          position: absolute;
          bottom: -6px;
          right: 60px;
          width: 11px;
          height: 11px;
          background: rgba(10, 15, 28, 0.98);
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          transform: rotate(45deg);
          pointer-events: none;
        }

        .popover-ambient-glow {
          position: absolute;
          top: -20px;
          right: 30px;
          width: 140px;
          height: 80px;
          background: ${color};
          opacity: 0.15;
          filter: blur(36px);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          transition: background 0.4s ease;
        }

        /* ── Header ── */
        .popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          z-index: 1;
        }

        .popover-brand {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .live-dot {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color};
          animation: dotPulse 2s infinite ease-in-out;
        }

        .brand-title {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #e2e8f0;
          font-family: inherit;
        }

        .mode-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          font-weight: 600;
          color: ${color};
          background: ${color}16;
          border: 1px solid ${color}30;
          padding: 1px 5px;
          border-radius: 999px;
        }

        .popover-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-action-btn {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
          padding: 0;
        }

        .icon-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.18);
        }

        .close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.35);
        }

        /* ── Center Stage ── */
        .popover-center-stage {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          z-index: 1;
        }

        .orb-wrapper {
          position: relative;
          width: 76px;
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .orb-glow-backlight {
          position: absolute;
          width: 65px;
          height: 65px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.25;
          filter: blur(18px);
          pointer-events: none;
        }

        .popover-state-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }

        .state-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3.5px 10px;
          border-radius: 999px;
          background: ${color}16;
          border: 1px solid ${color}40;
          color: ${color};
          width: fit-content;
        }

        .state-badge-text {
          font-size: 12px;
          font-weight: 600;
          color: #f1f5f9;
          white-space: nowrap;
        }

        /* Mini audio waves */
        .mini-audio-bars {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 12px;
          padding-left: 2px;
        }

        .bar {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: ${color};
          opacity: 0.3;
          transition: all 0.16s ease;
        }

        .bar.active {
          opacity: 0.95;
        }

        .b1.active { animation: barWave 0.7s ease-in-out infinite alternate; }
        .b2.active { animation: barWave 0.5s ease-in-out infinite alternate 0.1s; }
        .b3.active { animation: barWave 0.8s ease-in-out infinite alternate 0.25s; }
        .b4.active { animation: barWave 0.6s ease-in-out infinite alternate 0.15s; }
        .b5.active { animation: barWave 0.75s ease-in-out infinite alternate 0.05s; }

        @keyframes barWave {
          0% { height: 3px; }
          100% { height: 12px; }
        }

        /* ── Transcript Box ── */
        .popover-transcript-container {
          z-index: 1;
          min-height: 28px;
          display: flex;
          align-items: center;
        }

        .transcript-box {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          padding: 5px 9px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-sizing: border-box;
        }

        .transcript-wave-icon {
          color: ${color};
          flex-shrink: 0;
        }

        .transcript-text {
          font-size: 11.5px;
          color: #f1f5f9;
          font-style: italic;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .popover-hint-text {
          margin: 0;
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.35;
          padding: 0 4px;
        }

        .popover-warning-alert {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 7px;
          padding: 4px 8px;
          font-size: 11px;
          color: #fca5a5;
          text-align: center;
          z-index: 1;
        }

        /* ── Footer ── */
        .popover-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          z-index: 1;
        }

        .footer-guidance {
          font-size: 10.5px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .stop-voice-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.32);
          color: #fca5a5;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .stop-voice-pill:hover {
          background: rgba(239, 68, 68, 0.28);
          border-color: rgba(239, 68, 68, 0.55);
          color: #ffffff;
          transform: translateY(-1px);
        }

        /* ── Keyframes ── */
        @keyframes popoverFadeSlide {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .icon-spin {
          animation: spin 1.2s linear infinite;
        }

        .icon-pulse {
          animation: pulse 1.4s ease-in-out infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.15); }
        }

        @media (max-width: 480px) {
          .voice-popover-card {
            width: calc(100vw - 24px);
            right: -6px;
          }
          .popover-caret {
            right: 48px;
          }
        }
      `}</style>
    </div>
  );
}
