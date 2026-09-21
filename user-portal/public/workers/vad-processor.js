/**
 * vad-processor.js — AudioWorklet for Real-Time Energy & VAD Calculation
 *
 * Runs on the audio rendering thread. Computes RMS energy and dB over ~30ms
 * frames. Posts frame metrics back to the main thread via message port.
 */

class VADProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // 30ms frame at the current sample rate (e.g., 44.1k or 48k)
    this.frameSize = Math.round(sampleRate * 0.03);
    this.buffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const len = channelData.length;

    for (let i = 0; i < len; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      if (this.bufferIndex >= this.frameSize) {
        // Calculate RMS (Root Mean Square) energy
        let sum = 0;
        for (let j = 0; j < this.frameSize; j++) {
          const sample = this.buffer[j];
          sum += sample * sample;
        }

        const rms = Math.sqrt(sum / this.frameSize);
        // Convert to decibels relative to full scale (dBFS), clamped to -100 dB minimum
        const db = 20 * Math.log10(Math.max(rms, 1e-5));

        this.port.postMessage({
          type: 'frame',
          rms,
          db,
          timestamp: currentTime,
        });

        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);
