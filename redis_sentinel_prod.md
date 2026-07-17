# Production Redis Sentinel & Cluster Configurations

This document details the configuration patterns for connecting the Harikson platform APIs to highly-available Redis architectures in production environments using the `ioredis` client.

## 1. Redis Sentinel Configuration

Redis Sentinel provides high availability for Redis. Sentinels monitor active master/replica nodes and execute automated failover configurations if the primary master fails.

### Blueprint Connection Code

To connect our API instances to a Sentinel pool:

```javascript
import Redis from 'ioredis';
import logger from './utils/logger.js';

const redis = new Redis({
  // Define active sentinel instances in the network
  sentinels: [
    { host: 'redis-sentinel-01.prod.local', port: 26379 },
    { host: 'redis-sentinel-02.prod.local', port: 26379 },
    { host: 'redis-sentinel-03.prod.local', port: 26379 }
  ],
  // The master group name configured in sentinels
  name: 'mymaster',
  // Sentinel specific options
  sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
  // Primary database node options
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Reconnection options
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

redis.on('error', (err) => logger.error('Redis Sentinel error:', err));
redis.on('reconnecting', () => logger.warn('Redis Sentinel reconnecting...'));
```

---

## 2. Redis Cluster Configuration

Redis Cluster provides database sharding and data replication automatically across multiple primary nodes.

### Blueprint Connection Code

To connect our API instances to a Redis Cluster:

```javascript
import Redis from 'ioredis';
import logger from './utils/logger.js';

// Instantiate Redis.Cluster rather than standard Redis
const redis = new Redis.Cluster(
  [
    // Provide entrypoint seed nodes (does not need to list all nodes)
    { host: 'redis-cluster-01.prod.local', port: 6379 },
    { host: 'redis-cluster-02.prod.local', port: 6379 }
  ],
  {
    // Cluster configuration options
    dnsLookup: (address, callback) => callback(null, address),
    redisOptions: {
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    },
    // Scale read queries to replicas when appropriate
    scaleReads: 'slave', 
    
    // Cluster reconnection strategy
    clusterRetryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  }
);

redis.on('error', (err) => logger.error('Redis Cluster error:', err));
```
