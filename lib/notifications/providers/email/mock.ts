import { EmailProvider, EmailSendOptions, EmailSendResult } from "../../types";
import { logger } from "../../../logger";

export class MockEmailProvider implements EmailProvider {
  name = "MockEmail";

  public sentEmails: Array<EmailSendOptions & { id: string; timestamp: number }> = [];
  public shouldFailNext = false;
  public failureError = "Simulated email gateway connection timeout";

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        error: this.failureError,
      };
    }

    const id = `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.sentEmails.push({
      ...options,
      id,
      timestamp: Date.now(),
    });

    logger.info(`[EMAIL SANDBOX/MOCK] To: ${options.to} | Subject: "${options.subject}"`);

    return {
      success: true,
      gatewayMessageId: id,
      rawResponse: { status: "simulated_delivered" },
    };
  }

  clear(): void {
    this.sentEmails = [];
    this.shouldFailNext = false;
  }
}
