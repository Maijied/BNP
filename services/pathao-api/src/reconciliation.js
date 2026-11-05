// Notifications are hints only. Their unverified schema never controls shipment,
// payment, fulfillment or reward state. Only authenticated tracking is displayed.
import { sha256, validateScope } from './provider/service.js';
import { canonicalJson, normalizeStatus } from './provider/webhook.js';
const NOW = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";
const primary = db => typeof db.withSession === 'function' ? db.withSession('first-primary') : db;
const scopeArgs = identity => {
  const scope = validateScope(identity?.scope);
  if (!['sandbox', 'production'].includes(identity.environment)) throw new Error('WEBHOOK_SCOPE_INVALID');
  return [scope.merchant, scope.product, identity.environment];
};
export const webhookPayloadContext = (identity, fingerprint) => ['webhook-inbox', ...scopeArgs(identity), fingerprint];
export function createWebhookInbox({ db, cipher } = {}) {
  if (!db?.prepare || !db?.batch || !cipher?.seal) throw new Error('WEBHOOK_INBOX_CONFIGURATION_INVALID');
  const database = primary(db);
  return Object.freeze({
    async enqueue(identity, body) {
      const scope = scopeArgs(identity);
      // JSON serialization also rejects cyclic/non-JSON inputs before persistence.
      const serialized = JSON.stringify(body);
      if (!serialized || new TextEncoder().encode(serialized).length > 32768) throw new Error('WEBHOOK_PAYLOAD_INVALID');
      const payload = JSON.parse(serialized);
      const fingerprint = await sha256(canonicalJson(payload));
      const sealed = await cipher.seal(payload, webhookPayloadContext(identity, fingerprint));
      const results = await database.batch([
        database.prepare(`INSERT INTO courier_webhook_inbox(merchant_key,product_key,environment,payload_sha256,key_version,iv,ciphertext)
          VALUES(?,?,?,?,?,?,?) ON CONFLICT(merchant_key,product_key,environment,payload_sha256) DO NOTHING`)
          .bind(...scope, fingerprint, sealed.keyVersion, sealed.iv, sealed.ciphertext),
        database.prepare(`INSERT INTO courier_reconciliation_jobs(merchant_key,product_key,environment,requested_id)
          SELECT merchant_key,product_key,environment,id FROM courier_webhook_inbox
          WHERE merchant_key=? AND product_key=? AND environment=? AND payload_sha256=?
          ON CONFLICT(merchant_key,product_key,environment) DO UPDATE SET requested_id=MAX(requested_id,excluded.requested_id)`)
          .bind(...scope, fingerprint),
      ]);
      return { accepted: true, duplicate: results[0]?.meta?.changes === 0, fingerprint };
    },
  });
}
/** One bounded page per scope per invocation. Expired leases may be taken over:
 * tracking is read-only and every write is fenced, so a late worker cannot
 * overwrite newer observations. Retries never call shipment/store creation.
 * providerFor must use the supplied merchant/product/environment identity. */
export async function reconcilePending({ db, providerFor, maxJobs = 4, pageSize = 25, leaseMs = 60000, maxAttempts = 5 } = {}) {
  if (!db?.prepare || !db?.batch || typeof providerFor !== 'function' ||
      !Number.isInteger(maxJobs) || maxJobs < 1 || maxJobs > 20 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      !Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000 ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error('RECONCILIATION_CONFIGURATION_INVALID');
  const database = primary(db), sql = (text, ...args) => database.prepare(text).bind(...args);
  const candidates = await sql(`SELECT merchant_key,product_key,environment FROM courier_reconciliation_jobs
    WHERE requested_id>completed_id AND next_attempt_at<=${NOW} AND (owner IS NULL OR lease_until<=${NOW})
    ORDER BY next_attempt_at,merchant_key,product_key,environment LIMIT ?`, maxJobs).all();
  const summary = { claimed: 0, refreshed: 0, completed: 0, retried: 0, reviewRequired: 0 };
  for (const candidate of candidates.results || []) {
    const scope = [candidate.merchant_key, candidate.product_key, candidate.environment], owner = crypto.randomUUID();
    const job = await sql(`UPDATE courier_reconciliation_jobs SET owner=?,fence=fence+1,lease_until=${NOW}+?,
      target_id=COALESCE(target_id,requested_id) WHERE merchant_key=? AND product_key=? AND environment=?
      AND requested_id>completed_id AND next_attempt_at<=${NOW} AND (owner IS NULL OR lease_until<=${NOW}) RETURNING *`, owner, leaseMs, ...scope).first();
    if (!job) continue;
    summary.claimed++;
    const guard = `merchant_key=? AND product_key=? AND environment=? AND owner=? AND fence=? AND lease_until>${NOW}`;
    const guarded = [...scope, owner, job.fence];
    const exists = `EXISTS(SELECT 1 FROM courier_reconciliation_jobs WHERE ${guard})`;
    try {
      await sql(`UPDATE courier_webhook_inbox SET processing_status='reconciling' WHERE merchant_key=? AND product_key=? AND environment=? AND id>? AND id<=? AND ${exists}`,
        ...scope, job.completed_id, job.target_id, ...guarded).run();
      const rows = await sql(`SELECT reference,consignment_id FROM courier_operations WHERE merchant_key=? AND product_key=? AND environment=?
        AND kind='shipment' AND state='confirmed' AND consignment_id IS NOT NULL AND reference>? ORDER BY reference LIMIT ?`,
        ...scope, job.cursor_reference, pageSize).all();
      const shipments = rows.results || [];
      const identity = { scope: { merchant: scope[0], product: scope[1] }, environment: scope[2] };
      const provider = shipments.length ? await providerFor(identity) : null;
      for (const shipment of shipments) {
        // Renew before each read. A provider read that outlives the lease cannot write.
        const renewed = await sql(`UPDATE courier_reconciliation_jobs SET lease_until=${NOW}+? WHERE ${guard}`, leaseMs, ...guarded).run();
        if (renewed.meta?.changes !== 1) throw new Error('LEASE_LOST');
        const status = await provider.tracking(shipment.consignment_id, shipment.reference);
        if (typeof status !== 'string' || !status.trim() || status.length > 100) throw new Error('TRACKING_RESPONSE_INVALID');
        const result = await sql(`UPDATE courier_operations SET provider_status=?,normalized_status=?,status_checked_at=datetime('now'),updated_at=datetime('now')
          WHERE merchant_key=? AND product_key=? AND environment=? AND kind='shipment' AND reference=? AND consignment_id=? AND state='confirmed' AND ${exists}`,
          status, normalizeStatus(status), ...scope, shipment.reference, shipment.consignment_id, ...guarded).run();
        if (result.meta?.changes !== 1) throw new Error('LEASE_LOST');
        summary.refreshed++;
      }
      if (shipments.length === pageSize) {
        await sql(`UPDATE courier_reconciliation_jobs SET cursor_reference=?,shipment_count=shipment_count+?,attempts=0,owner=NULL,lease_until=0,last_error=NULL WHERE ${guard}`,
          shipments.at(-1).reference, shipments.length, ...guarded).run();
      } else {
        const reason = job.shipment_count + shipments.length ? 'schema_unverified' : 'no_known_shipments';
        const results = await database.batch([
          sql(`UPDATE courier_webhook_inbox SET processing_status='review_required',review_reason=?,reconciled_at=datetime('now')
            WHERE merchant_key=? AND product_key=? AND environment=? AND id>? AND id<=? AND ${exists}`, reason, ...scope, job.completed_id, job.target_id, ...guarded),
          sql(`UPDATE courier_reconciliation_jobs SET completed_id=target_id,target_id=NULL,cursor_reference='',shipment_count=0,attempts=0,
            owner=NULL,lease_until=0,next_attempt_at=0,last_error=NULL WHERE ${guard}`, ...guarded),
        ]);
        if (results[1]?.meta?.changes === 1) { summary.completed++; summary.reviewRequired++; }
      }
    } catch {
      // No raw provider errors or payload data are recorded in diagnostics.
      const exhausted = job.attempts + 1 >= maxAttempts;
      const statements = [];
      if (exhausted) statements.push(sql(`UPDATE courier_webhook_inbox SET processing_status='review_required',review_reason='retries_exhausted'
        WHERE merchant_key=? AND product_key=? AND environment=? AND id>? AND id<=? AND ${exists}`, ...scope, job.completed_id, job.target_id, ...guarded));
      statements.push(sql(exhausted
        ? `UPDATE courier_reconciliation_jobs SET completed_id=target_id,target_id=NULL,cursor_reference='',shipment_count=0,attempts=0,owner=NULL,lease_until=0,next_attempt_at=0,last_error='retries_exhausted' WHERE ${guard}`
        : `UPDATE courier_reconciliation_jobs SET attempts=attempts+1,next_attempt_at=${NOW}+${Math.min(300000, 1000 * 2 ** job.attempts)},owner=NULL,lease_until=0,last_error='tracking_refresh_failed' WHERE ${guard}`, ...guarded));
      const result = await database.batch(statements);
      if (result.at(-1)?.meta?.changes === 1) { if (exhausted) summary.reviewRequired++; else summary.retried++; }
    }
  }
  return summary;
}
