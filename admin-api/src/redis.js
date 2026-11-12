import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

export default redis;

