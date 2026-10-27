import { SmsEstimate, TemplateVariables } from "./types";

/**
 * Standard GSM 03.38 7-bit character set (basic and extended).
 */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#$%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const GSM_EXTENDED = "^{}\\[~]|€";

/**
 * Checks if a string contains only characters from the GSM-7 character set.
 */
export function isGsm7(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!GSM_BASIC.includes(char) && !GSM_EXTENDED.includes(char)) {
      return false;
    }
  }
  return true;
}

/**
 * Estimates SMS length, encoding (GSM-7 vs Unicode), segment count, and cost in pesewas.
 *
 * Rules:
 * GSM-7:
 * - Single segment: up to 160 characters
 * - Multi-segment: 153 characters per segment
 * - Extended chars (^{}\[~]|€) count as 2 chars in GSM-7
 *
 * Unicode (UCS-2):
 * - Single segment: up to 70 characters
 * - Multi-segment: 67 characters per segment
 *
 * Cost:
 * - Standard Ghana SMS aggregator rate: ~4.5 to 5 pesewas per segment.
 *   Stored in integer pesewas (Math.ceil(segmentCount * 4.5)).
 */
export function estimateSms(text: string): SmsEstimate {
  if (!text || text.length === 0) {
    return {
      characterCount: 0,
      encoding: "GSM-7",
      segmentCount: 0,
      costEstimatePesewas: 0,
    };
  }

  const gsm = isGsm7(text);

  if (gsm) {
    // Count effective GSM length (extended chars count as 2)
    let effectiveLength = 0;
    for (let i = 0; i < text.length; i++) {
      if (GSM_EXTENDED.includes(text[i])) {
        effectiveLength += 2;
      } else {
        effectiveLength += 1;
      }
    }

    let segmentCount = 1;
    if (effectiveLength > 160) {
      segmentCount = Math.ceil(effectiveLength / 153);
    }

    const costEstimatePesewas = Math.ceil(segmentCount * 4.5);

    return {
      characterCount: effectiveLength,
      encoding: "GSM-7",
      segmentCount,
      costEstimatePesewas,
    };
  } else {
    // Unicode
    const charCount = Array.from(text).length; // Handle multi-byte unicode code points correctly
    let segmentCount = 1;
    if (charCount > 70) {
      segmentCount = Math.ceil(charCount / 67);
    }

    const costEstimatePesewas = Math.ceil(segmentCount * 4.5);

    return {
      characterCount: charCount,
      encoding: "UNICODE",
      segmentCount,
      costEstimatePesewas,
    };
  }
}

/**
 * Replaces variables in a template string, e.g. {{name}} or {{ manageLink }}.
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const val = variables[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return "";
  });
}
