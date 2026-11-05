import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME, STOREFRONT_THEMES, THEME_STORAGE_KEY, resolveTheme, readSavedTheme, saveTheme } from '../lib/storefront-theme.mjs';

test('Classic Carbon remains the default and both themes are registered', () => {
  assert.equal(DEFAULT_THEME, 'classic');
  assert.deepEqual(STOREFRONT_THEMES.map(theme => theme.id), ['classic', 'motorsport']);
  assert.equal(Object.isFrozen(STOREFRONT_THEMES), true);
});
test('only known appearance values are accepted', () => {
  assert.equal(resolveTheme('motorsport'), 'motorsport');
  for (const value of [null, undefined, '', 'classic', 'unknown', '<script>', {}, 1]) assert.equal(resolveTheme(value), 'classic');
});
test('theme persistence writes only its namespaced appearance key', () => {
  const data = new Map([['order', 'keep-existing-order']]);
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  assert.equal(readSavedTheme(storage), 'classic');
  assert.equal(saveTheme(storage, 'motorsport'), true);
  assert.equal(readSavedTheme(storage), 'motorsport');
  assert.equal(data.get(THEME_STORAGE_KEY), 'motorsport');
  assert.equal(data.get('order'), 'keep-existing-order');
  assert.equal(saveTheme(storage, 'classic'), true);
  assert.equal(readSavedTheme(storage), 'classic');
});
test('missing, denied or corrupt storage safely falls back without throwing', () => {
  const blocked = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  assert.equal(readSavedTheme(blocked), 'classic');
  assert.equal(readSavedTheme(undefined), 'classic');
  assert.equal(readSavedTheme({ getItem: () => 'not-a-theme' }), 'classic');
  assert.equal(saveTheme(blocked, 'motorsport'), false);
  assert.equal(saveTheme(undefined, 'motorsport'), false);
});
