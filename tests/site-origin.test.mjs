import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredSiteOrigin } from '../lib/site-origin.mjs';

test('no configured origin means no invented public site identity', () => {
  for (const value of [undefined, null, '', '   ', 'not-a-url']) assert.equal(configuredSiteOrigin(value), undefined);
});
test('public site identity requires a clean HTTPS origin', () => {
  for (const value of ['http://example.test', 'https://user:password@example.test', 'https://example.test/shop', 'https://example.test/?x=1', 'https://example.test/#x', 'javascript:alert(1)']) assert.equal(configuredSiteOrigin(value), undefined);
  assert.equal(configuredSiteOrigin('https://example.test').href, 'https://example.test/');
});
