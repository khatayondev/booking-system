import { env } from "./env";
import { logger } from "./logger";

/**
 * Normalizes phone numbers to standard E.164 +233 format.
 * Examples:
 *   "0241234567" -> "+233241234567"
 *   "233241234567" -> "+233241234567"
 *   "+233 24 123 4567" -> "+233241234567"
 */
export function normalizeGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+233${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+233${digits}`;
  }
  throw new Error(`Invalid Ghana phone number format: "${phone}"`);
}

export interface SendSmsOptions {
  recipient: string;
  message: string;
  senderId?: string;
}

/**
 * Sends an SMS message to a customer via Arkesel or mNotify.
 */
export async function sendSms({ recipient, message, senderId = "BeautySalon" }: SendSmsOptions): Promise<{ success: boolean; messageId?: string }> {
  const normalizedPhone = normalizeGhanaPhone(recipient);

  // In test or non-production without real keys, log safely
  if (process.env.NODE_ENV === "test" || env.SMS_API_KEY.includes("test")) {
    logger.info(`[SMS MOCK] To: ${normalizedPhone} | Sender: ${senderId} | Text: "${message}"`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": env.SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients: [normalizedPhone.replace("+", "")],
      }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      messageId: data?.data?.id || data?.id,
    };
  } catch (err) {
    logger.error("Failed to dispatch SMS", err, { recipient: normalizedPhone });
    return { success: false };
  }
}
