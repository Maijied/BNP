import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { VESPA_THEME_KEY, VESPA_DEFAULT_THEME, resolveVespaTheme, readVespaTheme, saveVespaTheme } from '../lib/vespa-theme.mjs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = file => readFileSync(new URL('../'+file, import.meta.url),'utf8');

test('Vespa uses the current light shop by default and only accepts light or dark', () => {
  assert.equal(VESPA_DEFAULT_THEME, 'light');
  assert.equal(resolveVespaTheme('dark'), 'dark');
  for (const value of [undefined, null, '', 'classic', 'motorsport', '<script>', {}, 1]) assert.equal(resolveVespaTheme(value), 'light');
});
test('Vespa persistence is independent of BNP and never writes order information', () => {
  const data = new Map([['bnp.storefront.theme.v1','classic'], ['pending-order','unchanged']]);
  const storage = {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  assert.equal(saveVespaTheme(storage,'dark'),true);
  assert.equal(readVespaTheme(storage),'dark');
  assert.equal(data.get(VESPA_THEME_KEY),'dark');
  assert.equal(data.get('bnp.storefront.theme.v1'),'classic');
  assert.equal(data.get('pending-order'),'unchanged');
  assert.equal(saveVespaTheme(storage,'light'),true);
  assert.equal(readVespaTheme(storage),'light');
});
test('denied, missing, corrupt or silently lost appearance storage never blocks the shop', () => {
  const denied = {getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  assert.equal(readVespaTheme(denied),'light');
  assert.equal(readVespaTheme(undefined),'light');
  assert.equal(readVespaTheme({getItem:()=>'{bad'}),'light');
  assert.equal(saveVespaTheme(denied,'dark'),false);
  assert.equal(saveVespaTheme(undefined,'dark'),false);
  assert.equal(saveVespaTheme({setItem(){},getItem:()=>null},'dark'),false);
});

function rootHarness({stored = null, denied = false} = {}) {
  const hooks=[];let index=0,dirty=true,tree,effects=[];
  const listeners=new Map(),data=new Map(stored === null?[]:[[VESPA_THEME_KEY,stored]]);
  const storage={getItem:key=>{if(denied)throw Error('denied');return data.get(key)??null},setItem:(key,value)=>{if(denied)throw Error('denied');data.set(key,value)}};
  const react={
    useState(initial){const i=index++;if(!(i in hooks))hooks[i]={value:initial};return [hooks[i].value,value=>{if(value!==hooks[i].value){hooks[i].value=value;dirty=true}}]},
    useEffect(callback,deps){const i=index++;if(!(i in hooks)){hooks[i]={deps};effects.push(callback)}}
  };
  const module={exports:{}};
  const localRequire=name=>{
    if(name==='react')return react;
    if(name==='@/components/ExperienceMotion')return {ExperienceMotion:'experience-motion'};
    if(name==='@/components/VintageOrderStudio')return {__esModule:true,default:'shared-vintage-studio'};
    if(name==='@/lib/vespa-theme.mjs')return {VESPA_THEME_KEY,resolveVespaTheme,readVespaTheme,saveVespaTheme};
    return require(name);
  };
  const code=ts.transpileModule(read('components/VespaExperience.tsx'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,window:{localStorage:storage,addEventListener:(type,callback)=>listeners.set(type,callback),removeEventListener:type=>listeners.delete(type)}});
  function render(){let turns=0;do{assert.ok(++turns<20);dirty=false;index=0;effects=[];tree=module.exports.default();effects.forEach(effect=>effect())}while(dirty);return tree}
  function nodes(node=render(),path='root',out=[]){if(Array.isArray(node)){node.forEach((child,i)=>nodes(child,path+'.'+i,out));return out}if(node&&typeof node==='object'&&node.props){out.push({node,path});if(node.props.children!==undefined)nodes(node.props.children,path+'.children',out)}return out}
  const api={render,nodes,data,listeners,select(value){nodes().find(({node})=>node.type==='input'&&node.props.value===value).node.props.onChange();render()}};
  render();return api;
}
test('changing themes preserves the exact stable, unkeyed studio location and catalog component', () => {
  const h=rootHarness();
  const original=h.nodes().filter(({node})=>node.type==='shared-vintage-studio');
  assert.equal(original.length,1);assert.equal(original[0].node.key,null);
  for(const theme of ['dark','light','dark','light']){
    h.select(theme);
    assert.equal(h.render().props['data-vespa-theme'],theme);
    const studio=h.nodes().filter(({node})=>node.type==='shared-vintage-studio');
    assert.equal(studio.length,1);assert.equal(studio[0].path,original[0].path);assert.equal(studio[0].node.key,null);
    assert.equal(h.nodes().filter(({node})=>node.type==='input'&&node.props.name==='vespa-appearance'&&node.props.checked).length,1);
  }
});
test('saved theme, cross-tab changes and storage denial leave accessible appearance controls usable', () => {
  const h=rootHarness({stored:'dark'});assert.equal(h.render().props['data-vespa-theme'],'dark');
  h.listeners.get('storage')({key:'bnp.storefront.theme.v1',newValue:'classic'});assert.equal(h.render().props['data-vespa-theme'],'dark');
  h.listeners.get('storage')({key:VESPA_THEME_KEY,newValue:'light'});assert.equal(h.render().props['data-vespa-theme'],'light');
  h.listeners.get('storage')({key:null,newValue:null});assert.equal(h.render().props['data-vespa-theme'],'light');
  const blocked=rootHarness({denied:true});blocked.select('dark');assert.equal(blocked.render().props['data-vespa-theme'],'dark');
  const status=blocked.nodes().find(({node})=>node.props.id==='vespa-theme-note').node;
  assert.match(status.props.children,/storage is unavailable/);assert.equal(status.props.role,'status');
});
test('both themes retain the original story, same-shop collection actions and honest live lettering', () => {
  const source=read('components/VespaExperience.tsx');
  for(const phrase of ['OLD SOUL.','ENERGY.','Your <em>signature.','SOME THINGS','TO BLEND IN.','own-scooter-front.jpg','own-scooter-wheel.jpg','own-scooter-speedometer.jpg','own-vespa.jpg'])assert.ok(source.includes(phrase),phrase);
  assert.equal((source.match(/<VintageOrderStudio\s*\/>/g)||[]).length,1);
  assert.match(source,/Explore the nameplates/);assert.match(source,/href="#collection"/);assert.match(source,/href="#atelier"/);
  const studio=read('components/VintageOrderStudio.tsx');
  assert.match(studio,/htmlFor="vt-display-text" aria-live="polite"/);assert.match(studio,/Decorative illustration, not a physical proof/);
  assert.match(studio,/payment_capture === false/);assert.match(studio,/paid_dispatch === false/);
  assert.match(read('app/vintage.css'),/@media\(prefers-reduced-motion:reduce\).*vt-live-preview/s);
});
