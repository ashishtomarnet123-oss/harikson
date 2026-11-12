import pool from '../db.js';
import logger from './logger.js';

export async function logAdminAction(
  adminId,
  action,
  targetType,
  targetId,
  oldValue,
  newValue,
  req
) {
  try {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress;
    const ua = req?.headers?.['user-agent'];
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        adminId,
        action,
        targetType,
        targetId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        (ip || '').replace(/^::ffff:/, '') || '0.0.0.0',
        ua || null,
      ]
    );
  } catch (err) {
    logger.error('Audit logging failed:', err);
  }
}

export default logAdminAction;

