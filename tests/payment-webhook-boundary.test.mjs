import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// This test intentionally guards the existing fail-closed Cloudflare endpoint.
// It must be replaced with signed fixture tests before enabling settlement.
const source = await readFile(new URL("../functions/api/payment/webhook.js", import.meta.url), "utf8");
const { onRequestPost } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
test("unsigned webhook cannot acknowledge settlement", async () => {
  for (const body of ['{}', '{"status":"paid","reference":"BNP-FAKE"}', 'not-json']) {
    const response = await onRequestPost({request:new Request("https://bnp.shop/api/payment/webhook",{method:"POST",body})});
    assert.equal(response.status,503);
    assert.equal(response.headers.get("Cache-Control"),"no-store");
    assert.notEqual(response.status,200);
  }
});
