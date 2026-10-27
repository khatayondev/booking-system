import { DepositRefundPolicy } from "../settings-types";

export interface RefundCalculationParams {
  startUtc: Date;
  now?: Date;
  cancellationNoticeHours: number;
  depositRefundPolicy: DepositRefundPolicy;
  depositRequiredPesewas: number;
  amountPaidPesewas: number;
  totalPesewas: number;
}

export interface RefundCalculationResult {
  isBeforeCutoff: boolean;
  hoursRemaining: number;
  policyApplied: DepositRefundPolicy;
  depositPaidPesewas: number;
  depositRefundPesewas: number;
  depositForfeitedPesewas: number;
  prepaymentRefundPesewas: number;
  totalRefundPesewas: number;
  cancellationNoticeHours: number;
  explanation: string;
}

/**
 * Pure function: Calculates refund amount when a customer cancels an appointment.
 * Respects business settings for cancellationNoticeHours (e.g. 24h) and depositRefundPolicy.
 * 
 * Rules:
 * 1. If appointment is before cutoff (hoursRemaining >= cancellationNoticeHours):
 *    - FULL_REFUND_BEFORE_CUTOFF: 100% of deposit paid refunded + 100% of excess prepayment refunded.
 *    - PARTIAL_50: 50% of deposit paid refunded + 100% of excess prepayment refunded.
 *    - NON_REFUNDABLE: 0% of deposit refunded + 100% of excess prepayment refunded.
 * 2. If appointment is inside cutoff (hoursRemaining < cancellationNoticeHours):
 *    - Deposit is forfeited (0% refund).
 *    - Prepayment beyond the deposit amount is refunded.
 * 3. Total refund never exceeds total amountPaidPesewas.
 */
export function calculateCancellationRefund(params: RefundCalculationParams): RefundCalculationResult {
  const {
    startUtc,
    now = new Date(),
    cancellationNoticeHours,
    depositRefundPolicy,
    depositRequiredPesewas,
    amountPaidPesewas,
  } = params;

  if (amountPaidPesewas <= 0) {
    return {
      isBeforeCutoff: true,
      hoursRemaining: 0,
      policyApplied: depositRefundPolicy,
      depositPaidPesewas: 0,
      depositRefundPesewas: 0,
      depositForfeitedPesewas: 0,
      prepaymentRefundPesewas: 0,
      totalRefundPesewas: 0,
      cancellationNoticeHours,
      explanation: "No payments recorded for this booking. Refund amount is GH₵ 0.00.",
    };
  }

  const msRemaining = startUtc.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, msRemaining / (1000 * 60 * 60));
  const isBeforeCutoff = hoursRemaining >= cancellationNoticeHours;

  // Portion of paid amount that represents the deposit
  const depositPaidPesewas = Math.min(amountPaidPesewas, depositRequiredPesewas);
  // Any prepayment beyond the deposit (e.g. customer paid full balance upfront)
  const prepaymentBeyondDeposit = Math.max(0, amountPaidPesewas - depositPaidPesewas);

  let depositRefundPesewas = 0;

  if (isBeforeCutoff) {
    switch (depositRefundPolicy) {
      case "FULL_REFUND_BEFORE_CUTOFF":
        depositRefundPesewas = depositPaidPesewas;
        break;
      case "PARTIAL_50":
        depositRefundPesewas = Math.floor(depositPaidPesewas * 0.5);
        break;
      case "NON_REFUNDABLE":
        depositRefundPesewas = 0;
        break;
      default:
        depositRefundPesewas = depositPaidPesewas;
        break;
    }
  } else {
    // Inside cutoff: deposit is strictly forfeited
    depositRefundPesewas = 0;
  }

  const depositForfeitedPesewas = Math.max(0, depositPaidPesewas - depositRefundPesewas);
  const prepaymentRefundPesewas = prepaymentBeyondDeposit;
  const totalRefundPesewas = Math.min(
    amountPaidPesewas,
    depositRefundPesewas + prepaymentRefundPesewas
  );

  let explanation = "";
  if (isBeforeCutoff) {
    if (depositRefundPolicy === "FULL_REFUND_BEFORE_CUTOFF") {
      explanation = `Eligible for 100% refund as cancellation is more than ${cancellationNoticeHours} hours before appointment.`;
    } else if (depositRefundPolicy === "PARTIAL_50") {
      explanation = `Eligible for 50% deposit refund plus full prepayment refund under the studio's partial refund policy.`;
    } else {
      explanation = `Deposits are non-refundable under studio policy. Any prepayment beyond the deposit will be refunded.`;
    }
  } else {
    explanation = `Late cancellation inside the ${cancellationNoticeHours}-hour notice window. The deposit has been forfeited; any prepayment beyond the deposit is refunded.`;
  }

  return {
    isBeforeCutoff,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    policyApplied: depositRefundPolicy,
    depositPaidPesewas,
    depositRefundPesewas,
    depositForfeitedPesewas,
    prepaymentRefundPesewas,
    totalRefundPesewas,
    cancellationNoticeHours,
    explanation,
  };
}

/**
 * Checks whether an appointment can be rescheduled under current policy notice hours.
 */
export function canReschedule(params: {
  startUtc: Date;
  now?: Date;
  cancellationNoticeHours?: number;
}): { allowed: boolean; reason?: string } {
  const { startUtc, now = new Date(), cancellationNoticeHours = 24 } = params;
  const msRemaining = startUtc.getTime() - now.getTime();

  if (msRemaining <= 0) {
    return {
      allowed: false,
      reason: "Past appointments cannot be rescheduled.",
    };
  }

  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  if (hoursRemaining < cancellationNoticeHours) {
    return {
      allowed: false,
      reason: `Rescheduling requires at least ${cancellationNoticeHours} hours advance notice. Please contact the studio directly at +233 24 111 2233.`,
    };
  }

  return { allowed: true };
}
