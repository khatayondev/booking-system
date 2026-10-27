import { SmsProvider, SmsSendOptions, SmsSendResult } from "../../types";
import { logger } from "../../../logger";

export class MockSmsProvider implements SmsProvider {
  name = "MockSMS";

  public sentMessages: Array<SmsSendOptions & { id: string; timestamp: number }> = [];
  public shouldFailNext = false;
  public failureError = "Simulated SMS gateway network timeout";

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        error: this.failureError,
      };
    }

    const id = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.sentMessages.push({
      ...options,
      id,
      timestamp: Date.now(),
    });

    logger.info(`[SMS SANDBOX/MOCK] To: ${options.recipient} | Sender: ${options.senderId || "Glamour"} | Message: "${options.message}"`);

    return {
      success: true,
      gatewayMessageId: id,
      rawResponse: { status: "simulated_delivered" },
    };
  }

  clear(): void {
    this.sentMessages = [];
    this.shouldFailNext = false;
  }
}
