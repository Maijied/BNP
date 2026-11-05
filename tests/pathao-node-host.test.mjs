import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createTokenCipher } from '../services/pathao-api/src/token-store.js';

// Test the actual Node entry point, not just an injected Fetch handler. No provider
// credential exists; an unknown callback can only reconcile an empty known-order set.
test('Node host serves the independent API and drains encrypted callbacks through waitUntil', { timeout: 15000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'courier-node-test-'));
  const databasePath = join(directory, 'courier.sqlite');
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  const migrations = new URL('../services/pathao-api/migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(name, migrations), 'utf8'));
  const encryptionKey = Buffer.alloc(32, 23).toString('base64'), keyVersion = 'node-fixture';
  const cipher = createTokenCipher({ encryptionKey, keyVersion });
  const merchant = 'node-test', product = 'bnp', environment = 'sandbox';
  const endpoint = 'synthetic-node-endpoint-123456', secret = 'synthetic-webhook-secret-'.repeat(3);
  const config = await cipher.seal({ credentials: {} }, ['registry', 'merchant', merchant, environment, product]);
  const envelope = await cipher.seal(secret, ['registry', 'webhook', merchant, environment, product]);
  db.prepare('INSERT INTO courier_merchants VALUES(?,?,?,?,1)').run(merchant, product, environment, JSON.stringify(config));
  db.prepare('INSERT INTO courier_webhook_routes VALUES(?,?,?,?,?,1)').run(endpoint, merchant, product, environment, JSON.stringify(envelope));
  const process = spawn(globalThis.process.execPath, ['services/pathao-api/src/server.js'], {
    cwd: new URL('../', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: globalThis.process.env.PATH, COURIER_DATABASE_PATH: databasePath, COURIER_ENCRYPTION_KEY: encryptionKey, COURIER_KEY_VERSION: keyVersion,
      HOST: '127.0.0.1', PORT: '0', COURIER_ENABLED: 'false', COURIER_WEBHOOK_ENABLED: 'true', COURIER_RECONCILIATION_ENABLED: 'true' },
  });
  t.after(async () => {
    process.kill('SIGTERM');
    if (process.exitCode === null) await new Promise(resolve => process.once('exit', resolve));
    db.close(); rmSync(directory, { recursive: true, force: true });
  });
  let stderr = ''; process.stderr.on('data', chunk => { stderr += chunk; });
  const port = await new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => reject(new Error('Node host did not start')), 5000);
    process.once('error', reject);
    process.once('exit', code => { clearTimeout(timer); reject(new Error(`Node host exited (${code}): ${stderr}`)); });
    process.stdout.on('data', chunk => {
      stdout += chunk;
      const match = stdout.match(/listening on 127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  assert.equal((await (await fetch(`${origin}/health`)).json()).brand, 'Lorapok Labs');
  assert.equal((await fetch(`${origin}/v1/context`)).status, 401);
  const request = () => fetch(`${origin}/v1/webhooks/pathao/${endpoint}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PATHAO-Signature': secret }, body: JSON.stringify({ arbitrary: 'private-test-content' }) });
  assert.equal((await request()).status, 202);
  let row;
  for (let attempt = 0; attempt < 100; attempt++) {
    row = db.prepare('SELECT * FROM courier_webhook_inbox').get();
    if (row?.processing_status === 'review_required') break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(row.processing_status, 'review_required');
  assert.equal(row.review_reason, 'no_known_shipments');
  assert.equal(JSON.stringify(row).includes('private-test-content'), false);
  assert.equal((await (await request()).json()).duplicate, true);
  assert.equal(db.prepare('SELECT count(*) AS n FROM courier_operations').get().n, 0);
});
