import React from 'react';
import { Sliders, X } from 'lucide-react';

export default function VoiceSettingsPopover({
  showVoiceSettings,
  setShowVoiceSettings,
  voiceState,
  dispatchVoice,
  voiceDevices,
  echoGateEnabled,
  setEchoGateEnabled,
  voiceRate,
  setVoiceRate,
  voicePitch,
  setVoicePitch,
  vadThreshold,
  setVadThreshold,
  audioRms,
  chunkedSpeakerRef,
  vadControllerRef,
  apiBase,
}) {
  if (!showVoiceSettings) return null;

  return (
    <div
      className="voice-settings-popover"
      style={{
        position: 'absolute',
        bottom: '100%',
        right: '16px',
        marginBottom: '10px',
        width: '320px',
        background: 'var(--surface, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
        zIndex: 50,
        color: 'var(--text-primary, #f8fafc)',
        fontSize: '13px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sliders size={14} /> Voice Assistant Settings
        </span>
        <button
          type="button"
          onClick={() => setShowVoiceSettings(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Language Selection */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
          }}
        >
          Language (BCP-47)
        </label>
        <select
          value={voiceState.language}
          onChange={(e) => {
            const lang = e.target.value;
            dispatchVoice({ type: 'SET_LANGUAGE', language: lang });
            if (typeof window !== 'undefined')
              localStorage.setItem('hk_voice_lang', lang);
            fetch(`${apiBase}/api/v1/voice/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ language: lang }),
            }).catch(() => {});
          }}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border, #334155)',
            color: 'inherit',
          }}
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Spanish (Español)</option>
          <option value="fr-FR">French (Français)</option>
          <option value="de-DE">German (Deutsch)</option>
          <option value="hi-IN">Hindi (हिन्दी)</option>
          <option value="ja-JP">Japanese (日本語)</option>
          <option value="zh-CN">Chinese (中文)</option>
          <option value="pt-BR">Portuguese (Brasil)</option>
        </select>
      </div>

      {/* Microphone Input */}
      {voiceDevices.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '11px',
              color: 'var(--text-muted, #94a3b8)',
              textTransform: 'uppercase',
            }}
          >
            Microphone Device
          </label>
          <select
            value={voiceState.deviceId || ''}
            onChange={(e) => {
              const dev = e.target.value || null;
              dispatchVoice({ type: 'SET_DEVICE_ID', deviceId: dev });
              if (typeof window !== 'undefined') {
                if (dev) localStorage.setItem('hk_voice_device', dev);
                else localStorage.removeItem('hk_voice_device');
              }
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border, #334155)',
              color: 'inherit',
            }}
          >
            <option value="">Default Microphone</option>
            {voiceDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Push-to-Talk Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '8px 0',
          borderTop: '1px solid var(--border, #334155)',
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>Push-to-Talk</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
            Hold Spacebar to speak
          </div>
        </div>
        <input
          type="checkbox"
          checked={voiceState.pushToTalk}
          onChange={(e) => {
            const val = e.target.checked;
            dispatchVoice({ type: 'SET_PUSH_TO_TALK', pushToTalk: val });
            fetch(`${apiBase}/api/v1/voice/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                language: voiceState.language,
                pushToTalk: val,
                rate: voiceRate,
                pitch: voicePitch,
                vadThreshold,
                echoGateEnabled,
              }),
            }).catch(() => {});
          }}
        />
      </div>

      {/* Echo Gate Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '8px 0',
          borderTop: '1px solid var(--border, #334155)',
        }}
      >
        <div>
          <div style={{ fontWeight: 500 }}>Echo Gate</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
            Filter speaker bleed during AI speech
          </div>
        </div>
        <input
          type="checkbox"
          checked={echoGateEnabled}
          onChange={(e) => {
            const val = e.target.checked;
            setEchoGateEnabled(val);
            fetch(`${apiBase}/api/v1/voice/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                language: voiceState.language,
                pushToTalk: voiceState.pushToTalk,
                rate: voiceRate,
                pitch: voicePitch,
                vadThreshold,
                echoGateEnabled: val,
              }),
            }).catch(() => {});
          }}
        />
      </div>

      {/* Speech Rate Slider */}
      <div
        style={{
          marginBottom: '12px',
          borderTop: '1px solid var(--border, #334155)',
          paddingTop: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
          }}
        >
          <span>Speech Rate</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>
            {voiceRate.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={voiceRate}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setVoiceRate(val);
            chunkedSpeakerRef.current?.setOptions({
              rate: val,
              pitch: voicePitch,
            });
          }}
          onMouseUp={(e) => {
            const val = parseFloat(e.target.value);
            fetch(`${apiBase}/api/v1/voice/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                language: voiceState.language,
                pushToTalk: voiceState.pushToTalk,
                rate: val,
                pitch: voicePitch,
                vadThreshold,
                echoGateEnabled,
              }),
            }).catch(() => {});
          }}
          style={{ width: '100%', accentColor: '#6366f1' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#475569',
          }}
        >
          <span>0.5x Slow</span>
          <span>1.0x Normal</span>
          <span>2.0x Fast</span>
        </div>
      </div>

      {/* Pitch Slider */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
          }}
        >
          <span>Voice Pitch</span>
          <span style={{ color: '#06b6d4', fontWeight: 600 }}>
            {voicePitch.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={voicePitch}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setVoicePitch(val);
            chunkedSpeakerRef.current?.setOptions({
              rate: voiceRate,
              pitch: val,
            });
          }}
          onMouseUp={(e) => {
            const val = parseFloat(e.target.value);
            fetch(`${apiBase}/api/v1/voice/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                language: voiceState.language,
                pushToTalk: voiceState.pushToTalk,
                rate: voiceRate,
                pitch: val,
                vadThreshold,
                echoGateEnabled,
              }),
            }).catch(() => {});
          }}
          style={{ width: '100%', accentColor: '#06b6d4' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#475569',
          }}
        >
          <span>0.5 Low</span>
          <span>1.0 Normal</span>
          <span>2.0 High</span>
        </div>
      </div>

      {/* VAD Sensitivity Slider */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)',
            textTransform: 'uppercase',
          }}
        >
          <span>Mic Sensitivity</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>
            {vadThreshold} dBFS
          </span>
        </div>
        <input
          type="range"
          min="-55"
          max="-28"
          step="1"
          value={vadThreshold}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setVadThreshold(val);
            if (vadControllerRef.current?.options) {
              vadControllerRef.current.options.silenceThresholdDb = val;
            }
          }}
          onMouseUp={(e) => {
            const val = parseInt(e.target.value, 10);
            fetch(`${apiBase}/api/v1/voice/settings`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                language: voiceState.language,
                pushToTalk: voiceState.pushToTalk,
                rate: voiceRate,
                pitch: voicePitch,
                vadThreshold: val,
                echoGateEnabled,
              }),
            }).catch(() => {});
          }}
          style={{ width: '100%', accentColor: '#10b981' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#475569',
          }}
        >
          <span>-55 Very sensitive</span>
          <span>-28 Less sensitive</span>
        </div>
      </div>

      {/* Live VAD Audio Energy Meter */}
      <div
        style={{
          borderTop: '1px solid var(--border, #334155)',
          paddingTop: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted, #94a3b8)',
            marginBottom: '4px',
          }}
        >
          <span>Live Voice Energy (VAD)</span>
          <span>{Math.round(audioRms * 100)}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, audioRms * 300)}%`,
              height: '100%',
              background: audioRms > 0.12 ? '#10b981' : '#6366f1',
              transition: 'width 60ms ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
}

