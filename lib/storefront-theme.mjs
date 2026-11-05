/** Storefront-only appearance. This never changes product, payment or admin state. */
export const THEME_STORAGE_KEY = 'bnp.storefront.theme.v1';
export const DEFAULT_THEME = 'classic';
export const STOREFRONT_THEMES = Object.freeze([
  Object.freeze({ id: 'classic', label: 'Classic Carbon' }),
  Object.freeze({ id: 'motorsport', label: 'Motorsport' }),
]);

export function resolveTheme(value) {
  return value === 'motorsport' ? 'motorsport' : DEFAULT_THEME;
}

export function readSavedTheme(storage) {
  try {
    return resolveTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(storage, value) {
  try {
    if (!storage) return false;
    storage.setItem(THEME_STORAGE_KEY, resolveTheme(value));
    return true;
  } catch {
    return false;
  }
}
