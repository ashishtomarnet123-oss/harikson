/**
 * ITextToSpeechProvider.js
 * Contract and base definition for TTS providers.
 */

export class BaseTTSProvider {
  isSupported() {
    return false;
  }

  speak(text, options, callbacks) {
    throw new Error('Not implemented');
  }

  cancel() {
    throw new Error('Not implemented');
  }

  isSpeaking() {
    return false;
  }
}
