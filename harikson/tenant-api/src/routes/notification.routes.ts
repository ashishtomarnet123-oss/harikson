import { Router } from 'express';
import { executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

const router = Router();

// GET /api/notifications
router.get('/', async (req: any, res) => {
  try {
    const [notifRes, countRes] = await executeTenantQuery(req.tenant.id, async (client) => {
      const notifs = await client.query(
        `SELECT id, title, message, type, read, created_at
         FROM notifications
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.tenant.id]
      );
      const count = await client.query(
        `SELECT COUNT(*)::int as unread
         FROM notifications
         WHERE tenant_id = $1 AND read = false`,
        [req.tenant.id]
      );
      return [notifs, count];
    });

    res.json({
      notifications: notifRes.rows,
      unreadCount: countRes.rows[0]?.unread || 0,
    });
  } catch (err: any) {
    logger.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all (must be before /:id routes)
router.put('/read-all', async (req: any, res) => {
  try {
    await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `UPDATE notifications SET read = true WHERE tenant_id = $1 AND read = false`,
        [req.tenant.id]
      )
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req: any, res) => {
  const { id } = req.params;

  try {
    await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `UPDATE notifications SET read = true WHERE id = $1 AND tenant_id = $2`,
        [id, req.tenant.id]
      )
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;

  try {
    await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `DELETE FROM notifications WHERE id = $1 AND tenant_id = $2`,
        [id, req.tenant.id]
      )
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
