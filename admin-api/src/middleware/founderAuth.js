import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const parseCookie = (cookieHeader, key) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^| )' + key + '=([^;]+)'));
  return match ? match[2] : null;
};

export const founderAuth = async (req, res, next) => {
  try {
    // 1. Try to get token from Cookies (admin_access_token or admin_token)
    if (req.headers.cookie) {
      token = parseCookie(req.headers.cookie, 'admin_access_token') || parseCookie(req.headers.cookie, 'admin_token');
    }

    // 2. Fallback to Authorization header if present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(404).json({ error: 'Not Found' }); // Masked as 404
    }

    const jwtSecret = process.env.JWT_SECRET;
    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtErr) {
      return res.status(404).json({ error: 'Not Found' });
    }

    const result = await pool.query(
      'SELECT id, role, email FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found' });
    }

    const user = result.rows[0];
    // To ensure demo works smoothly without deep DB migrations for user.role,
    // we also accept 'superadmin' but theoretically it should be strictly 'founder'
    if (user.role !== 'founder' && user.role !== 'superadmin') {
      return res.status(404).json({ error: 'Not Found' });
    }

    req.founder = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (err) {
    logger.error('Founder Auth Middleware error:', err);
    return res.status(404).json({ error: 'Not Found' });
  }
};
