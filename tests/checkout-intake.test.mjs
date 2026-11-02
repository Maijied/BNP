import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../functions/api/order.js", import.meta.url), "utf8");
// Replace the relative import in an isolated test module with a stub. The real
// order service is separately covered by d1-order-service.test.mjs.
const stub = `class OrderValidationError extends Error {}
async function createPendingOrder() { throw new Error("Unexpected DB write"); }`;
const isolated = source.replace(
  'import { createPendingOrder, OrderValidationError } from "../_lib/orders.js";', stub
);
const { onRequestPost } = await import("data:text/javascript;base64," + Buffer.from(isolated).toString("base64"));
const request = new Request("https://bnp.shop/api/order", { method:"POST",headers:{"Content-Type":"application/json"},body:"{}" });

test("missing database or credentials fail closed",async()=>{
  for (const env of [{}, { DB:{} }, {DB:{},LORA_BRIDGE_CLIENT_TOKEN:"x",LORA_BRIDGE_URL:"https://bridge.example"}]) {
    const response=await onRequestPost({request,env});
    assert.equal(response.status,503);
    assert.equal(response.headers.get("Cache-Control"),"no-store");
  }
});
test("rejects insecure or non-origin bridge URL before DB writes",async()=>{
  for (const bridge of ["http://bridge.example","https://bridge.example/path","javascript:alert(1)"]) {
    const response=await onRequestPost({request,env:{DB:{},LORA_BRIDGE_CLIENT_TOKEN:"x",LORA_BRIDGE_URL:bridge,BNP_PUBLIC_ORIGIN:"https://bnp.shop"}});
    assert.equal(response.status,503);
  }
});
