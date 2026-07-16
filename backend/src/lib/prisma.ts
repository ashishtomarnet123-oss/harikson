import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantLocalStorage = new AsyncLocalStorage<string>();

export function getCurrentTenant(): string | undefined {
  return tenantLocalStorage.getStore();
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Query middleware to enforce tenant isolation
prisma.$use(async (params, next) => {
  if (
    params.model &&
    ['Document', 'Instance', 'CapturedLead', 'FineTuneJob', 'ValidationLog'].includes(
      params.model
    )
  ) {
    const tenantId = getCurrentTenant();
    if (tenantId) {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      // Ensure the filter contains: tenant_id: getCurrentTenant()
      params.args.where.tenantId = tenantId;
    }
  }
  return next(params);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
