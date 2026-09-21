/**
 * VoiceOrb.js — High-performance Canvas-based animated voice orb
 *
 * Shows real-time microphone energy and FSM state through animated rings and glowing core.
 * Uses high-DPI ctx.scale(dpr, dpr) for crystal-clear Retina rendering.
 *
 * States:
 *  listening/vad_detecting  → emerald/blue expanding energy rings driven by RMS
 *  processing               → slow violet/indigo spinning orbital ring
 *  streaming                → fast electric indigo/violet spinning dual halo
 *  speaking                 → luminous cyan/teal pulsing soundwave
 *  interrupted              → amber flash
 *  error                    → crimson pulse
 *  idle                     → sleek dark slate
 */

import { useRef, useEffect, useCallback } from 'react';

const STATE_CONFIG = {
  idle:                { base: '#1e293b', ring: '#64748b', glow: 0.25, highlight: '#94a3b8' },
  listening:           { base: '#0c2744', ring: '#3b82f6', glow: 0.65, highlight: '#93c5fd' },
  vad_detecting:       { base: '#064e3b', ring: '#10b981', glow: 0.85, highlight: '#6ee7b7' },
  processing:          { base: '#3b1261', ring: '#a855f7', glow: 0.75, highlight: '#d8b4fe' },
  streaming:           { base: '#2b1464', ring: '#818cf8', glow: 0.85, highlight: '#c7d2fe' },
  speaking:            { base: '#083344', ring: '#06b6d4', glow: 0.90, highlight: '#67e8f9' },
  interrupted:         { base: '#451a03', ring: '#f59e0b', glow: 0.90, highlight: '#fde68a' },
  error:               { base: '#450a0a', ring: '#ef4444', glow: 0.70, highlight: '#fca5a5' },
  permission_denied:   { base: '#450a0a', ring: '#ef4444', glow: 0.40, highlight: '#fca5a5' },
  unsupported_browser: { base: '#1e293b', ring: '#64748b', glow: 0.25, highlight: '#94a3b8' },
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
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply DPR scale so all drawing uses CSS pixel coordinates (0 to size)
    ctx.scale(dpr, dpr);

    const W = size;
    const H = size;
    const cx = W / 2;
    const cy = H / 2;

    const state = voiceState || 'idle';
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;

    // Normalize RMS: 0 → 1
    const rms = Math.min(1, audioRms * 2.8);

    // Advance animation timers
    angleRef.current = (angleRef.current + (state === 'streaming' ? 4.0 : state === 'processing' ? 2.2 : 1.5)) % 360;
    pulseRef.current = (pulseRef.current + 0.045) % (Math.PI * 2);

    ctx.save();

    // ── 1. Outer ambient aura / glow ─────────────────────────────────────
    const auraPulse = Math.sin(pulseRef.current) * 0.06 * cfg.glow;
    const auraRadius = cx * (0.68 + rms * 0.25 + auraPulse);
    const auraGrad = ctx.createRadialGradient(cx, cy, cx * 0.2, cx, cy, auraRadius);
    auraGrad.addColorStop(0, hexAlpha(cfg.ring, 0.35 * cfg.glow));
    auraGrad.addColorStop(0.6, hexAlpha(cfg.ring, 0.12 * cfg.glow));
    auraGrad.addColorStop(1, hexAlpha(cfg.ring, 0));
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // ── 2. Energy ripples (listening / vad_detecting) ────────────────────
    if (state === 'vad_detecting' || state === 'listening') {
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const phase = (pulseRef.current + (i * Math.PI * 2) / ringCount) % (Math.PI * 2);
        const ringR = cx * (0.50 + rms * 0.38 + Math.sin(phase) * 0.08);
        const alpha = 0.2 + rms * 0.5 + Math.sin(phase) * 0.1;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(cfg.ring, Math.max(0, Math.min(1, alpha)));
        ctx.lineWidth = 1.8;
        ctx.shadowColor = cfg.ring;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // ── 3. Spinning orbital halo (processing / streaming) ────────────────
    if (state === 'processing' || state === 'streaming') {
      const spinR = cx * 0.68;
      const startAngle = (angleRef.current * Math.PI) / 180;
      const arcLen = state === 'streaming' ? Math.PI * 1.5 : Math.PI * 1.2;

      const p1x = cx + Math.cos(startAngle) * spinR;
      const p1y = cy + Math.sin(startAngle) * spinR;
      const p2x = cx + Math.cos(startAngle + arcLen) * spinR;
      const p2y = cy + Math.sin(startAngle + arcLen) * spinR;

      const spinGrad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
      spinGrad.addColorStop(0, hexAlpha(cfg.ring, 0));
      spinGrad.addColorStop(0.5, hexAlpha(cfg.highlight, 0.95));
      spinGrad.addColorStop(1, hexAlpha(cfg.ring, 0));

      ctx.beginPath();
      ctx.arc(cx, cy, spinR, startAngle, startAngle + arcLen);
      ctx.strokeStyle = spinGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = cfg.ring;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Subtle counter-spinning inner arc for dimensional depth
      const innerAngle = ((-angleRef.current * 0.7) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, spinR * 0.85, innerAngle, innerAngle + Math.PI * 0.8);
      ctx.strokeStyle = hexAlpha(cfg.ring, 0.4);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // ── 4. Speaking soundwave ripples (AI speaking) ──────────────────────
    if (state === 'speaking') {
      const wave1R = cx * (0.68 + Math.sin(pulseRef.current * 2) * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy, wave1R, 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(cfg.ring, 0.75 + Math.sin(pulseRef.current * 2) * 0.2);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = cfg.ring;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const wave2R = cx * (0.54 + Math.sin(pulseRef.current * 2 + 1.2) * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, wave2R, 0, Math.PI * 2);
      ctx.strokeStyle = hexAlpha(cfg.highlight, 0.45 + Math.sin(pulseRef.current * 2 + 1.2) * 0.15);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── 5. 3D Core Sphere with specular light ────────────────────────────
    const corePulse = Math.sin(pulseRef.current) * 0.02 * cfg.glow;
    const coreR = cx * (0.34 + rms * 0.06 * cfg.glow + corePulse);

    // Specular light source offset toward top-left
    const lightX = cx - coreR * 0.28;
    const lightY = cy - coreR * 0.28;

    const coreGrad = ctx.createRadialGradient(lightX, lightY, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, hexAlpha(cfg.highlight, 0.95));
    coreGrad.addColorStop(0.35, hexAlpha(cfg.ring, 0.9));
    coreGrad.addColorStop(0.85, hexAlpha(cfg.base, 0.98));
    coreGrad.addColorStop(1, hexAlpha(cfg.base, 1));

    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = cfg.ring;
    ctx.shadowBlur = 16 * cfg.glow;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core border / rim glow
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(cfg.highlight, 0.5 + rms * 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [voiceState, audioRms, size]);

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
        width: `${size}px`,
        height: `${size}px`,
        display: 'block',
      }}
      className={className}
      aria-hidden="true"
    />
  );
}

// Utility: convert hex color + alpha to rgba string
function hexAlpha(hex, alpha) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
