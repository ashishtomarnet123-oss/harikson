import { Router } from 'express';
import { executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopeAuth.js';
import { parsePagination, buildPaginatedResponse } from '../utils/standardApi.js';


const router = Router();
router.use(requireAuth);

// GET /api/notifications - List user/tenant notifications with unread count
router.get('/', requireScopes('user:read', 'notifications:read'), async (req: any, res) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId || req.user?.id || null;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }


  try {
    const pagination = parsePagination(req, 50, 100);
    const [notifRes, countRes, totalRes] = await executeTenantQuery(tenantId, async (client) => {
      const notifs = await client.query(
        `SELECT id, title, message, type, read, is_read, link, created_at
         FROM notifications
         WHERE tenant_id = $1 AND ($2::uuid IS NULL OR user_id = $2 OR user_id IS NULL)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [tenantId, userId, pagination.limit, pagination.offset]
      );
      const count = await client.query(
        `SELECT COUNT(*)::int as unread
         FROM notifications
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR user_id = $2 OR user_id IS NULL)
           AND (read = false OR is_read = false)`,
        [tenantId, userId]
      );
      const total = await client.query(
        `SELECT COUNT(*)::int as total
         FROM notifications
         WHERE tenant_id = $1 AND ($2::uuid IS NULL OR user_id = $2 OR user_id IS NULL)`,
        [tenantId, userId]
      );
      return [notifs, count, total];
    });

    const unreadTotal = countRes.rows[0]?.unread || 0;
    const totalCount = totalRes.rows[0]?.total || 0;
    res.json(
      buildPaginatedResponse('notifications', notifRes.rows, totalCount, pagination, {
        unreadCount: unreadTotal,
        unread_count: unreadTotal,
      })
    );
  } catch (err: any) {
    logger.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all - Mark all accessible notifications read
router.put('/read-all', requireScopes('user:write', 'notifications:write'), async (req: any, res) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId || req.user?.id || null;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  try {
    const updateRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE notifications
         SET read = true, is_read = true
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR user_id = $2 OR user_id IS NULL)
           AND (read = false OR is_read = false)`,
        [tenantId, userId]
      )
    );

    res.json({ success: true, updatedCount: updateRes.rowCount || 0 });
  } catch (err: any) {
    logger.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// PUT /api/notifications/:id/read - Mark specific notification read
router.put('/:id/read', requireScopes('user:write', 'notifications:write'), async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId || req.user?.id || null;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  try {
    const updateRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE notifications
         SET read = true, is_read = true
         WHERE id = $1 AND tenant_id = $2
           AND ($3::uuid IS NULL OR user_id = $3 OR user_id IS NULL)
         RETURNING id`,
        [id, tenantId, userId]
      )
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    logger.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', requireScopes('user:write', 'notifications:write'), async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const userId = req.user?.userId || req.user?.id || null;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  try {
    const delRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `DELETE FROM notifications
         WHERE id = $1 AND tenant_id = $2
           AND ($3::uuid IS NULL OR user_id = $3 OR user_id IS NULL)
         RETURNING id`,
        [id, tenantId, userId]
      )
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (err: any) {
    logger.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
