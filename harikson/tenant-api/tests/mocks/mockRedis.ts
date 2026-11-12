import { EventEmitter } from 'events';

export class MockRedis extends EventEmitter {
  private store = new Map<string, string>();
  private expirations = new Map<string, number>();
  public status: 'ready' | 'wait' | 'end' = 'ready';

  async get(key: string): Promise<string | null> {
    const exp = this.expirations.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expirations.delete(key);
      return null;
    }
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    this.expirations.delete(key);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, value);
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const k of keys) {
      if (this.store.delete(k)) {
        this.expirations.delete(k);
        deleted++;
      }
    }
    return deleted;
  }

  async incr(key: string): Promise<number> {
    const val = parseInt(this.store.get(key) || '0', 10);
    const nextVal = val + 1;
    this.store.set(key, String(nextVal));
    return nextVal;
  }

  async keys(pattern: string): Promise<string[]> {
    if (pattern === '*') return Array.from(this.store.keys());
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const exp = this.expirations.get(key);
    if (!exp) return -1;
    const remaining = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
    return remaining;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    this.expirations.clear();
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    this.status = 'end';
    this.emit('end');
    return 'OK';
  }

  disconnect(): void {
    this.status = 'end';
    this.emit('end');
  }
}

