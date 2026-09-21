/**
 * vad-controller.js — Main-thread Voice Activity Detector (VAD) & Echo Gate
 *
 * Runs an AudioWorklet (with AnalyserNode fallback) to measure microphone energy.
 * Detects speech start and speech end events with adaptive hangover timing.
 *
 * ADAPTIVE ENDPOINTING:
 * Hangover time is dynamically adjusted based on the partial transcript.
 * - Short/incomplete phrases:  ~800–900ms (wait for more)
 * - Complete sentence (. ! ?): ~400–500ms (commit quickly)
 * - Normal speech:             ~600ms default
 * This mimics the "erase and rethink" behavior of GPT-4o Voice.
 *
 * DUAL-CAPTURE DESIGN NOTE:
 * Web Speech API's SpeechRecognition manages its own internal audio stream and
 * cannot receive Web Audio API node connections. Therefore, VADController captures
 * an independent MediaStream with hardware echo cancellation and noise suppression.
 *
 * ECHO GATE:
 * When the AI is actively speaking (TTS), the energy threshold is raised to
 * echoGateThresholdDb. Any speech exceeding this threshold triggers an immediate
 * Barge-In event.
 *
 * PERSISTENT SESSION:
 * Use suspend()/resume() instead of stop()/start() between turns to avoid
 * tearing down the AudioContext and MediaStream (saves ~150–300ms per turn).
 */

export class VADController {
  constructor(options = {}) {
    this.options = {
      silenceThresholdDb: -42,        // Speech detection threshold in dBFS
      echoGateThresholdDb: -26,       // Elevated threshold during TTS playback
      speechHangoverMs: 600,          // Default hangover — overridden adaptively
      minSpeechDurationMs: 120,       // Minimum speech duration to discard mouth clicks/pops
      deviceId: null,
      ...options,
    };

    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.analyserNode = null;
    this.isListening = false;
    this.isSpeaking = false;          // Local user speech state
    this.isEchoGated = false;         // True when AI TTS is speaking
    this.isSuspended = false;         // True when VAD is suspended (between turns)
    this.speechStartTime = 0;
    this.silenceTimer = null;
    this.callbacks = {
      onSpeechStart: null,
      onSpeechEnd: null,
      onRms: null,
      onBargeIn: null,
      onError: null,
    };
  }

  setCallbacks(cbs) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  setEchoGated(gated) {
    this.isEchoGated = !!gated;
  }

  /**
   * Set hangover directly (e.g. from settings slider).
   */
  setHangoverMs(ms) {
    this.options.speechHangoverMs = Math.max(300, Math.min(2500, ms));
  }

  /**
   * Compute adaptive hangover from a partial transcript.
   * Called on every STT_PARTIAL event from chat.js.
   *
   * Logic:
   *  - Ends with ? or !                → 400ms  (definite question/exclamation)
   *  - Ends with period + whitespace   → 500ms  (sentence complete)
   *  - Ends with trailing filler word  → 900ms  (likely mid-thought)
   *  - Very short (<3 words)           → 800ms  (wait for more content)
   *  - Default                         → 600ms
   */
  adaptiveHangoverMs(partialTranscript = '') {
    const t = (partialTranscript || '').trim();
    if (!t) return 600;

    // Definite end of utterance markers
    if (/[?!]\s*$/.test(t)) return 400;
    if (/[.]\s*$/.test(t)) return 500;

    // Trailing incomplete words — user is still formulating
    const INCOMPLETE_ENDINGS = /\b(and|or|the|in|is|are|was|were|to|of|a|an|with|for|on|at|by|from|but|so|if|that|this|which|who|what|when|where|how|i|we|they|he|she|it)\s*$/i;
    if (INCOMPLETE_ENDINGS.test(t)) return 900;

    // Very short response — wait longer
    const wordCount = t.split(/\s+/).filter(Boolean).length;
    if (wordCount < 3) return 800;

    // Ends mid-word (no space at end, trailing letters without punctuation)
    if (/[a-zA-Z]$/.test(t) && wordCount < 5) return 700;

    return 600; // default
  }

  /**
   * Suspend VAD between AI speaking turns — keeps AudioContext + MediaStream alive.
   * Much faster than stop()/start() (saves ~150–300ms re-init per turn).
   */
  suspend() {
    if (this.isSuspended) return;
    this.isSuspended = true;
    this.isListening = false;
    this.isSpeaking = false;
    // Clear any pending silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    // Suspend AudioContext without closing it
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().catch(() => {});
    }
    console.debug('[VADController] ⏸ Suspended (turn boundary)');
  }

  /**
   * Resume VAD after AI finishes speaking.
   * Reuses existing AudioContext + MediaStream — no hardware re-init needed.
   */
  resume() {
    if (!this.isSuspended && this.isListening) return;
    this.isSuspended = false;
    this.isListening = true;
    this.isSpeaking = false;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    // Restart analyser loop if using fallback (AudioWorklet resumes automatically)
    if (this.analyserNode && !this.workletNode) {
      this.startAnalyserLoop();
    }
    console.debug('[VADController] ▶ Resumed (next turn)');
  }

  async start(deviceId = null) {
    // If already initialized but suspended, just resume
    if (this.audioContext && this.isSuspended) {
      this.resume();
      return;
    }

    this.stop();

    if (deviceId) {
      this.options.deviceId = deviceId;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError?.('getUserMedia is not supported in this browser');
      return;
    }

    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (this.options.deviceId) {
        audioConstraints.deviceId = { exact: this.options.deviceId };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Attempt to load AudioWorklet
      let workletLoaded = false;
      if (this.audioContext.audioWorklet) {
        try {
          await this.audioContext.audioWorklet.addModule('/workers/vad-processor.js');
          this.workletNode = new AudioWorkletNode(this.audioContext, 'vad-processor');
          this.workletNode.port.onmessage = (event) => {
            if (event.data?.type === 'frame') {
              this.handleFrame(event.data.rms, event.data.db);
            }
          };
          source.connect(this.workletNode);
          workletLoaded = true;
        } catch (workletErr) {
          console.warn('[VADController] AudioWorklet failed to load, falling back to AnalyserNode:', workletErr);
        }
      }

      if (!workletLoaded) {
        // Fallback: AnalyserNode polling
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 1024;
        source.connect(this.analyserNode);
        this.startAnalyserLoop();
      }

      this.isListening = true;
      this.isSuspended = false;
    } catch (err) {
      console.error('[VADController] Failed to initialize microphone audio context:', err);
      this.callbacks.onError?.(err.name === 'NotAllowedError' ? 'permission_denied' : err.message);
    }
  }

  startAnalyserLoop() {
    const buffer = new Float32Array(this.analyserNode.fftSize);
    const loop = () => {
      if (!this.isListening || !this.analyserNode) return;
      this.analyserNode.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      const db = 20 * Math.log10(Math.max(rms, 1e-5));
      this.handleFrame(rms, db);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  handleFrame(rms, db) {
    if (!this.isListening || this.isSuspended) return;

    // Send RMS frame to UI visualizer (orb/waveform)
    this.callbacks.onRms?.(rms, db);

    const threshold = this.isEchoGated
      ? this.options.echoGateThresholdDb
      : this.options.silenceThresholdDb;

    const isAboveThreshold = db > threshold;

    if (isAboveThreshold) {
      if (this.isEchoGated) {
        // Human voice barging in over TTS speaker output
        console.debug(`[VADController] 📢 Barge-In detected at ${db.toFixed(1)} dB (gate: ${threshold} dB)`);
        this.callbacks.onBargeIn?.();
        return;
      }

      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = Date.now();
        this.callbacks.onSpeechStart?.();
      }
    } else {
      // Below threshold
      if (this.isSpeaking && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          const duration = Date.now() - this.speechStartTime;
          this.isSpeaking = false;
          this.silenceTimer = null;

          if (duration >= this.options.minSpeechDurationMs) {
            console.debug(`[VADController] 🔇 Speech ended after ${duration}ms (hangover: ${this.options.speechHangoverMs}ms)`);
            this.callbacks.onSpeechEnd?.();
          }
        }, this.options.speechHangoverMs);
      }
    }
  }

  stop() {
    this.isListening = false;
    this.isSpeaking = false;
    this.isEchoGated = false;
    this.isSuspended = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.workletNode) {
      try { this.workletNode.disconnect(); } catch (e) {}
      this.workletNode = null;
    }

    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch (e) {}
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      try { this.mediaStream.getTracks().forEach((track) => track.stop()); } catch (e) {}
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
  }
}
