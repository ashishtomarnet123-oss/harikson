import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const parseCookie = (cookieHeader, key) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
};

// Read JWT_SECRET lazily (per-request) rather than baking it into a module-level
// constant: ES module imports are evaluated before the importing file's own
// dotenv.config() call runs, so a top-level const here could capture an empty
// value on some startup orderings. Reading it inside the request handler avoids
// that hazard and also lets it fail loudly instead of silently trusting a
// well-known hardcoded string.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is not set (or is shorter than 32 characters) — refusing to authenticate admin requests with an insecure default.');
  }
  return secret;
}

export const adminAuth = async (req, res, next) => {
  try {
    let jwtSecret;
    try {
      jwtSecret = getJwtSecret();
    } catch (secretErr) {
      logger.error('Admin Auth Middleware misconfiguration:', secretErr.message);
      return res.status(500).json({ error: 'Server misconfiguration: admin authentication is not available' });
    }

    let token = null;

    // 1. Try to get token from Cookies (admin_access_token or admin_token)
    if (req.headers.cookie) {
      token =
        parseCookie(req.headers.cookie, 'admin_access_token') ||
        parseCookie(req.headers.cookie, 'admin_token');
    }

    // 2. Fallback to Authorization header if present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Access Denied: No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch (jwtErr) {
      return res
        .status(401)
        .json({ error: 'Access Denied: Invalid or expired token' });
    }

    if (decoded.type && decoded.type !== 'access') {
      return res
        .status(401)
        .json({ error: 'Access Denied: Invalid token type for admin API access' });
    }

    // Check session revocation in Redis if available
    const redis = req.app?.get('redis');
    if (redis) {
      try {
        const isRevoked =
          (decoded.jti ? await redis.get(`revoked:session:${decoded.jti}`) : null) ||
          await redis.get(`revoked:user:${decoded.userId}`);
        if (isRevoked) {
          return res.status(401).json({ error: 'Access Denied: Session has been revoked' });
        }
      } catch (redisErr) {
        // Log redis warning but fail closed only on explicit revocation
        logger.warn('Failed to check session revocation in Redis:', redisErr.message);
      }
    }

    // Verify user exists and check role in users table
    let result;
    try {
      result = await pool.query(
        'SELECT id, role, email, tenant_id, status, locked_until FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
        [decoded.userId]
      );
    } catch (dbErr) {
      logger.error('Admin Auth Middleware DB query error:', dbErr.message);
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    if (!result || result.rows.length === 0) {
      return res.status(401).json({ error: 'Access Denied: User not found' });
    }

    const user = result.rows[0];

    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(403).json({ error: 'Access Denied: Account suspended or inactive' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Access Denied: Account temporarily locked' });
    }

    const allowedRoles = ['admin', 'superadmin', 'founder'];
    if (!allowedRoles.includes(user.role)) {
      return res
        .status(403)
        .json({ error: 'Access Denied: Admin privilege required' });
    }

    req.admin = {
      id: user.id,
      role: user.role,
      email: user.email,
      tenant_id: user.tenant_id,
      jti: decoded.jti,
    };
    next();
  } catch (err) {
    logger.error('Admin Auth Middleware error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
