import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const read = path => readFile(new URL('../'+path, import.meta.url), 'utf8');
test('two shops have distinct entry points and their own shopping journeys', async () => {
  assert.match(await read('app/page.tsx'),/VespaExperience/);
  assert.match(await read('app/vespa/page.tsx'),/VespaExperience/);
  assert.match(await read('app/bnp/page.tsx'),/BNPStorefront/);
  const vintage = await read('components/VespaExperience.tsx');
  assert.match(vintage,/VintageOrderStudio/);
  assert.doesNotMatch(vintage,/StorefrontThemeProvider|PlateDesigner|BNPOrderStudio/);
  assert.match(await read('components/BNPStorefront.tsx'),/BNPOrderStudio/);
});
test('BNP retains its own appearance control and shared state instead of switching shops', async () => {
  const bnp = await read('components/BNPStorefront.tsx');
  assert.match(bnp,/<StorefrontProvider><StorefrontThemeProvider defaultTheme="motorsport">/);
  assert.match(bnp,/value="classic"/); assert.match(bnp,/value="motorsport"/);
  assert.match(bnp,/theme === "classic" && <div className="bn-retained-classic"><Hero/);
  assert.doesNotMatch(bnp,/<BNPOrderStudio[^>]*key=/);
  assert.match(bnp,/useState<Language>\("bn"\)/);
});
test('each route keeps its own metadata and explicit inter-store links', async () => {
  assert.match(await read('components/VespaExperience.tsx'),/href="\/bnp"/);
  assert.match(await read('components/BNPStorefront.tsx'),/href="\/vespa"/);
  for(const path of ['app/payment/success/page.tsx','app/payment/failed/page.tsx','app/admin/login/page.tsx']) assert.match(await read(path),/href="\/bnp"/);
  assert.match(await read('app/layout.tsx'),/Vintage plate atelier/);
  assert.match(await read('app/bnp/page.tsx'),/BNP \| Your ride/);
  assert.match(await read('app/vespa/page.tsx'),/openGraph:/);
});
test('original BNP photo bytes remain unchanged and cinematic tunnel image is primary', async () => {
  const expected = JSON.parse(await read('docs/bnp-photo-provenance.json'));
  for(const asset of expected) {
    const bytes = await readFile(new URL('../public/images/bnp/'+asset.destination, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.destination);
  }
  assert.match(await read('components/BNPStorefront.tsx'),/bn-hero-rider.*rider-night\.jpg/);
});
test('recovered cinematic asset has exact provenance, poster, visibility and reduced-motion controls', async () => {
  const bytes=await readFile(new URL('../public/media/bnp-material-original.mp4',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'6f54e4685c8aee9cb781a5a7c8a5f4b8012defe3c3404acfdfcc166704401168');
  const source=await read('components/CinematicMaterial.tsx');
  assert.match(source,/!reduced && <video/); assert.match(source,/muted playsInline preload="none"/);
  assert.match(source,/poster="\/media\/bnp-material-poster.png"/); assert.match(source,/media.pause\(\)/);
  assert.match(source,/IntersectionObserver/); assert.match(source,/onError=/); assert.doesNotMatch(source,/loop[ =>]/);
});
test('pending shop requests lock external selection and never display newly repriced totals', async () => {
  const bnp=await read('components/BNPStorefront.tsx'), studio=await read('components/BNPOrderStudio.tsx');
  assert.match(bnp,/if \(shopLocked\) return/); assert.match(bnp,/key={m} disabled={shopLocked}/);
  assert.match(bnp,/onLockChange={setShopLocked}/); assert.match(studio,/onLockChange\(locked\)/);
  assert.match(studio,/money\(uncertain \? null : total\)/);
  assert.match(studio,/JSON.stringify\(pending.current\)/);
  assert.match(studio,/if \(lock.current \|\| conflict \|\| receipt \|\| storageBlocked\) return/);
});
test('four-stage guided studio preserves canonical text, exact total and truthful tracking', async () => {
  const source=await read('components/BNPOrderStudio.tsx');
  assert.match(source,/registration_bangla: canonical/); assert.match(source,/BigInt\(Number.MAX_SAFE_INTEGER\)/);
  assert.match(source,/bn-sticky-total/); assert.match(source,/expected_shipping_version/);
  assert.match(source,/No payment was collected/); assert.doesNotMatch(source,/checkoutUrl|window.location/);
  assert.match(await read('components/BNPStorefront.tsx'),/Courier tracking is not available/);
  assert.doesNotMatch(await read('components/BNPStorefront.tsx'), /setTrackingNotice|Enter your reference/);
});
test('hero depth is decorative, shares original photo geometry and leaves navigation above it', async () => {
  const source=await read('components/BNPStorefront.tsx'), css=await read('app/bnp.css');
  assert.match(source,/bn-helmet-depth" aria-hidden="true"/);
  assert.match(source,/heroAtTop/);
  assert.match(source,/Switch to English/);assert.match(source,/Switch to Bangla/);
  assert.match(source,/আপনার স্বাক্ষর/);
  assert.match(css,/\.bn-helmet-depth\{[^}]*pointer-events:none/);
  assert.match(css,/\.bn-nav\{[^}]*z-index:2/);
  assert.match(css,/\.bn-helmet-depth img,[^{]+bn-hero-rider img\{[^}]*var\(--bn-scene-top\)/);
  assert.match(source,/BNP × LORAPOK LABS/);
});
test('signature marquee stays directly below hero and wraps its full paused message', async () => {
  const source=await read('components/BNPStorefront.tsx'), css=await read('app/bnp.css');
  assert.match(source, /bn-hero-credit[^]*?<\/section>\s*<section className="bn-signature-ticker"/);
  assert.match(source, /YOUR RIDE[^]*?YOUR SIGNATURE[^]*?YOUR BNP[^]*?BNP × LORAPOK LABS/);
  assert.match(css, /\[data-motion=paused\] \.bn-signature-group\{width:100%;min-width:0\}/);
  assert.match(css, /\[data-motion=paused\] \.bn-signature-group>span\{width:100%;white-space:normal/);
});
test('existing partnership wording links accessibly without adding visible domain text', async () => {
  const source=await read('components/BNPStorefront.tsx'), css=await read('app/bnp.css');
  assert.match(source, /<a href="https:\/\/lorapok\.tech\/" tabIndex=\{group === 0 && copy === 0 \? 0 : -1\}>BNP × LORAPOK LABS<\/a>/);
  assert.match(source, /aria-hidden=\{group !== 0 \|\| copy !== 0\}/);
  assert.doesNotMatch(source, /className="bn-signature-window" aria-hidden="true"/);
  assert.doesNotMatch(source, />LORAPOK\.TECH</);
  assert.match(css, /\.bn-signature-ticker:focus-within \.bn-signature-group>span\{width:100%;white-space:normal/);
  assert.match(css, /\.bn-signature-ticker:focus-within \.bn-signature-track\{animation-play-state:paused\}/);
});
