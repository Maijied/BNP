import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../functions/_lib/admin-auth.js", import.meta.url), "utf8");
const auth = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const env = {
  ADMIN_EMAIL: "admin@example.test",
  ADMIN_PASSWORD: "this-is-a-long-unique-test-passphrase",
  ADMIN_SESSION_SECRET: "123456789abcdefghi123456789abcdefghi",
};

test("unconfigured environment denies admin access", async () => {
  assert.equal(auth.requireConfiguration({}), false);
  const request = new Request("https://bnp.shop/api/admin/orders");
  assert.equal(await auth.isAdmin(request, {}), false);
  await assert.rejects(() => auth.createSession({}), /not configured/);
});

test("signed session authorizes only correct configured administrator", async () => {
  const token = await auth.createSession(env);
  const request = new Request("https://bnp.shop/api/admin/orders", {headers: { Cookie: `bnp_admin_session=${token}` }});
  assert.equal(await auth.isAdmin(request, env), true);
  assert.equal(await auth.isAdmin(request, {...env, ADMIN_SESSION_SECRET: "different-123456789abcdefghi123456789abcdefghi"}), false);
});

test("forged cookie is rejected", async () => {
  const token = await auth.createSession(env);
  const parts = token.split(".");
  parts[0] = parts[0].replace(/^./, parts[0][0] === "a" ? "b" : "a");
  const request = new Request("https://bnp.shop/api/admin/orders", {headers: {Cookie: `bnp_admin_session=${parts.join(".")}`}});
  assert.equal(await auth.isAdmin(request, env), false);
});

test("only same-origin browser mutations are accepted", () => {
  const url = "https://bnp.shop/api/admin/login";
  assert.equal(auth.isSameOrigin(new Request(url, {headers: {Origin: "https://bnp.shop"}})), true);
  assert.equal(auth.isSameOrigin(new Request(url, {headers: {Origin: "https://evil.example"}})), false);
  assert.equal(auth.isSameOrigin(new Request(url)), false);
});

test("session cookie is HttpOnly Secure Strict and time bounded", async () => {
  const cookie = auth.sessionCookie(await auth.createSession(env));
  for (const required of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=28800"]) {
    assert.ok(cookie.includes(required), required);
  }
  assert.ok(auth.clearSessionCookie().includes("Max-Age=0"));
});

