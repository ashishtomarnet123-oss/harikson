import express from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Middleware: Metrics Auth / IP Whitelist Guard for /metrics and /api/metrics.
 * Requires either:
 *  1. Valid Bearer token matching METRICS_BEARER_TOKEN or INTERNAL_API_SECRET
 *  2. Timing-safe x-internal-secret header
 *  3. Internal Docker/local IP whitelist (172.x.x.x, 10.x.x.x, 192.168.x.x, 127.0.0.1, ::1)
 */
export const metricsAuthGuard = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization || '';
  const expectedToken = process.env.METRICS_BEARER_TOKEN || process.env.INTERNAL_API_SECRET;

  // 1. Bearer Token Auth (for Prometheus scrape job)
  if (expectedToken && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === expectedToken) {
      return next();
    }
  }

  // 2. Internal Secret Header (timing-safe check)
  const internalSecret = req.headers['x-internal-secret'] as string | undefined;
  if (
    internalSecret &&
    expectedToken &&
    Buffer.byteLength(internalSecret) === Buffer.byteLength(expectedToken)
  ) {
    if (crypto.timingSafeEqual(Buffer.from(internalSecret), Buffer.from(expectedToken))) {
      return next();
    }
  }

  // 3. IP Whitelist check (allow Docker container network 172.x.x.x, 10.x.x.x, 192.168.x.x, loopback 127.0.0.1, ::1)
  const rawIp = (req.socket.remoteAddress || req.ip || '').toString();
  const cleanIp = rawIp.replace(/^::ffff:/, '').trim();

  const isInternalIp =
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === '1' ||
    cleanIp.startsWith('172.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.');

  if (isInternalIp) {
    return next();
  }

  logger.warn(`🚨 Unauthorized access attempt to /metrics from IP: ${cleanIp}`);
  return res.status(403).json({
    error: 'Access Denied: /metrics requires Bearer token or internal Prometheus network access',
  });
};

export default metricsAuthGuard;

