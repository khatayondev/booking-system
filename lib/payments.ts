import { env } from "./env";

export interface InitializePaystackOptions {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: Array<"card" | "mobile_money">;
}

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/**
 * Initialize a Paystack checkout session for Mobile Money (MTN, Telecel/Vodafone, AT) and Cards.
 */
export async function initializePaystackTransaction(
  options: InitializePaystackOptions
): Promise<PaystackInitResponse> {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: options.email,
      amount: options.amountPesewas, // Paystack Ghana processes integer pesewas
      currency: "GHS",
      reference: options.reference,
      callback_url: options.callbackUrl || `${env.APP_URL}/booking/confirmation?ref=${options.reference}`,
      channels: options.channels || ["card", "mobile_money"],
      metadata: options.metadata,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(`Paystack initialization failed: ${data.message || "Unknown error"}`);
  }

  return data.data;
}

/**
 * Verify Paystack transaction reference after payment completion.
 */
export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(`Paystack verification failed: ${data.message || "Unknown error"}`);
  }

  return data.data;
}
