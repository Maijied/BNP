// Synthetic samples for the loopback mock only. These are not production catalog,
// materials/fit guarantees, brand choices or approved commercial prices.
export const vintageDemoProducts = [
  ['cream-enamel', 'DEMO Cream enamel decorative nameplate', 125000],
  ['charcoal-brass', 'DEMO Charcoal brass decorative nameplate', 145000],
  ['brushed-aluminium', 'DEMO Brushed aluminium decorative nameplate', 135000],
  ['oxblood-ivory', 'DEMO Oxblood ivory decorative nameplate', 155000],
].map(([sku, title, unit_price_minor]) => ({
  sku, title, unit_price_minor, currency: 'BDT', active: true,
  kind: 'decorative_nameplate',
  metadata: {
    customization_schema: 'decorative-display-text/v1', demo: true,
    pricing_status: 'sample', fit_status: 'unconfirmed',
    catalog_status: 'synthetic_sample', finish_key: sku,
  },
}));
export const vintageDemoShipping = {
  code: 'demo', label: 'DEMO sample delivery estimate; address verification required',
  price_minor: 6000, active: true,
};
