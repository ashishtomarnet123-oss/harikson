import assert from 'node:assert/strict';
export { describe, it, beforeEach, afterEach, before, after, after as afterAll } from 'node:test';

export function expect(actual) {
  const matchers = (isNot) => ({
    toBe(expected) {
      if (isNot) assert.notStrictEqual(actual, expected);
      else assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      if (isNot) assert.notDeepStrictEqual(actual, expected);
      else assert.deepStrictEqual(actual, expected);
    },
    toBeDefined() {
      if (isNot) assert.strictEqual(actual, undefined);
      else assert.notStrictEqual(actual, undefined);
    },
    toBeUndefined() {
      if (isNot) assert.notStrictEqual(actual, undefined);
      else assert.strictEqual(actual, undefined);
    },
    toBeNull() {
      if (isNot) assert.notStrictEqual(actual, null);
      else assert.strictEqual(actual, null);
    },
    toBeTruthy() {
      if (isNot) assert(!actual);
      else assert(Boolean(actual));
    },
    toBeFalsy() {
      if (isNot) assert(Boolean(actual));
      else assert(!actual);
    },
    toBeGreaterThan(n) {
      if (isNot) assert(actual <= n);
      else assert(actual > n);
    },
    toBeGreaterThanOrEqual(n) {
      if (isNot) assert(actual < n);
      else assert(actual >= n);
    },
    toBeLessThan(n) {
      if (isNot) assert(actual >= n);
      else assert(actual < n);
    },
    toBeLessThanOrEqual(n) {
      if (isNot) assert(actual > n);
      else assert(actual <= n);
    },
    toContain(item) {
      if (typeof actual === 'string') {
        const contains = actual.includes(item);
        if (isNot) assert(!contains, `Expected string not to contain "${item}"`);
        else assert(contains, `Expected string to contain "${item}"`);
      } else if (Array.isArray(actual)) {
        const contains = actual.includes(item);
        if (isNot) assert(!contains, 'Expected array not to contain item');
        else assert(contains, 'Expected array to contain item');
      } else {
        throw new Error('toContain target must be a string or array');
      }
    },
    toHaveLength(len) {
      const actualLen = actual?.length;
      if (isNot) assert.notStrictEqual(actualLen, len);
      else assert.strictEqual(actualLen, len);
    },
    toMatch(regex) {
      const reg = typeof regex === 'string' ? new RegExp(regex) : regex;
      const matches = reg.test(String(actual));
      if (isNot) assert(!matches, `Expected "${actual}" not to match ${regex}`);
      else assert(matches, `Expected "${actual}" to match ${regex}`);
    },
    toThrow(expected) {
      if (typeof actual !== 'function') throw new Error('toThrow target must be a function');
      if (isNot) assert.doesNotThrow(actual);
      else assert.throws(actual, expected);
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
  };
}
