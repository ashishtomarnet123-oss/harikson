/**
 * WhisperSTTProvider.js
 *
 * Stub for future server-side Whisper STT (e.g. Firefox/Safari fallback).
 * Adheres to ISpeechToTextProvider contract.
 */

export class WhisperSTTProvider {
  constructor(endpoint = null) {
    this.endpoint = endpoint;
    this.isActive = false;
    this.mediaRecorder = null;
  }

  isSupported() {
    return !!this.endpoint && typeof window !== 'undefined' && !!navigator?.mediaDevices?.getUserMedia;
  }

  start(callbacks, language = 'en-US', deviceId = null) {
    if (!this.isSupported()) {
      callbacks?.onError?.('Whisper STT endpoint not configured');
      return;
    }
    this.isActive = true;
    callbacks?.onStart?.();
    console.debug('[WhisperSTTProvider] Started listening stub');
  }

  stop() {
    this.isActive = false;
    console.debug('[WhisperSTTProvider] Stopped');
  }

  abort() {
    this.isActive = false;
    console.debug('[WhisperSTTProvider] Aborted');
  }
}
