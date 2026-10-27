import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  InitializePaymentOptions,
  InitializePaymentResult,
  VerifyPaymentResult,
  ChargeMobileMoneyOptions,
  ChargeMobileMoneyResult,
  SubmitOtpOptions,
  SubmitPinOptions,
  RefundPaymentOptions,
  RefundPaymentResult,
} from "./types";

export interface PaymentProvider {
  name: string;
  initialize(options: InitializePaymentOptions): Promise<InitializePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
  chargeMobileMoney(options: ChargeMobileMoneyOptions): Promise<ChargeMobileMoneyResult>;
  submitOtp(options: SubmitOtpOptions): Promise<ChargeMobileMoneyResult>;
  submitPin(options: SubmitPinOptions): Promise<ChargeMobileMoneyResult>;
  refund(options: RefundPaymentOptions): Promise<RefundPaymentResult>;
}

/**
 * Real Paystack Payment Provider using Server-Side Secret Key
 */
export class PaystackPaymentProvider implements PaymentProvider {
  name = "paystack";
  private baseUrl = "https://api.paystack.co";

  private getHeaders() {
    return {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async initialize(options: InitializePaymentOptions): Promise<InitializePaymentResult> {
    const callbackUrl =
      options.callbackUrl || `${env.APP_URL}/booking/confirmation?ref=${options.reference}`;

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        email: options.email,
        amount: options.amountPesewas, // Integer pesewas
        currency: options.currency || "GHS",
        reference: options.reference,
        callback_url: callbackUrl,
        channels: options.channels || ["card", "mobile_money"],
        metadata: options.metadata,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(`Paystack initialization failed: ${data.message || "Unknown error"}`);
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(`Paystack verification failed: ${data.message || "Unknown error"}`);
    }

    const tx = data.data;
    let mappedStatus: "success" | "failed" | "abandoned" | "pending" = "pending";
    if (tx.status === "success") mappedStatus = "success";
    else if (tx.status === "failed") mappedStatus = "failed";
    else if (tx.status === "abandoned") mappedStatus = "abandoned";

    return {
      reference: tx.reference,
      status: mappedStatus,
      amountPesewas: tx.amount,
      currency: tx.currency,
      channel: tx.channel,
      paidAt: tx.paid_at || undefined,
      gatewayResponse: tx.gateway_response,
      metadata: tx.metadata,
    };
  }

  async chargeMobileMoney(options: ChargeMobileMoneyOptions): Promise<ChargeMobileMoneyResult> {
    const payload = {
      email: options.email,
      amount: options.amountPesewas,
      currency: "GHS",
      reference: options.reference,
      mobile_money: {
        phone: options.phone,
        provider: options.provider,
      },
      metadata: options.metadata,
    };

    const res = await fetch(`${this.baseUrl}/charge`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(`Mobile money charge failed: ${data.message || "Unknown error"}`);
    }

    const tx = data.data;
    let status: ChargeMobileMoneyResult["status"] = "pending";
    if (tx.status === "success") status = "success";
    else if (tx.status === "send_otp") status = "send_otp";
    else if (tx.status === "send_pin") status = "send_pin";
    else if (tx.status === "failed") status = "failed";

    return {
      reference: tx.reference || options.reference,
      status,
      displayMessage: tx.display_text || tx.message || "Transaction initiated",
      displayText: tx.display_text,
    };
  }

  async submitOtp(options: SubmitOtpOptions): Promise<ChargeMobileMoneyResult> {
    const res = await fetch(`${this.baseUrl}/charge/submit_otp`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        otp: options.otp,
        reference: options.reference,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(`Submit OTP failed: ${data.message || "Unknown error"}`);
    }

    const tx = data.data;
    let status: ChargeMobileMoneyResult["status"] = "pending";
    if (tx.status === "success") status = "success";
    else if (tx.status === "failed") status = "failed";

    return {
      reference: options.reference,
      status,
      displayMessage: tx.display_text || tx.message || "OTP verified",
    };
  }

  async submitPin(options: SubmitPinOptions): Promise<ChargeMobileMoneyResult> {
    const res = await fetch(`${this.baseUrl}/charge/submit_pin`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        pin: options.pin,
        reference: options.reference,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(`Submit PIN failed: ${data.message || "Unknown error"}`);
    }

    const tx = data.data;
    let status: ChargeMobileMoneyResult["status"] = "pending";
    if (tx.status === "success") status = "success";
    else if (tx.status === "send_otp") status = "send_otp";
    else if (tx.status === "failed") status = "failed";

    return {
      reference: options.reference,
      status,
      displayMessage: tx.display_text || tx.message || "PIN submitted",
    };
  }

  async refund(options: RefundPaymentOptions): Promise<RefundPaymentResult> {
    const res = await fetch(`${this.baseUrl}/refund`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        transaction: options.reference,
        amount: options.amountPesewas,
        merchant_note: options.reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(`Refund failed: ${data.message || "Unknown error"}`);
    }

    return {
      refundId: String(data.data.id),
      reference: options.reference,
      amountPesewas: data.data.amount,
      status: data.data.status,
    };
  }
}

/**
 * Mock Payment Provider for Testing and Offline Development
 */
export class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  private transactions = new Map<
    string,
    {
      reference: string;
      amountPesewas: number;
      currency: string;
      status: "success" | "failed" | "abandoned" | "pending";
      channel: string;
      paidAt?: string;
      metadata?: Record<string, unknown>;
      momoStatus?: ChargeMobileMoneyResult["status"];
    }
  >();

  // Helper to pre-configure mock behavior in tests
  public setTransaction(
    reference: string,
    data: {
      amountPesewas: number;
      currency?: string;
      status?: "success" | "failed" | "abandoned" | "pending";
      channel?: string;
      metadata?: Record<string, unknown>;
      momoStatus?: ChargeMobileMoneyResult["status"];
    }
  ) {
    this.transactions.set(reference, {
      reference,
      amountPesewas: data.amountPesewas,
      currency: data.currency || "GHS",
      status: data.status || "success",
      channel: data.channel || "mobile_money",
      paidAt: data.status === "success" ? new Date().toISOString() : undefined,
      metadata: data.metadata,
      momoStatus: data.momoStatus || "success",
    });
  }

  async initialize(options: InitializePaymentOptions): Promise<InitializePaymentResult> {
    logger.info(`[MockPayment] Initialize: ${options.reference} - ${options.amountPesewas} pesewas`);
    this.setTransaction(options.reference, {
      amountPesewas: options.amountPesewas,
      currency: options.currency || "GHS",
      status: "pending",
      metadata: options.metadata,
    });

    const callbackUrl =
      options.callbackUrl || `${env.APP_URL}/booking/confirmation?ref=${options.reference}`;

    return {
      authorizationUrl: `${callbackUrl}&mock_auth=true`,
      accessCode: `mock_code_${Date.now()}`,
      reference: options.reference,
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const tx = this.transactions.get(reference);
    if (!tx) {
      // Default to auto-success in mock mode if not explicitly seeded
      return {
        reference,
        status: "success",
        amountPesewas: 35000,
        currency: "GHS",
        channel: "mobile_money",
        paidAt: new Date().toISOString(),
      };
    }

    return {
      reference: tx.reference,
      status: tx.status,
      amountPesewas: tx.amountPesewas,
      currency: tx.currency,
      channel: tx.channel,
      paidAt: tx.paidAt,
      metadata: tx.metadata,
    };
  }

  async chargeMobileMoney(options: ChargeMobileMoneyOptions): Promise<ChargeMobileMoneyResult> {
    logger.info(`[MockPayment] MoMo Charge: ${options.phone} - ${options.amountPesewas} pesewas`);
    const tx = this.transactions.get(options.reference);
    const status = tx?.momoStatus || "pending";

    this.setTransaction(options.reference, {
      amountPesewas: options.amountPesewas,
      momoStatus: status,
      status: status === "success" ? "success" : "pending",
    });

    return {
      reference: options.reference,
      status,
      displayMessage:
        status === "send_otp"
          ? "Please enter the OTP sent to your phone"
          : status === "send_pin"
          ? "Please authorize payment on your mobile money handset prompt"
          : status === "success"
          ? "Payment approved"
          : "Authorizing via mobile network...",
    };
  }

  async submitOtp(options: SubmitOtpOptions): Promise<ChargeMobileMoneyResult> {
    if (options.otp === "0000" || options.otp === "123456") {
      this.setTransaction(options.reference, {
        amountPesewas: 35000,
        status: "success",
        momoStatus: "success",
      });
      return {
        reference: options.reference,
        status: "success",
        displayMessage: "OTP accepted",
      };
    }
    return {
      reference: options.reference,
      status: "failed",
      displayMessage: "Invalid OTP",
    };
  }

  async submitPin(options: SubmitPinOptions): Promise<ChargeMobileMoneyResult> {
    if (options.pin === "0000" || options.pin === "1234") {
      this.setTransaction(options.reference, {
        amountPesewas: 35000,
        status: "success",
        momoStatus: "success",
      });
      return {
        reference: options.reference,
        status: "success",
        displayMessage: "PIN accepted, transaction approved",
      };
    }
    return {
      reference: options.reference,
      status: "failed",
      displayMessage: "Invalid PIN entered",
    };
  }

  async refund(options: RefundPaymentOptions): Promise<RefundPaymentResult> {
    return {
      refundId: `mock_rf_${Date.now()}`,
      reference: options.reference,
      amountPesewas: options.amountPesewas || 0,
      status: "processed",
    };
  }
}

// Singleton mock provider for consistent test state
const mockProviderInstance = new MockPaymentProvider();
const paystackProviderInstance = new PaystackPaymentProvider();

/**
 * Returns the active payment provider.
 * Uses MockPaymentProvider in test or development when PAYSTACK_SECRET_KEY is a test mock,
 * and PaystackPaymentProvider in live production.
 */
export function getPaymentProvider(): PaymentProvider {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.MOCK_PAYMENTS === "true" ||
    env.PAYSTACK_SECRET_KEY.includes("mock") ||
    env.PAYSTACK_SECRET_KEY.startsWith("sk_test_placeholder")
  ) {
    return mockProviderInstance;
  }
  return paystackProviderInstance;
}
