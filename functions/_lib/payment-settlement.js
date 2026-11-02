// BNP payment settlement: trusted internal function, not a public endpoint.
// LoraHost webhook field names and signature contract must be verified against
// the authenticated partner documentation before this module is wired to a route.
export class SettlementError extends Error {
  constructor(message) { super(message); this.name = "SettlementError"; }
}
const statuses = new Set(["paid", "failed", "refunded"]);
export function validateVerifiedEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new SettlementError("Invalid event");
  const { eventId, reference, sessionId, currency, amountBdt, status } = event;
  if (typeof eventId !== "string" || eventId.length < 8 || eventId.length > 200) throw new SettlementError("Invalid event ID");
  if (typeof reference !== "string" || reference.length < 8 || reference.length > 200) throw new SettlementError("Invalid reference");
  if (typeof sessionId !== "string" || sessionId.length < 4 || sessionId.length > 200) throw new SettlementError("Invalid session");
  if (currency !== "BDT") throw new SettlementError("Currency mismatch");
  if (!Number.isSafeInteger(amountBdt) || amountBdt <= 0) throw new SettlementError("Invalid amount");
  if (!statuses.has(status)) throw new SettlementError("Invalid status");
  return { eventId, reference, sessionId, currency, amountBdt, status };
}

// Input is an event that the calling boundary has already authenticated by
// verifying the exact bridge raw-body HMAC and any timestamp requirements.
// Never accept this function's event argument directly from an HTTP request.
export async function settleAuthenticatedEvent(db, event) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") throw new SettlementError("D1 binding required");
  const e = validateVerifiedEvent(event);
  const attempt = await db.prepare(
    "SELECT a.id,a.order_id,a.amount_bdt,a.status,a.bridge_session_id,o.payment_status FROM payment_attempts a JOIN orders o ON o.id=a.order_id WHERE a.bridge_reference=?"
  ).bind(e.reference).first();
  if (!attempt) throw new SettlementError("Unknown payment reference");
  if (attempt.amount_bdt !== e.amountBdt) throw new SettlementError("Payment amount mismatch");
  if (attempt.bridge_session_id && attempt.bridge_session_id !== e.sessionId) throw new SettlementError("Payment session mismatch");
  const existing = await db.prepare("SELECT id FROM payment_events WHERE bridge_event_id=?").bind(e.eventId).first();
  if (existing) return { outcome: "duplicate" };
  if (attempt.status === "paid" && e.status !== "refunded") throw new SettlementError("Paid attempt cannot transition to " + e.status);
  if (e.status === "refunded" && attempt.status !== "paid") throw new SettlementError("Refund requires a paid attempt");
  if (e.status === "paid" && !["initiated","pending"].includes(attempt.status)) throw new SettlementError("Invalid paid transition");
  if (e.status === "failed" && !["initiated","pending"].includes(attempt.status)) throw new SettlementError("Invalid failed transition");
  const id = crypto.randomUUID();
  const orderStatus = e.status === "paid" ? "paid" : e.status === "failed" ? "failed" : "refunded";
  // D1 batch is atomic, but concurrency correctness additionally requires
  // optimistic conditional writes and conflict handling in the integration.
  const results = await db.batch([
    db.prepare("INSERT INTO payment_events (id,bridge_event_id,attempt_id,event_type,verified_at) VALUES (?,?,?,?,datetime('now'))")
      .bind(id,e.eventId,attempt.id,e.status),
    db.prepare("UPDATE payment_attempts SET status=?,bridge_session_id=COALESCE(bridge_session_id,?),updated_at=datetime('now') WHERE id=? AND status=?")
      .bind(e.status,e.sessionId,attempt.id,attempt.status),
    db.prepare("UPDATE orders SET payment_status=?,updated_at=datetime('now') WHERE id=? AND payment_status=?")
      .bind(orderStatus,attempt.order_id,attempt.payment_status),
    db.prepare("INSERT INTO order_status_history (id,order_id,from_status,to_status,actor_type,reason) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),attempt.order_id,attempt.payment_status,orderStatus,"bridge","Authenticated LoraHost event " + e.eventId)
  ]);
  if (results.some(r => !r.success)) throw new SettlementError("Settlement transaction failed");
  // An event insert with an unsuccessful conditional update must not be treated
  // as settled. This guard is defense-in-depth, not a substitute for an atomic
  // compare-and-swap transaction at the database boundary.
  if (results[1]?.meta?.changes !== 1 || results[2]?.meta?.changes !== 1) {
    throw new SettlementError("Concurrent settlement conflict: manual reconciliation required");
  }
  return { outcome: "recorded", paymentStatus: orderStatus };
}
