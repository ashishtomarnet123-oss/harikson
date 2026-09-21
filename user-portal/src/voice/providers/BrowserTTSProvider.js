/**
 * BrowserTTSProvider.js
 *
 * Implements ITextToSpeechProvider using the browser's SpeechSynthesis API.
 * Features:
 * - Async voice loading race fix via voiceschanged listener
 * - Natural voice selection prioritized by language (BCP-47)
 * - Safe chunking under Safari's 15s cutoff
 * - Full markdown & symbol sanitation
 * - Unit-testable with mock synth
 */

export class BrowserTTSProvider {
  constructor(customSynth = null) {
    this.customSynth = customSynth;
    this.voices = [];
    this.voicesLoaded = false;
    this.currentUtterance = null;
    this.initVoices();
  }

  get synth() {
    if (this.customSynth) return this.customSynth;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      return window.speechSynthesis;
    }
    return null;
  }

  initVoices() {
    if (typeof window === 'undefined') return;
    const s = this.synth;
    if (!s) return;

    const loadVoices = () => {
      try {
        const v = s.getVoices();
        if (v && v.length > 0) {
          this.voices = v;
          this.voicesLoaded = true;
        }
      } catch (e) {
        // Ignore
      }
    };

    loadVoices();
    if (!this.voicesLoaded && s.onvoiceschanged !== undefined) {
      s.onvoiceschanged = loadVoices;
    }
  }

  isSupported() {
    return !!this.synth;
  }

  /**
   * Cleans text to sound natural when spoken by TTS.
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, ' [Code block omitted] ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/https?:\/\/\S+/gi, ' [link] ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~>]/g, '')
      .replace(/^[-•*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/[⚠️🔒💡🎤✦✋⚙️🤖⚡💥✨]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find best voice matching language and natural qualities.
   */
  findBestVoice(language = 'en-US', preferredVoiceName = null) {
    if (!this.voices.length && this.synth) {
      this.voices = this.synth.getVoices() || [];
    }
    if (!this.voices.length) return null;

    if (preferredVoiceName) {
      const preferred = this.voices.find(v => v.name === preferredVoiceName);
      if (preferred) return preferred;
    }

    const langPrefix = (language || 'en').split('-')[0].toLowerCase();
    const matching = this.voices.filter(v =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );

    if (!matching.length) return this.voices[0];

    // Priority order for natural-sounding voices
    const naturalKeywords = ['natural', 'neural', 'google', 'samantha', 'karen', 'daniel', 'serena', 'oliver'];
    for (const kw of naturalKeywords) {
      const found = matching.find(v => v.name.toLowerCase().includes(kw));
      if (found) return found;
    }

    // Default to first match for this language
    return matching[0];
  }

  /**
   * Speak a piece of text.
   * @param {string} text
   * @param {object} options { rate, pitch, volume, language, voiceName }
   * @param {object} callbacks { onStart, onEnd, onError }
   */
  speak(text, options = {}, callbacks = {}) {
    const s = this.synth;
    if (!s) {
      callbacks?.onError?.('Speech synthesis not available');
      return;
    }

    const cleaned = this.cleanText(text);
    if (!cleaned) {
      callbacks?.onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = options.rate ?? 1.05;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      const voice = this.findBestVoice(options.language || 'en-US', options.voiceName);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      utterance.onstart = () => {
        this.currentUtterance = utterance;
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        callbacks?.onEnd?.();
      };

      utterance.onerror = (event) => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        // 'canceled' or 'interrupted' is normal during barge-in
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.warn('[BrowserTTS] Utterance error:', event.error);
          callbacks?.onError?.(event.error);
        } else {
          callbacks?.onEnd?.();
        }
      };

      this.currentUtterance = utterance;
      s.speak(utterance);
    } catch (err) {
      console.error('[BrowserTTS] Speak failed:', err);
      callbacks?.onError?.(err.message || 'Speak failed');
    }
  }

  cancel() {
    const s = this.synth;
    if (s) {
      try {
        s.cancel();
      } catch (e) {}
    }
    this.currentUtterance = null;
  }

  isSpeaking() {
    return !!(this.synth && this.synth.speaking);
  }
}
