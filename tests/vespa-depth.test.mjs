import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../components/VespaExperience.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/vintage.css', import.meta.url), 'utf8');
function portraitHarness({ paused = false, reduced = false } = {}) {
  const properties = new Map();
  const element = { closest: () => paused ? {} : null, getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 650 }), style: { setProperty: (key, value) => properties.set(key, value) } };
  const module = { exports: {} };
  const code = ts.transpileModule(source + '\nexports.move = moveOwnerPortrait; exports.reset = resetOwnerPortrait;', { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name.startsWith('@/') ? {} : require(name), window: { matchMedia: () => ({ matches: reduced }) } });
  return { properties, move: (x, y, pointerType = 'mouse') => module.exports.move({ currentTarget: element, clientX: x, clientY: y, pointerType }), reset: () => module.exports.reset({ currentTarget: element }) };
}
test('both Vespa themes use the exact same owner-photo depth component', () => {
  assert.equal((source.match(/<OwnerScooterPortrait\s*\/>/g) || []).length, 2);
  const portrait = source.slice(source.indexOf('function OwnerScooterPortrait'), source.indexOf('export default function'));
  assert.match(portrait, /src="\/images\/themes\/own-vespa.jpg"/);
  assert.match(portrait, /href="\/images\/themes\/own-vespa.jpg"/);
  assert.match(portrait, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(portrait, /generated_images|cutout|webgl|canvas|rotate.*360/i);
  assert.match(css, /aspect-ratio:1152\/1500/);
  assert.match(css, /object-position:center bottom/);
});
test('photographic depth remains shallow, bounded and resets after pointer leave', () => {
  const h = portraitHarness();
  h.move(10000, -10000);
  assert.equal(h.properties.get('--portrait-rotate-x'), '1.25deg');
  assert.equal(h.properties.get('--portrait-rotate-y'), '2.00deg');
  assert.equal(h.properties.get('--portrait-light-x'), '70%');
  h.reset();
  assert.equal(h.properties.get('--portrait-rotate-x'), '0deg');
  assert.equal(h.properties.get('--portrait-rotate-y'), '0deg');
  assert.equal(h.properties.get('--portrait-light-x'), '50%');
});
test('touch, reduced motion and Pause motion never drive pointer parallax', () => {
  for (const options of [{ paused: true }, { reduced: true }]) {
    const h = portraitHarness(options); h.move(500, 0); assert.equal(h.properties.size, 0);
  }
  const h = portraitHarness(); h.move(500, 0, 'touch'); assert.equal(h.properties.size, 0);
  assert.match(css, /\[data-motion="paused"\] \.vespa-owner-plane\{transform:none!important/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.vespa-owner-plane\{transform:none!important/);
  assert.match(css, /@media\(hover:none\),\(pointer:coarse\)\{\.vespa-owner-plane\{transform:none!important/);
});
