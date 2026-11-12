import assert from 'node:assert/strict';
export { describe, it, beforeEach, afterEach, before, after, after as afterAll } from 'node:test';

export function expect<T = any>(actual: T) {
  const matchers = (isNot: boolean) => ({
    toBe(expected: any) {
      if (isNot) {
        assert.notStrictEqual(actual, expected);
      } else {
        assert.strictEqual(actual, expected);
      }
    },
    toEqual(expected: any) {
      if (isNot) {
        assert.notDeepStrictEqual(actual, expected);
      } else {
        assert.deepStrictEqual(actual, expected);
      }
    },
    toBeDefined() {
      if (isNot) {
        assert.strictEqual(actual, undefined);
      } else {
        assert.notStrictEqual(actual, undefined);
      }
    },
    toBeUndefined() {
      if (isNot) {
        assert.notStrictEqual(actual, undefined);
      } else {
        assert.strictEqual(actual, undefined);
      }
    },
    toBeNull() {
      if (isNot) {
        assert.notStrictEqual(actual, null);
      } else {
        assert.strictEqual(actual, null);
      }
    },
    toBeTruthy() {
      if (isNot) {
        assert(!actual);
      } else {
        assert(Boolean(actual));
      }
    },
    toBeFalsy() {
      if (isNot) {
        assert(Boolean(actual));
      } else {
        assert(!actual);
      }
    },
    toBeGreaterThan(n: number) {
      if (isNot) {
        assert((actual as any) <= n);
      } else {
        assert((actual as any) > n);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (isNot) {
        assert((actual as any) < n);
      } else {
        assert((actual as any) >= n);
      }
    },
    toBeLessThan(n: number) {
      if (isNot) {
        assert((actual as any) >= n);
      } else {
        assert((actual as any) < n);
      }
    },
    toBeLessThanOrEqual(n: number) {
      if (isNot) {
        assert((actual as any) > n);
      } else {
        assert((actual as any) <= n);
      }
    },
    toContain(item: any) {
      if (typeof actual === 'string') {
        const contains = actual.includes(item);
        if (isNot) {
          assert(!contains, `Expected string not to contain "${item}"`);
        } else {
          assert(contains, `Expected string to contain "${item}"`);
        }
      } else if (Array.isArray(actual)) {
        const contains = (actual as any[]).includes(item);
        if (isNot) {
          assert(!contains, `Expected array not to contain item`);
        } else {
          assert(contains, `Expected array to contain item`);
        }
      } else {
        throw new Error('toContain target must be a string or array');
      }
    },
    toHaveLength(len: number) {
      const actualLen = (actual as any)?.length;
      if (isNot) {
        assert.notStrictEqual(actualLen, len);
      } else {
        assert.strictEqual(actualLen, len);
      }
    },
    toMatch(regex: RegExp | string) {
      const reg = typeof regex === 'string' ? new RegExp(regex) : regex;
      const matches = reg.test(String(actual));
      if (isNot) {
        assert(!matches, `Expected "${actual}" not to match ${regex}`);
      } else {
        assert(matches, `Expected "${actual}" to match ${regex}`);
      }
    },
    toThrow(expected?: any) {
      if (typeof actual !== 'function') {
        throw new Error('toThrow target must be a function');
      }
      if (isNot) {
        assert.doesNotThrow(actual as any);
      } else {
        assert.throws(actual as any, expected);
      }
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
    resolves: {
      not: {
        toThrow: async () => {
          try {
            await actual;
          } catch (err: any) {
            assert.fail(`Expected promise not to throw, but it rejected with: ${err?.message}`);
          }
        },
      },
      toBe: async (expected: any) => {
        const val = await actual;
        assert.strictEqual(val, expected);
      },
      toEqual: async (expected: any) => {
        const val = await actual;
        assert.deepStrictEqual(val, expected);
      },
    },
    rejects: {
      toThrow: async (expected?: any) => {
        await assert.rejects(actual as any, expected);
      },
    },
  };
}
