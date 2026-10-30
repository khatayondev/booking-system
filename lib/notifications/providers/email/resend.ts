import { EmailProvider, EmailSendOptions, EmailSendResult } from "../../types";
import { logger } from "../../../logger";
import { getResendFromAddress } from "../../../email/resend";

export class ResendEmailProvider implements EmailProvider {
  name = "Resend";

  constructor(private apiKey: string) {}

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      const from = await getResendFromAddress(options.from);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data?.message || `Resend error: ${response.statusText}`,
          rawResponse: data,
        };
      }

      return {
        success: true,
        gatewayMessageId: data?.id || `resend_${Date.now()}`,
        rawResponse: data,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("Resend email send failure", err, { to: options.to });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
