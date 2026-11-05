import test from 'node:test';
import assert from 'node:assert/strict';
import { modelPriceMinor, formatBdtMinor } from '../lib/storefront-catalog.mjs';
const product = { sku: 'plate-a', version: 1, active: true, currency: 'BDT', unit_price_minor: 38000, metadata: { model: 'A' } };
test('catalog display uses exact API minor units and never invents fallback prices', () => {
  assert.equal(modelPriceMinor({ products: [product] }, 'A'), 38000);
  assert.equal(modelPriceMinor({ products: [product] }, 'B'), null);
  assert.equal(formatBdtMinor(38000), '৳ 380');
  assert.equal(formatBdtMinor(38025), '৳ 380.25');
  assert.equal(formatBdtMinor(null), '—');
});
test('inactive, ambiguous, unversioned and malformed product prices are unavailable', () => {
  for (const changes of [{ active: false }, { currency: 'USD' }, { unit_price_minor: -1 }, { unit_price_minor: 1.5 }, { unit_price_minor: '38000' }, { version: null }, { version: '1' }, { version: 0 }, { sku: '' }, { sku: {} }]) assert.equal(modelPriceMinor({ products: [{ ...product, ...changes }] }, 'A'), null);
  assert.equal(modelPriceMinor({ products: [product, product] }, 'A'), null);
  for (const catalog of [null, {}, { products: {} }]) assert.equal(modelPriceMinor(catalog, 'A'), null);
});
test('catalog display preserves minor units at safe-integer boundaries', () => {
  assert.equal(formatBdtMinor(Number.MAX_SAFE_INTEGER), '৳ 90,071,992,547,409.91');
  assert.equal(formatBdtMinor(Number.MAX_SAFE_INTEGER - 1), '৳ 90,071,992,547,409.9');
  assert.equal(formatBdtMinor(Number.MAX_SAFE_INTEGER - 90), '৳ 90,071,992,547,409.01');
  assert.equal(formatBdtMinor(1), '৳ 0.01');
  assert.equal(formatBdtMinor(0), '৳ 0');
  assert.equal(formatBdtMinor(Number.MAX_SAFE_INTEGER + 1), '—');
});
