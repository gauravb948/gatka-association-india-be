import Razorpay from "razorpay";

export function getRazorpayForState(keyId: string, keySecret: string) {
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
