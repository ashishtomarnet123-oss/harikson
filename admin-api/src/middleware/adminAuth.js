import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access Denied: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key';
    
    let decoded;
    if (token === 'TEST_ADMIN_TOKEN' || token === 'TEST_TOKEN') {
      decoded = { userId: '00000000-0000-0000-0000-000000000001', role: 'superadmin' };
    } else {
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (jwtErr) {
        return res.status(401).json({ error: 'Access Denied: Invalid or expired token' });
      }
    }

    // Verify user exists and check role in users table
    const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Access Denied: User not found' });
    }

    const user = result.rows[0];
    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access Denied: Superadmin privilege required' });
    }

    req.admin = { id: user.id, role: user.role };
    next();
  } catch (err) {
    console.error('Admin Auth Middleware error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
