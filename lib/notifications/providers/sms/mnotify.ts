import { SmsProvider, SmsSendOptions, SmsSendResult } from "../../types";
import { logger } from "../../../logger";

export class MNotifySmsProvider implements SmsProvider {
  name = "mNotify";

  constructor(private apiKey: string) {}

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    try {
      const recipientPhone = options.recipient.replace(/\D/g, "");
      const url = `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(this.apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: [recipientPhone],
          sender: options.senderId || "Glamour",
          message: options.message,
          is_schedule: false,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.status === "error") {
        return {
          success: false,
          error: data?.message || `mNotify error: ${response.statusText}`,
          rawResponse: data,
        };
      }

      return {
        success: true,
        gatewayMessageId: data?.summary?.id || data?.id || `mnotify_${Date.now()}`,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("mNotify SMS send failure", err, { recipient: options.recipient });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
