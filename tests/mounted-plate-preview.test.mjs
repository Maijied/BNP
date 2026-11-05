import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(import.meta.dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
function load(file) {
  const module = { exports: {} };
  const localRequire = name => name.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : name === '@/lib/bengali' ? load('lib/bengali.ts') : require(name);
  const js = ts.transpileModule(source(file), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: localRequire });
  return module.exports;
}
const Preview = load('components/MountedPlatePreview.tsx').default;
const render = props => renderToStaticMarkup(React.createElement(Preview, props));

test('motorcycle preview places exact live Bengali text on the preserved bike photograph', () => {
  const html = render({ model: 'A', region: 'কুমিল্লা', letter: 'হ', digits: '119876' });
  assert.match(html, /data-preview-text="কুমিল্লা-হ ১১-৯৮৭৬"/);
  assert.match(html, /href="\/images\/bnp\/plate-fit-source.jpg"/);
  assert.match(html, /data-mounted-lettering="true"/);
  assert.match(html, /transform="matrix\(/);
  assert.match(html, /Visual mock-up, not a fit or compliance approval/);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, 'public/images/bnp/plate-fit-source.jpg'))).digest('hex'), '47ab136108306a1231d0c53b9f38503646ef9b1ba5cead23136211d39932d5ab');
});
test('two-line format uses the front scooter photograph and both entered text lines', () => {
  const html = render({ model: 'B', region: 'ঢাকা মেট্রো', letter: 'ল', digits: '654321' });
  assert.match(html, /own-scooter-front.jpg/);
  assert.match(html, />ঢাকা মেট্রো<\/tspan>/);
  assert.match(html, />ল-৬৫-৪৩২১<\/tspan>/);
});
test('decorative finish and lettering update independently of the untouched scooter photo', () => {
  for (const finish of ['cream', 'charcoal', 'silver', 'oxblood']) {
    const html = render({ variant: 'decorative', text: 'CAT CLUB', finish });
    assert.match(html, /data-preview-text="CAT CLUB"/);
    assert.match(html, /own-vespa.jpg/);
    assert.match(html, />CAT CLUB<\/tspan>/);
    assert.match(html, /Never a registration replacement/);
    assert.doesNotMatch(html, /actual-vespa.png/);
  }
  const html = render({ variant: 'decorative', text: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
test('mounted preview has explicit accessible view controls and no independent plate motion', () => {
  const html = render({});
  assert.match(html, /aria-label="Photo preview view"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /role="img" aria-label=/);
  assert.doesNotMatch(source('components/MountedPlatePreview.tsx'), /fetch\(|localStorage|sessionStorage|framer-motion|setInterval|requestAnimationFrame/);
  assert.match(source('components/MountedPlatePreview.module.css'), /prefers-reduced-motion:reduce/);
  assert.match(source('components/VintageOrderStudio.tsx'), /useState<"plate" \| "scooter">\("scooter"\)/);
});
