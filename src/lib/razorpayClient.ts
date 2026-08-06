import Razorpay from "razorpay";

export function getRazorpayForState(keyId: string, keySecret: string) {
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

type RazorpayOrderPayments = {
  items?: Array<{ id?: string; status?: string; amount?: number }>;
};

/**
 * Ask Razorpay's API directly (authenticated with our own account key/secret) whether
 * an order has a captured (or authorized) payment. Used by admin reconcile and by the
 * webhook handler's invalid-signature fallback — both never trust the caller's payload
 * for this decision, only Razorpay's authoritative response for the given `orderId`.
 */
export async function fetchCapturedPaymentForOrder(
  rz: ReturnType<typeof getRazorpayForState>,
  orderId: string
) {
  const orderPayments = (await rz.orders.fetchPayments(orderId)) as RazorpayOrderPayments;
  const items = orderPayments.items ?? [];
  return (
    items.find((p) => p.status === "captured") ??
    items.find((p) => p.status === "authorized") ??
    null
  );
}
