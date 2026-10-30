/**
 * Base Luxury Email Template Layout for Becca's Crown Beauty Vault.
 * Designed to render flawlessly across Gmail, Apple Mail, Outlook, and mobile clients.
 */

export interface EmailLayoutOptions {
  title: string;
  preheader?: string;
  badge?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  metaFields?: Array<{ label: string; value: string }>;
}

export function wrapLuxuryEmailHtml(options: EmailLayoutOptions): string {
  const {
    title,
    preheader = "Your luxury appointment at Becca's Crown Beauty Vault",
    badge,
    bodyHtml,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
    metaFields = [],
  } = options;

  const currentYear = new Date().getFullYear();

  const metaHtml =
    metaFields.length > 0
      ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; overflow: hidden;">
      ${metaFields
        .map(
          (field, idx) => `
        <tr style="border-bottom: ${idx < metaFields.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none"};">
          <td style="padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #A1A1AA; font-weight: 600; width: 40%;">
            ${field.label}
          </td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-align: right;">
            ${field.value}
          </td>
        </tr>
      `
        )
        .join("")}
    </table>
  `
      : "";

  const ctaHtml =
    ctaText && ctaUrl
      ? `
    <div style="margin: 28px 0 12px 0; text-align: center;">
      <a href="${ctaUrl}" style="background-color: #F59E0B; background-image: linear-gradient(135deg, #FBBF24 0%, #D97706 100%); color: #09090B; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; padding: 14px 32px; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
        ${ctaText}
      </a>
      ${
        secondaryCtaText && secondaryCtaUrl
          ? `
        <div style="margin-top: 14px;">
          <a href="${secondaryCtaUrl}" style="color: #A1A1AA; font-size: 12px; text-decoration: underline;">
            ${secondaryCtaText}
          </a>
        </div>
      `
          : ""
      }
    </div>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #050505; color: #E4E4E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; }
    a { color: #F59E0B; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 12px !important; }
      .card { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #050505;">
  <!-- Hidden Preheader -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width: 600px; max-width: 600px; margin: 0 auto;">
          <!-- Top Brand Header Capsule -->
          <tr>
            <td align="center" style="padding: 24px 0 20px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color: #18181B; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 9999px; padding: 8px 20px;">
                <tr>
                  <td style="font-size: 16px; padding-right: 8px;">👑</td>
                  <td style="font-size: 12px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    BECCA&apos;S CROWN <span style="color: #F59E0B; font-weight: 700; margin-left: 4px;">• BEAUTY VAULT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Frosted Glass Card -->
          <tr>
            <td>
              <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="background-color: #121214; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
                ${
                  badge
                    ? `
                  <tr>
                    <td>
                      <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #FBBF24; margin-bottom: 16px;">
                        ${badge}
                      </span>
                    </td>
                  </tr>
                `
                    : ""
                }
                <tr>
                  <td style="font-size: 24px; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; line-height: 1.25; padding-bottom: 12px;">
                    ${title}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: #D4D4D8;">
                    ${bodyHtml}
                  </td>
                </tr>
                ${
                  metaHtml
                    ? `
                  <tr>
                    <td>${metaHtml}</td>
                  </tr>
                `
                    : ""
                }
                ${
                  ctaHtml
                    ? `
                  <tr>
                    <td>${ctaHtml}</td>
                  </tr>
                `
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Luxury Footer -->
          <tr>
            <td align="center" style="padding: 28px 16px 16px 16px; font-size: 11px; line-height: 1.6; color: #71717A; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #A1A1AA; font-weight: 600;">
                Becca&apos;s Crown Beauty Vault • Ghana
              </p>
              <p style="margin: 0 0 10px 0;">
                Signature Braids • High-Fashion Frontals • Volume Lashes • Bridal Glam
              </p>
              <p style="margin: 0; color: #52525B; font-size: 10px;">
                © ${currentYear} Becca&apos;s Crown. All rights reserved. Please do not reply directly to this automated email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

