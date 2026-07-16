import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../lib/auth.js';
import { prisma, tenantLocalStorage } from '../lib/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    tenantId?: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthUtils.verifyToken(token) as any;
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Fetch the user's tenant ID from database
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { tenantId: true },
  });

  const tenantId =
    user?.tenantId ||
    (req.headers['x-tenant-id'] as string) ||
    '00000000-0000-0000-0000-000000000000';

  decoded.tenantId = tenantId;
  req.user = decoded;

  tenantLocalStorage.run(tenantId, () => {
    next();
  });
}

export function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res
      .status(403)
      .json({ error: 'Access restricted to administrators only.' });
  }
  next();
}
