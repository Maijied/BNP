// Fail closed: a checkout URL is not a durable order or verified payment.
// Re-enable only with transactional D1 intake and the real bridge settlement contract.
// This route must not call a payment provider while settlement is unavailable.
export async function onRequestPost() {
  return new Response(JSON.stringify({ error: "Secure checkout is temporarily unavailable. No payment was initiated." }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
