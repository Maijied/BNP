// Tenant-bound ledger. An unknown/submitting row is never automatically released.
export function createOperationStore(db) {
  const params=(identity,kind,reference)=>[identity.scope.merchant,identity.scope.product,identity.environment,kind,reference];
  return {
    async get(identity,kind,reference) {
      return db.prepare(`SELECT reference,intent_id,state,consignment_id,provider_status,normalized_status,status_checked_at FROM courier_operations
        WHERE merchant_key=? AND product_key=? AND environment=? AND kind=? AND reference=?`).bind(...params(identity,kind,reference)).first();
    },
    async claim(identity,kind,reference,intentId,hash,authorizationOrderId=null) {
      const r=await db.prepare(`INSERT INTO courier_operations(merchant_key,product_key,environment,kind,reference,intent_id,request_hash,authorization_order_id,state)
        VALUES(?,?,?,?,?,?,?,?,'submitting') ON CONFLICT DO NOTHING`).bind(...params(identity,kind,reference),intentId,hash,authorizationOrderId).run();
      return r.meta?.changes===1;
    },
    async confirm(identity,kind,reference,result) {
      const r=await db.prepare(`UPDATE courier_operations SET state='confirmed',consignment_id=?,provider_status=?,normalized_status=?,updated_at=datetime('now')
        WHERE merchant_key=? AND product_key=? AND environment=? AND kind=? AND reference=? AND state='submitting'`)
        .bind(result.consignment_id||null,result.provider_status||null,result.normalized_status||null,...params(identity,kind,reference)).run();
      if(r.meta?.changes!==1)throw new Error('Operation ownership changed');
    },
    async unknown(identity,kind,reference) {
      await db.prepare(`UPDATE courier_operations SET state='unknown',updated_at=datetime('now') WHERE merchant_key=? AND product_key=? AND environment=? AND kind=? AND reference=? AND state='submitting'`).bind(...params(identity,kind,reference)).run();
    },
    async status(identity,reference,consignment,status,normalized) {
      const r=await db.prepare(`UPDATE courier_operations SET provider_status=?,normalized_status=?,status_checked_at=datetime('now'),updated_at=datetime('now')
        WHERE merchant_key=? AND product_key=? AND environment=? AND kind='shipment' AND reference=? AND state='confirmed' AND consignment_id=?`)
        .bind(status,normalized,identity.scope.merchant,identity.scope.product,identity.environment,reference,consignment).run();
      if(r.meta?.changes!==1)throw new Error('Operation ownership changed');
    },
  };
}
