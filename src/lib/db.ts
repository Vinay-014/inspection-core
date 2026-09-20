import dns from 'dns';
try {
  dns.setDefaultResultOrder('verbatim');
} catch {
  // Ignore in environments where setDefaultResultOrder is not available
}
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { Pool, PoolClient } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.lcfnatgpntbvlhreczvt:InspectCore-backup@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Critical Error]', err);
});

const TRANSIENT_ERROR_CODES = new Set([
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '57P01', // admin_shutdown
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ECONNREFUSED'
]);

function isTransientError(err: any): boolean {
  if (!err) return false;
  if (err.code && TRANSIENT_ERROR_CODES.has(err.code)) return true;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('socket closed') ||
    msg.includes('server closed the connection unexpectedly')
  );
}

export async function query<T = any>(
  text: string,
  params?: any[],
  maxRetries = 2
): Promise<{ rows: T[]; rowCount: number | null }> {
  let attempt = 0;
  while (true) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'production' && duration > 500) {
        console.warn(`[Slow Query ${duration}ms]`, text.substring(0, 100));
      }
      return res;
    } catch (err: any) {
      attempt++;
      if (attempt <= maxRetries && isTransientError(err)) {
        const backoffMs = Math.min(100 * Math.pow(2, attempt), 1000);
        console.warn(`[DB Transient Error] Retrying query in ${backoffMs}ms (attempt ${attempt}/${maxRetries}):`, err.message);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      console.error('[DB Query Error]', { query: text.substring(0, 200), params, error: err });
      throw err;
    }
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  maxRetries = 1
): Promise<T> {
  let attempt = 0;
  while (true) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[DB Rollback Error]', rollbackErr);
      }
      attempt++;
      if (attempt <= maxRetries && isTransientError(error)) {
        const backoffMs = 200 * attempt;
        console.warn(`[DB Transaction Transient Error] Retrying transaction in ${backoffMs}ms:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('[DB Pool] Successfully closed all connections.');
  } catch (err) {
    console.error('[DB Pool] Error closing connection pool:', err);
  }
}
