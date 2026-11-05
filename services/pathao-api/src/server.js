// Optional Node 22 host adapter for the independent Lorapok Labs Fetch API.
// Loopback by default. Migration and credential provisioning are separate operations.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

const databasePath = process.env.COURIER_DATABASE_PATH;
if (!databasePath || !existsSync(databasePath)) {
  throw Error('Set COURIER_DATABASE_PATH to an existing, migrated standalone database.');
}
const sqlite = new DatabaseSync(databasePath, { open: true });
sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
const db = {
  prepare(sql) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      first() { return sqlite.prepare(sql).get(...args) || null; },
      all() { return { results: sqlite.prepare(sql).all(...args) }; },
      run() { const result = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; },
    };
  },
  batch(statements) {
    // Do not yield during a transaction on this shared synchronous connection.
    // Other requests must not accidentally participate in, or roll back, the batch.
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => statement.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },
};
const env = { ...process.env, COURIER_DB: db };
const pending = new Set();
const context = {
  waitUntil(promise) {
    const tracked = Promise.resolve(promise).catch(() => {}).finally(() => pending.delete(tracked));
    pending.add(tracked);
  },
};
const server = createServer(async (request, response) => {
  try {
    const target = new URL(request.url, 'http://127.0.0.1');
    const input = new Request(target, {
      method: request.method, headers: request.headers,
      ...(!['GET', 'HEAD'].includes(request.method) ? { body: request, duplex: 'half' } : {}),
    });
    const result = await worker.fetch(input, env, context);
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end('{"error":"Service unavailable."}');
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 8788), process.env.HOST || '127.0.0.1', () => {
  const address = server.address();
  console.log(`Lorapok Labs Courier API listening on ${address.address}:${address.port}`);
});
// Retry only queued GET reconciliation, never a booking, store POST or token grant.
// The worker runtime instead uses an explicitly configured scheduled trigger.
if (env.COURIER_RECONCILIATION_ENABLED === 'true') {
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try { await worker.scheduled(null, env, context); } catch { /* Next bounded drain may retry. */ } finally { await Promise.allSettled([...pending]); running = false; }
  }, 60000).unref();
}
