/** Deliberate non-payment port. No flag may enable capture or paid dispatch. */
export const paymentCapabilities=Object.freeze({payment_capture:false,paid_dispatch:false});
export function createPaymentPort() {
 const deferred=async()=>{const error=new Error('Payment gateway integration is deferred.'); error.code='gateway_deferred'; error.status=503; throw error;};
 return Object.freeze({capabilities:paymentCapabilities,createPayment:deferred,capture:deferred,verify:deferred,refund:deferred,dispatchPaid:deferred});
}
