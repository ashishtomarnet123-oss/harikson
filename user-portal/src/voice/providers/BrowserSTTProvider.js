/**
 * BrowserSTTProvider.js
 *
 * Implements ISpeechToTextProvider using the browser's Web Speech API
 * (SpeechRecognition / webkitSpeechRecognition).
 */

export class BrowserSTTProvider {
  constructor(customSpeechRecognition = null) {
    this.customSpeechRecognition = customSpeechRecognition;
    this.recognition = null;
    this.isActive = false;
    this.callbacks = null;
    this.language = 'en-US';
  }

  isSupported() {
    if (this.customSpeechRecognition) return true;
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  start(callbacks, language = 'en-US', deviceId = null) {
    if (!this.isSupported()) {
      callbacks?.onError?.('unsupported_browser');
      return;
    }

    this.stop(); // Clean up any active session

    const SpeechRecognition =
      this.customSpeechRecognition ||
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = language || 'en-US';
      this.callbacks = callbacks;
      this.language = language;
      this.isActive = true;

      this.recognition.onstart = () => {
        this.callbacks?.onStart?.();
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            currentFinal += trans;
          } else {
            interimTranscript += trans;
          }
        }

        if (interimTranscript) {
          this.callbacks?.onPartial?.(interimTranscript);
        }

        if (currentFinal) {
          this.callbacks?.onFinal?.(currentFinal);
        }
      };

      this.recognition.onerror = (event) => {
        const error = event.error;
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          this.callbacks?.onError?.('permission_denied');
        } else if (error !== 'no-speech' && error !== 'aborted') {
          this.callbacks?.onError?.(error);
        }
      };

      this.recognition.onend = () => {
        const wasActive = this.isActive;
        this.isActive = false;
        this.callbacks?.onEnd?.(wasActive);
      };

      this.recognition.start();
    } catch (err) {
      this.isActive = false;
      callbacks?.onError?.(err.message || 'Failed to start speech recognition');
    }
  }

  stop() {
    this.isActive = false;
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.stop();
      } catch (e) {
        // Ignore errors during stop
      }
      this.recognition = null;
    }
  }

  abort() {
    this.isActive = false;
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // Ignore
      }
      this.recognition = null;
    }
  }
}
