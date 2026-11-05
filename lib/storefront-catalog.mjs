/** Display only. Order totals must still be calculated and validated by the API. */
export function modelPriceMinor(catalog, model) {
  if (!catalog || !Array.isArray(catalog.products)) return null;
  const matches = catalog.products.filter(product => product?.active === true && product?.metadata?.model === model);
  if (matches.length !== 1) return null;
  const product = matches[0];
  if (product.currency !== 'BDT' || !Number.isSafeInteger(product.unit_price_minor) || product.unit_price_minor < 0 || typeof product.sku !== 'string' || !product.sku.trim() || !Number.isSafeInteger(product.version) || product.version < 1) return null;
  return product.unit_price_minor;
}

export function formatBdtMinor(value) {
  if (!Number.isSafeInteger(value) || value < 0) return '—';
  const minor = BigInt(value);
  const whole = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(minor / 100n);
  const remainder = minor % 100n;
  const fraction = remainder === 0n ? '' : `.${String(remainder).padStart(2, '0').replace(/0$/, '')}`;
  return `৳ ${whole}${fraction}`;
}
