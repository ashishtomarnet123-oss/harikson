import { Request, Response } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Standard pagination parser.
 * Supports ?page=1&limit=20 as well as ?offset=0&limit=20.
 * Restricts limit between 1 and maxLimit (default 100).
 */
export function parsePagination(
  req: Request,
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const pageRaw = parseInt(req.query.page as string, 10);
  const limitRaw = parseInt(req.query.limit as string, 10);
  const offsetRaw = parseInt(req.query.offset as string, 10);

  const limit = Math.min(
    maxLimit,
    Math.max(1, isNaN(limitRaw) ? defaultLimit : limitRaw)
  );
  
  let page = 1;
  let offset = 0;

  if (!isNaN(offsetRaw) && offsetRaw >= 0) {
    offset = offsetRaw;
    page = Math.floor(offset / limit) + 1;
  } else if (!isNaN(pageRaw) && pageRaw >= 1) {
    page = pageRaw;
    offset = (page - 1) * limit;
  }

  return { page, limit, offset };
}

/**
 * Standard collection response builder.
 * Retains target array key (e.g. 'notifications', 'workflows') while attaching
 * unified pagination metadata and extra fields.
 */
export function buildPaginatedResponse<T>(
  collectionKey: string,
  items: T[],
  total: number,
  pagination: PaginationParams,
  extra: Record<string, any> = {}
) {
  const totalPages = Math.ceil(total / pagination.limit) || 1;
  const hasMore = pagination.page * pagination.limit < total;

  return {
    [collectionKey]: items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasMore,
    ...extra,
  };
}

/**
 * Standard error response builder.
 * Dispatches consistent error payloads matching both modern and legacy consumers.
 */
export function sendStandardError(
  res: Response,
  statusCode: number,
  errorMessage: string,
  errorCode = 'ERROR',
  details?: any
) {
  return res.status(statusCode).json({
    error: errorMessage,
    message: errorMessage,
    code: errorCode,
    statusCode,
    ...(details ? { details } : {}),
  });
}

