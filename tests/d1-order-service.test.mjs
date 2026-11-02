// Run with node --test tests/d1-order-service.test.mjs (Node >= 20).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../functions/_lib/orders.js", import.meta.url), "utf8");
const { normalizeOrder, createPendingOrder } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const valid = { name:"Test Rider",phone:"01712345678",district:"Dhaka",address:"52 Purana Paltan, Dhaka",reg_number_bangla:"ঢাকা মেট্রো-ল-১২-৩৪৫৬",model:"A",quantity:2,bracket:true };

test("server calculates price and ignores client supplied total",()=>{
  const order=normalizeOrder({...valid,total:1,price:1});
  assert.equal(order.subtotal,920);
  assert.equal(order.delivery,60);
  assert.equal(order.total,980);
});
test("rejects invalid quantities and model",()=>{
  for(const quantity of [-1,0,1.5,101,"oops"]) assert.throws(()=>normalizeOrder({...valid,quantity}));
  assert.throws(()=>normalizeOrder({...valid,model:"C"}));
});
test("rejects invalid phone and bracket",()=>{
  assert.throws(()=>normalizeOrder({...valid,phone:"123"}));
  assert.throws(()=>normalizeOrder({...valid,bracket:"false"}));
});
test("persists unpaid order, item, attempt and history atomically",async()=>{
  const executed=[];
  const db={
    prepare(sql){return {bind(...values){return {sql,values}}}},
    async batch(statements){executed.push(...statements);return statements.map(()=>({success:true}))}
  };
  const result=await createPendingOrder(db,valid);
  assert.equal(result.paymentStatus,"unpaid");
  assert.equal(result.totalBdt,980);
  assert.equal(executed.length,4);
  assert.match(executed[0].sql,/payment_status.*unpaid/);
  assert.match(executed[2].sql,/payment_attempts/);
});
test("requires D1 binding",async()=>{await assert.rejects(()=>createPendingOrder(null,valid))});
