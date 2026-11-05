/** Only an explicitly configured HTTPS origin can establish the public site identity. */
export function configuredSiteOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return undefined;
    return url;
  } catch {
    return undefined;
  }
}
