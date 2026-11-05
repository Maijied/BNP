// Proof is deliberately absent until verified payment settlement is implemented.
export const settlementPredicate = `o.payment_status = 'paid' AND EXISTS (
  SELECT 1 FROM payment_settlements s
  JOIN payment_attempts a ON a.id = s.attempt_id
  JOIN payment_events e ON e.id = s.event_id
  WHERE s.order_id = o.id AND a.order_id = o.id AND e.attempt_id = a.id
    AND a.status = 'paid' AND s.amount_bdt = o.total_bdt AND a.amount_bdt = o.total_bdt
    AND s.currency = o.currency AND s.bridge_reference = a.bridge_reference
    AND a.bridge_session_id IS NOT NULL AND length(trim(a.bridge_session_id)) > 0
    AND length(trim(s.verified_at)) > 0 AND length(trim(e.verified_at)) > 0
)`;
export const dispatchPredicate = `o.fulfillment_status = 'qc' AND ${settlementPredicate}`;
export async function readOrder(db, id) {
  return db.prepare(`SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_quantity,
    CASE WHEN ${dispatchPredicate} THEN 1 ELSE 0 END AS eligible FROM orders o WHERE o.id = ?`).bind(id).first();
}
export async function readShipment(db, id) {
  return db.prepare(`SELECT id, state, environment, consignment_id, provider_status, last_checked_at, created_at
    FROM courier_shipments WHERE order_id = ?`).bind(id).first();
}
export async function claimShipment(db, { id, orderId, config, input, requestHash, actor }) {
  // Predicate and unique order_id constraint participate in ONE SQL write. Multiple
  // isolates/clicks cannot both own the right to call the non-idempotent provider.
  return db.prepare(`INSERT INTO courier_shipments
    (id, order_id, environment, store_id, state, city_id, zone_id, area_id, item_weight, request_hash, requested_by)
    SELECT ?, o.id, ?, ?, 'submitting', ?, ?, ?, ?, ?, ? FROM orders o
    WHERE o.id = ? AND ${dispatchPredicate}
    ON CONFLICT(order_id) DO NOTHING`).bind(id, config.environment, config.storeId, input.city_id, input.zone_id,
      input.area_id, input.item_weight, requestHash, actor, orderId).run();
}
