import crypto from 'crypto';

/**
 * Generate a unique 8-character query ID.
 */
export function generateQueryId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Extract SQL operation type (SELECT, INSERT, UPDATE, DELETE, etc.).
 */
export function extractOperation(sql) {
  if (!sql) return 'UNKNOWN';
  const trimmed = String(sql).trim();
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord ? firstWord.toUpperCase() : 'UNKNOWN';
}

/**
 * Extract target database table name from SQL statement.
 */
export function extractTableName(sql) {
  if (!sql) return 'unknown';
  const cleaned = String(sql)
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  const match = cleaned.match(/(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+([`"]?[\w_]+[`"]?)/i);
  if (match && match[1]) {
    return match[1].replace(/[`"]/g, '');
  }
  return 'unknown';
}

/**
 * Redact sensitive PII patterns (emails, phone numbers, tokens, passwords).
 */
export function redactPII(text) {
  if (!text) return '';
  let result = String(text);
  // Redact emails
  result = result.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED_EMAIL]');
  // Redact phone numbers
  result = result.replace(/(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, '[REDACTED_PHONE]');
  // Redact Bearer tokens
  result = result.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_TOKEN]');
  // Redact passwords & keys
  result = result.replace(/(?:password|passwd|secret|api_key|token)\s*[:=]\s*['"]?[^'"\s,{}]+['"]?/gi, '$1=[REDACTED]');
  return result;
}

/**
 * Safe query execution logger that prevents raw SQL parameter interpolation leakage.
 */
export function traceQuery(logger, poolName, text, originalQueryFn, contextThis, args) {
  const qid = generateQueryId();
  const sqlTemplate = typeof text === 'string' ? text : text?.text || '';
  const operation = extractOperation(sqlTemplate);
  const table = extractTableName(sqlTemplate);
  const isDebug = process.env.LOG_LEVEL === 'debug';

  // 1. Log query start with QID
  if (logger && typeof logger.info === 'function') {
    logger.info({
      qid,
      table,
      operation,
      poolName,
      msg: `[QID:${qid}] Starting query on table:${table}, operation:${operation}`,
    });
  }

  // 2. Debug level template logging with PII redaction
  if (isDebug && logger && typeof logger.debug === 'function') {
    const safeSql = redactPII(sqlTemplate);
    logger.debug({ qid, sql: safeSql, msg: `[QID:${qid}] Debug SQL Template: ${safeSql}` });
  }

  const startTime = Date.now();

  const handleResult = (err, result) => {
    const durationMs = Date.now() - startTime;
    if (err) {
      const safeErrMsg = redactPII(err.message || String(err));
      if (logger && typeof logger.error === 'function') {
        logger.error({
          qid,
          table,
          operation,
          durationMs,
          error: safeErrMsg,
          msg: `[QID:${qid}] Query failed: ${safeErrMsg}`,
        });
      }
    } else {
      const rowCount = result?.rowCount ?? (Array.isArray(result?.rows) ? result.rows.length : 0);
      if (logger && typeof logger.info === 'function') {
        logger.info({
          qid,
          table,
          operation,
          durationMs,
          rows: rowCount,
          msg: `[QID:${qid}] Query completed in ${durationMs}ms, rows:${rowCount}`,
        });
      }
    }
  };

  const lastArg = args[args.length - 1];
  if (typeof lastArg === 'function') {
    const cb = args.pop();
    args.push((err, res) => {
      handleResult(err, res);
      cb(err, res);
    });
    return originalQueryFn.apply(contextThis, args);
  }

  try {
    const resOrPromise = originalQueryFn.apply(contextThis, args);
    if (resOrPromise && typeof resOrPromise.then === 'function') {
      return resOrPromise
        .then((res) => {
          handleResult(null, res);
          return res;
        })
        .catch((err) => {
          handleResult(err, null);
          throw err;
        });
    }
    handleResult(null, resOrPromise);
    return resOrPromise;
  } catch (err) {
    handleResult(err, null);
    throw err;
  }
}
