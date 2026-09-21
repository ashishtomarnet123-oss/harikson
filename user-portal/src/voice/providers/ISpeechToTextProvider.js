/**
 * ISpeechToTextProvider.js
 * Contract and base definition for STT providers.
 */

export class BaseSTTProvider {
  isSupported() {
    return false;
  }

  start(callbacks, language, deviceId) {
    throw new Error('Not implemented');
  }

  stop() {
    throw new Error('Not implemented');
  }

  abort() {
    throw new Error('Not implemented');
  }
}
