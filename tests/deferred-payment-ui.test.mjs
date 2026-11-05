import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);

test('legacy payment return never turns untrusted query values into payment evidence or an invoice', () => {
  const source = readFileSync(new URL('../app/payment/success/page.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {}; new Function('require', 'exports', compiled)(require, exports);
  const html = renderToStaticMarkup(React.createElement(exports.default, { searchParams: { order_number: 'UNTRUSTED-ORDER', trx_id: 'FORGED-TRANSACTION', method: 'verified', paid: 'true' } }));
  assert.match(html, /Payment confirmation unavailable/); assert.match(html, /cannot confirm a payment or issue a receipt/); assert.match(html, /requests are unpaid/); assert.match(html, /href="\/bnp"/);
  assert.doesNotMatch(html, /UNTRUSTED-ORDER|FORGED-TRANSACTION|BNP-SAMPLE|Payment Verified|Official Invoice|Total Paid|Print Invoice|LoraHost Secured/);
  assert.doesNotMatch(source, /useSearchParams|fetch\(|window\.print|wa\.me|useEffect/);
});

test('parent orders display Pathao readiness without inventing payment or changing shipment gates', () => {
  const source = readFileSync(new URL('../app/admin/orders/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /Pathao readiness/); assert.match(source, /booking is unavailable for these unpaid parent-service requests/);
  assert.match(source, /<PathaoShipmentPanel orderId=\{order.id\} orderStatus=\{order.status\}/);
  const panel = readFileSync(new URL('../components/PathaoShipmentPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /view\?\.enabled === true && view\?\.eligible === true/);
  const route = readFileSync(new URL('../functions/api/admin/orders/[id]/shipment.js', import.meta.url), 'utf8');
  assert.match(route, /shipment: null, eligible: false, enabled: false, reason: "payment_gateway_deferred"/);
  assert.match(route, /if \(!legacyCommerce\(context.env\)\) return json/);
});
