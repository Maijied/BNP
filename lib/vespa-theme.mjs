/** Vespa appearance only. Never share BNP's preference or customer draft. */
export const VESPA_THEME_KEY = 'vespa.storefront.theme.v1';
export const VESPA_DEFAULT_THEME = 'light';
export function resolveVespaTheme(value) {
  return value === 'dark' ? 'dark' : VESPA_DEFAULT_THEME;
}
export function readVespaTheme(storage) {
  try { return resolveVespaTheme(storage?.getItem(VESPA_THEME_KEY)); }
  catch { return VESPA_DEFAULT_THEME; }
}
export function saveVespaTheme(storage, value) {
  try {
    if (!storage) return false;
    const next = resolveVespaTheme(value);
    storage.setItem(VESPA_THEME_KEY, next);
    return storage.getItem(VESPA_THEME_KEY) === next;
  } catch { return false; }
}
