import { SmsProvider, SmsSendOptions, SmsSendResult } from "../../types";
import { logger } from "../../../logger";

export class ArkeselSmsProvider implements SmsProvider {
  name = "Arkesel";

  constructor(private apiKey: string) {}

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    try {
      const recipientPhone = options.recipient.replace(/\D/g, "");
      const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: options.senderId || "Glamour",
          message: options.message,
          recipients: [recipientPhone],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data?.message || `Arkesel API error: ${response.statusText}`,
          rawResponse: data,
        };
      }

      return {
        success: true,
        gatewayMessageId: data?.data?.id || data?.id || `arkesel_${Date.now()}`,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("Arkesel SMS send failure", err, { recipient: options.recipient });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
