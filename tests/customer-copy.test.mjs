import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Classic Carbon copy describes a design preview without unsupported product claims', async () => {
  const source = await read('components/Hero.tsx');
  assert.match(source, /Engineered to Stand Out/);
  assert.match(source, /Precision in Every Detail/);
  assert.match(source, /Personalized design\. Distinctive detail\./);
  assert.match(source, /Illustrative dimensions/);
  assert.match(source, /Confirm the final material, fit and current requirements before manufacturing/);
  assert.match(source, /Not available in this preview/);
  assert.doesNotMatch(source, /Premium Quality\. Durable\.|Model-specific sizing|Live Specimen/);
});

test('Vespa customer copy retains brand and sample limits without internal infrastructure jargon', async () => {
  const source = await read('components/VespaExperience.tsx');
  assert.match(source, /OLD SOUL\./);
  assert.match(source, /Your <em>signature\./);
  assert.match(source, /Not affiliated with Vespa or Piaggio/);
  assert.match(source, /Materials, dimensions, mounting, model fit and road-use suitability are not yet verified/);
  assert.match(source, /sample requests are recorded without payment/);
  assert.doesNotMatch(source, /parent catalog, order and courier-service APIs|Production domains and shop scopes|not a borrowed idea/);
});

test('sample confirmation copy remains truthful and is never a purchase confirmation', async () => {
  const source = await read('components/VintageOrderStudio.tsx');
  assert.match(source, /Your sample request<br \/><em>has been recorded\./);
  assert.match(source, /No money was collected and no production or delivery was started/);
  assert.match(source, /not a purchase confirmation or production approval/);
  assert.match(source, /Sample pricing only\. Final prices are not confirmed/);
  assert.doesNotMatch(source, /A safe first step|Server-confirmed sample total|A configured sample catalog is required/);
});

test('shop descriptions explain the customer experience rather than internal API architecture', async () => {
  for (const path of ['app/layout.tsx', 'app/bnp/page.tsx']) {
    const source = await read(path);
    assert.doesNotMatch(source, /parent-system preview|dedicated client of the Lorapok Labs parent API/);
    assert.match(source, /no live payments|Online payment is not available/);
  }
});
