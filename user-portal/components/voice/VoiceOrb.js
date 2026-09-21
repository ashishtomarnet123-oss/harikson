/**
 * VoiceOrb.js — Canvas-based animated voice orb
 *
 * Shows real-time microphone energy and FSM state through animated rings.
 *
 * States:
 *  listening/vad_detecting  → green/blue expanding rings driven by RMS
 *  processing               → slow indigo spinning gradient
 *  streaming                → faster indigo spin
 *  speaking                 → teal pulsing wave (AI speaking)
 *  interrupted              → amber flash
 *  error                    → red pulse
 *  idle                     → dim grey
 */

import { useRef, useEffect, useCallback } from 'react';

const STATE_CONFIG = {
  idle:                { base: '#334155', ring: '#475569', glow: 0 },
  listening:           { base: '#1e3a5f', ring: '#3b82f6', glow: 0.3 },
  vad_detecting:       { base: '#14432a', ring: '#10b981', glow: 0.7 },
  processing:          { base: '#2d1b69', ring: '#8b5cf6', glow: 0.5 },
  streaming:           { base: '#2d1b69', ring: '#6366f1', glow: 0.6 },
  speaking:            { base: '#0f3d3e', ring: '#06b6d4', glow: 0.8 },
  interrupted:         { base: '#451a03', ring: '#f59e0b', glow: 0.9 },
  error:               { base: '#450a0a', ring: '#ef4444', glow: 0.6 },
  permission_denied:   { base: '#450a0a', ring: '#ef4444', glow: 0.3 },
  unsupported_browser: { base: '#334155', ring: '#64748b', glow: 0 },
};

export default function VoiceOrb({ voiceState, audioRms = 0, size = 160, className = '' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);
  const pulseRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: W, height: H } = canvas;
    const cx = W / 2;
    const cy = H / 2;

    ctx.clearRect(0, 0, W, H);

    const state = voiceState || 'idle';
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;

    // Normalize RMS: 0 → 1 (raw RMS is typically 0–0.5 from AudioWorklet)
    const rms = Math.min(1, audioRms * 2.5);

    // Advance animation timers
    angleRef.current = (angleRef.current + (state === 'streaming' ? 3.5 : 1.8)) % 360;
    pulseRef.current = (pulseRef.current + 0.04) % (Math.PI * 2);

    // --- Outer ambient glow ---
    const glowRadius = (W / 2) * (0.65 + rms * 0.3 + Math.sin(pulseRef.current) * 0.05 * cfg.glow);
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius * 1.6);
    glowGrad.addColorStop(0, hexAlpha(cfg.ring, 0.18 * cfg.glow));
    glowGrad.addColorStop(1, hexAlpha(cfg.ring, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // --- Energy rings (driven by audioRms when user is speaking) ---
    if (state === 'vad_detecting' || state === 'listening') {
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const phase = (pulseRef.current + (i * Math.PI * 2) / ringCount) % (Math.PI * 2);
        const ringR = (W / 2) * (0.55 + rms * 0.35 + Math.sin(phase) * 0.08);
        const alpha = 0.15 + rms * 0.4 + Math.sin(phase) * 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(cfg.ring, Math.max(0, Math.min(1, alpha)));
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // --- Spinning gradient arc (processing / streaming) ---
    if (state === 'processing' || state === 'streaming') {
      const spinR = (W / 2) * 0.68;
      const startAngle = (angleRef.current * Math.PI) / 180;
      const arcLen = state === 'streaming' ? Math.PI * 1.5 : Math.PI;
      const spinGrad = ctx.createLinearGradient(
        cx + Math.cos(startAngle) * spinR,
        cy + Math.sin(startAngle) * spinR,
        cx + Math.cos(startAngle + arcLen) * spinR,
        cy + Math.sin(startAngle + arcLen) * spinR
      );
      spinGrad.addColorStop(0, hexAlpha(cfg.ring, 0));
      spinGrad.addColorStop(0.5, hexAlpha(cfg.ring, 0.9));
      spinGrad.addColorStop(1, hexAlpha(cfg.ring, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, spinR, startAngle, startAngle + arcLen);
      ctx.strokeStyle = spinGrad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // --- Speaking wave arc (teal flowing when AI speaks) ---
    if (state === 'speaking') {
      const waveR = (W / 2) * (0.66 + Math.sin(pulseRef.current * 2) * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(cfg.ring, 0.7 + Math.sin(pulseRef.current) * 0.2);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Second inner wave
      const wave2R = (W / 2) * (0.54 + Math.sin(pulseRef.current * 2 + 1) * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, wave2R, 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(cfg.ring, 0.3 + Math.sin(pulseRef.current + 1) * 0.15);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // --- Core circle ---
    const coreR = (W / 2) * (0.42 + rms * 0.06 * cfg.glow + Math.sin(pulseRef.current) * 0.015);
    const coreGrad = ctx.createRadialGradient(cx - coreR * 0.2, cy - coreR * 0.2, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, hexAlpha(cfg.ring, 0.55));
    coreGrad.addColorStop(1, hexAlpha(cfg.base, 0.95));
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // --- Core border ---
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(cfg.ring, 0.5 + rms * 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    animRef.current = requestAnimationFrame(draw);
  }, [voiceState, audioRms]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  return (
    <canvas
      ref={canvasRef}
      width={size * dpr}
      height={size * dpr}
      style={{
        width: size,
        height: size,
        display: 'block',
        borderRadius: '50%',
        ...(typeof window !== 'undefined' && { transform: `scale(${1 / dpr}) translate(-${(size * dpr - size) / 2}px, -${(size * dpr - size) / 2}px)` }),
      }}
      className={className}
      aria-hidden="true"
    />
  );
}

// Utility: convert hex color + alpha to rgba string
function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}
