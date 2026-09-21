/**
 * chunked-speaker.js — Sentence-Chunk Streaming TTS Engine
 *
 * Consumes streaming text token-by-token from SSE, extracts complete sentences
 * using an abbreviation-aware boundary detector, and feeds them into a sequential
 * utterance queue.
 *
 * Latency optimization: First sentence starts speaking immediately while later
 * tokens are still streaming over the wire.
 */

import { BrowserTTSProvider } from '../providers/BrowserTTSProvider';

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc',
  'eg', 'ie', 'al', 'inc', 'ltd', 'dept', 'approx', 'est'
]);

export class ChunkedSpeaker {
  constructor(ttsProvider = null) {
    this.tts = ttsProvider || new BrowserTTSProvider();
    this.queue = [];
    this.isPlaying = false;
    this.buffer = '';
    this.streamActive = false;
    this.options = {
      rate: 1.05,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US',
      voiceName: null,
    };
    this.callbacks = {
      onFirstAudio: null,
      onSentenceStart: null,
      onFinished: null,
      onError: null,
    };
    this.hasFiredFirstAudio = false;
    this.startTime = null;
  }

  setOptions(opts) {
    this.options = { ...this.options, ...opts };
  }

  setCallbacks(cbs) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  startStream(timestamp = Date.now()) {
    this.cancel();
    this.buffer = '';
    this.queue = [];
    this.streamActive = true;
    this.hasFiredFirstAudio = false;
    this.startTime = timestamp;
  }

  /**
   * Append a newly arrived SSE token/chunk.
   */
  pushChunk(chunk) {
    if (!this.streamActive) return;
    this.buffer += chunk;
    this.processBuffer(false);
  }

  /**
   * Signal that the SSE stream has concluded. Flushes remaining buffer.
   */
  finishStream() {
    this.streamActive = false;
    this.processBuffer(true);
    if (!this.isPlaying && this.queue.length === 0) {
      this.callbacks.onFinished?.();
    }
  }

  /**
   * Stop speaking and clear all queued utterances immediately.
   */
  cancel() {
    this.streamActive = false;
    this.queue = [];
    this.buffer = '';
    this.isPlaying = false;
    this.hasFiredFirstAudio = false;
    this.tts.cancel();
  }

  /**
   * Scan buffer for complete sentence boundaries.
   */
  processBuffer(isEnd = false) {
    // Look for sentence terminators (. ! ? \n) followed by whitespace or end of stream
    let searchIndex = 0;
    while (searchIndex < this.buffer.length) {
      // Find candidate delimiter (. ? ! \n)
      const match = /[.!?\n]/.exec(this.buffer.slice(searchIndex));
      if (!match) break;

      const delimIndex = searchIndex + match.index;
      const char = this.buffer[delimIndex];
      const nextChar = this.buffer[delimIndex + 1] || '';

      // Check if inside decimal number (e.g. 3.14 or v2.0)
      const prevChar = delimIndex > 0 ? this.buffer[delimIndex - 1] : '';
      if (char === '.' && /\d/.test(prevChar) && /\d/.test(nextChar)) {
        searchIndex = delimIndex + 1;
        continue;
      }

      // Check for abbreviation (e.g. "Dr. Smith", "e.g. that")
      if (char === '.') {
        const lastWordMatch = /[a-zA-Z]+$/.exec(this.buffer.slice(0, delimIndex));
        if (lastWordMatch) {
          const lastWord = lastWordMatch[0].toLowerCase();
          if (ABBREVIATIONS.has(lastWord)) {
            searchIndex = delimIndex + 1;
            continue;
          }
        }
      }

      // Check for ellipsis ("...")
      if (char === '.' && nextChar === '.') {
        // Skip through all consecutive dots
        let dotEnd = delimIndex;
        while (this.buffer[dotEnd] === '.') dotEnd++;
        searchIndex = dotEnd;
        continue;
      }

      // If next char is not whitespace or end of buffer (unless isEnd), don't split yet
      if (!isEnd && nextChar && !/\s/.test(nextChar)) {
        searchIndex = delimIndex + 1;
        continue;
      }

      // Valid sentence split!
      const sentence = this.buffer.slice(0, delimIndex + 1).trim();
      this.buffer = this.buffer.slice(delimIndex + 1).trimStart();
      searchIndex = 0;

      if (sentence) {
        this.enqueueSentence(sentence);
      }
    }

    // If stream ended and text remains in buffer, flush it
    if (isEnd && this.buffer.trim()) {
      this.enqueueSentence(this.buffer.trim());
      this.buffer = '';
    }
  }

  enqueueSentence(rawSentence) {
    // Safari ~15s limit: cap chunk length to ~200 chars
    const MAX_CHUNK = 200;
    if (rawSentence.length <= MAX_CHUNK) {
      this.queue.push(rawSentence);
    } else {
      // Split on commas or clause breaks
      const parts = rawSentence.split(/([,;:—–]\s+)/);
      let current = '';
      for (const part of parts) {
        if ((current + part).length > MAX_CHUNK && current.trim()) {
          this.queue.push(current.trim());
          current = part;
        } else {
          current += part;
        }
      }
      if (current.trim()) {
        this.queue.push(current.trim());
      }
    }

    this.playNext();
  }

  playNext() {
    if (this.isPlaying || this.queue.length === 0) return;

    const sentence = this.queue.shift();
    if (!sentence) {
      if (!this.streamActive && this.queue.length === 0) {
        this.callbacks.onFinished?.();
      }
      return;
    }

    this.isPlaying = true;

    this.tts.speak(
      sentence,
      this.options,
      {
        onStart: () => {
          if (!this.hasFiredFirstAudio) {
            this.hasFiredFirstAudio = true;
            const ttfa = this.startTime ? Date.now() - this.startTime : null;
            this.callbacks.onFirstAudio?.(ttfa);
          }
          this.callbacks.onSentenceStart?.(sentence);
        },
        onEnd: () => {
          this.isPlaying = false;
          if (this.queue.length > 0) {
            this.playNext();
          } else if (!this.streamActive) {
            this.callbacks.onFinished?.();
          }
        },
        onError: (err) => {
          this.isPlaying = false;
          this.callbacks.onError?.(err);
          // Attempt next chunk even if one failed
          if (this.queue.length > 0) {
            this.playNext();
          } else if (!this.streamActive) {
            this.callbacks.onFinished?.();
          }
        },
      }
    );
  }
}
