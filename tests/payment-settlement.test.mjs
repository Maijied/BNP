import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source=await readFile(new URL("../functions/_lib/payment-settlement.js",import.meta.url),"utf8");
const {validateVerifiedEvent,settleAuthenticatedEvent}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const event={eventId:"evt_123456789",reference:"BNP-20261102-ABCDEF-A1",sessionId:"sess_123456",currency:"BDT",amountBdt:380,status:"paid"};
test("rejects wrong currency, invalid amount and unsupported status",()=>{
  for(const patch of [{currency:"USD"},{amountBdt:0},{amountBdt:380.5},{status:"success"},{eventId:"x"}])
    assert.throws(()=>validateVerifiedEvent({...event,...patch}));
});
test("rejects missing D1",async()=>{
  await assert.rejects(()=>settleAuthenticatedEvent(null,event));
});
test("rejects wrong amount before writing",async()=>{
  const db={prepare(){return {bind(){return {first:async()=>({id:"a",order_id:"o",amount_bdt:450,status:"pending",bridge_session_id:"sess_123456",payment_status:"unpaid"})}}}},batch(){throw Error("should not write")}};
  await assert.rejects(()=>settleAuthenticatedEvent(db,event),/amount mismatch/);
});
test("rejects mismatched bridge session",async()=>{
  const db={prepare(){return {bind(){return {first:async()=>({id:"a",order_id:"o",amount_bdt:380,status:"pending",bridge_session_id:"other",payment_status:"unpaid"})}}}},batch(){throw Error("should not write")}};
  await assert.rejects(()=>settleAuthenticatedEvent(db,event),/session mismatch/);
});
