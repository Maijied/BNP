// Convert a provider decimal to integer BDT minor units without binary multiplication
// or rounding. Unsupported precision/unsafe magnitudes fail closed.
export function bdtMinor(value) {
  if(typeof value!=='number' || !Number.isFinite(value) || value<0)throw new Error('INVALID_PROVIDER_MONEY');
  const decimal=String(value);if(!/^\d+(?:\.\d{1,2})?$/.test(decimal))throw new Error('UNSUPPORTED_PROVIDER_MONEY_PRECISION');
  const [whole,fraction='']=decimal.split('.');const amount=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
  if(amount>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('UNSAFE_PROVIDER_MONEY');return Number(amount);
}
