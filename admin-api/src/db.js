import pg from 'pg';
import logger from './utils/logger.js';
import { traceQuery } from './utils/queryLogger.js';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const originalPoolQuery = pool.query;
pool.query = function (text, params, callback) {
  return traceQuery(logger, 'AdminPool', text, originalPoolQuery, pool, Array.from(arguments));
};

const originalPoolConnect = pool.connect;
pool.connect = function (callback) {
  if (callback) {
    return originalPoolConnect.call(pool, (err, client, done) => {
      if (err) return callback(err);
      if (client && !client.query.__wrapped) {
        const originalClientQuery = client.query;
        client.query = function (text, params, cb) {
          return traceQuery(logger, 'AdminClient', text, originalClientQuery, client, Array.from(arguments));
        };
        client.query.__wrapped = true;
      }
      callback(null, client, done);
    });
  }

  return originalPoolConnect.apply(pool, arguments).then((client) => {
    if (client && !client.query.__wrapped) {
      const originalClientQuery = client.query;
      client.query = function (text, params, cb) {
        return traceQuery(logger, 'AdminClient', text, originalClientQuery, client, Array.from(arguments));
      };
      client.query.__wrapped = true;
    }
    return client;
  });
};

export default pool;
