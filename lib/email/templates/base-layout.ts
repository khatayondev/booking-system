/**
 * Base Email Template Layout for Becca's Crown Beauty Vault.
 * Modeled directly on the proven high-deliverability template from thehoneypalaceafrica-inventory.
 * Flawless rendering across Apple Mail, Gmail, Outlook, Yahoo, and mobile clients.
 */

export interface EmailLayoutOptions {
  title: string;
  subtitle?: string;
  preheader?: string;
  badge?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  metaFields?: Array<{ label: string; value: string }>;
}

/**
 * Master Email Template matching the exact structure from thehoneypalaceafrica-inventory
 */
export function buildMasterEmailHTML({
  preheaderText = "Becca's Crown Beauty Vault Notification",
  title = "Becca's Crown Beauty Vault",
  subtitle = "Luxury styling, knotless braids, frontal melts & bridal artistry",
  bodyContent = "",
  ctaLink = null,
  ctaLabel = "View Appointment ↗",
}: {
  preheaderText?: string;
  title?: string;
  subtitle?: string;
  bodyContent?: string;
  ctaLink?: string | null;
  ctaLabel?: string;
}): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title} - Becca's Crown Beauty Vault</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; }
  @media (prefers-color-scheme: dark) {
    body, table, td, p, a, span { color-scheme: light !important; }
  }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #e9eaec; font-family:'Poppins', Helvetica, Arial, sans-serif; }

  @media screen and (max-width: 480px) {
    .email-wrapper { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
    .px-body { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-title { font-size: 20px !important; }
    .hero-pad { padding: 30px 20px 34px 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#e9eaec; font-family:'Poppins', Helvetica, Arial, sans-serif;">

  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheaderText} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e9eaec; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-wrapper" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.06);">

          <!-- Brand Logo & Header -->
          <tr>
            <td align="center" style="padding:28px 24px 20px 24px; background-color:#ffffff; border-bottom:1px solid #f3f4f6;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="display:inline-block; font-size:15px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:#141006; font-family:'Poppins', sans-serif;">
                      BECCA&apos;S CROWN <span style="color:#d4af37;">• BEAUTY VAULT</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dark Hero Title Section -->
          <tr>
            <td class="hero-pad" style="background-color:#141006; padding:36px 32px 40px 32px;" align="center">
              <p class="hero-title" style="color:#ffffff; font-size:24px; font-weight:800; margin:0 0 10px 0; font-family:'Poppins', sans-serif; line-height:1.3;">
                ${title}
              </p>
              ${
                subtitle
                  ? `
              <p style="color:#a9b0ac; font-size:13px; line-height:1.6; margin:0 auto; max-width:420px; font-family:'Poppins', sans-serif;">
                ${subtitle}
              </p>
              `
                  : ""
              }
            </td>
          </tr>

          <!-- White Body Section -->
          <tr>
            <td class="px-body" style="padding:32px 32px 16px 32px; background-color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:14px; color:#333333; line-height:1.7; font-family:'Poppins', Helvetica, Arial, sans-serif;">
                    ${bodyContent}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button (optional) -->
          ${
            ctaLink
              ? `
          <tr>
            <td align="center" style="padding:16px 28px 36px 28px; background-color:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="background-color:#141006; border-radius:50px;">
                    <a href="${ctaLink}" style="display:block; padding:14px 28px; color:#ffffff; font-size:13px; font-weight:700; text-decoration:none; text-transform:uppercase; letter-spacing:1px; font-family:'Poppins', sans-serif;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 28px 28px; background-color:#f9fafb; border-top:1px solid #eceeef; text-align:center;">
              <p style="font-size:12px; font-weight:700; color:#374151; margin:0 0 4px 0; font-family:'Poppins', sans-serif;">
                Becca&apos;s Crown Beauty Vault • Ghana
              </p>
              <p style="font-size:11px; color:#9ca3af; margin:0 0 6px 0; font-family:'Poppins', sans-serif;">
                Luxury Braids &bull; Frontal Installations &bull; Lash Artistry &bull; Bridal Glam
              </p>
              <p style="font-size:11px; color:#9ca3af; margin:0 0 12px 0; font-family:'Poppins', sans-serif;">
                Web: <a href="https://booking-system-nu-lemon.vercel.app" style="color:#d4af37; text-decoration:none; font-weight:600;">booking-system-nu-lemon.vercel.app</a>
              </p>
              <p style="font-size:10px; color:#c1c5cb; margin:0; font-family:'Poppins', sans-serif;">
                &copy; ${currentYear} Becca&apos;s Crown Beauty Vault Ltd. All rights reserved.
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

/**
 * Standard typed luxury wrapper implementing the clean thehoneypalace layout
 */
export function wrapLuxuryEmailHtml(options: EmailLayoutOptions): string {
  const {
    title,
    subtitle,
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; background-color: #ffffff; border-top: 1px dashed #d1d5db; border-bottom: 1px dashed #d1d5db; border-left: none; border-right: none;">
      ${metaFields
        .map(
          (field, idx) => `
        <tr style="border-bottom: ${idx < metaFields.length - 1 ? "1px solid #f3f4f6" : "none"};">
          <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; width: 44%; font-family: 'Poppins', sans-serif;">
            ${field.label}
          </td>
          <td style="padding: 12px 0; font-size: 13px; font-weight: 700; color: ${field.label.toLowerCase().includes("balance") || field.label.toLowerCase().includes("paid") ? "#16a34a" : "#111827"}; text-align: right; font-family: 'Poppins', sans-serif;">
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
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 8px 0;">
      <tr>
        <td align="center" style="background-color: #141006; border-radius: 50px;">
          <a href="${ctaUrl}" style="display: block; padding: 14px 28px; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; font-family: 'Poppins', sans-serif;">
            ${ctaText}
          </a>
        </td>
      </tr>
      ${
        secondaryCtaText && secondaryCtaUrl
          ? `
      <tr>
        <td align="center" style="padding-top: 12px;">
          <a href="${secondaryCtaUrl}" style="color: #6b7280; font-size: 12px; text-decoration: underline; font-family: 'Poppins', sans-serif;">
            ${secondaryCtaText}
          </a>
        </td>
      </tr>
      `
          : ""
      }
    </table>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title} - Becca's Crown Beauty Vault</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; }
  @media (prefers-color-scheme: dark) {
    body, table, td, p, a, span { color-scheme: light !important; }
  }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #e9eaec; font-family:'Poppins', Helvetica, Arial, sans-serif; }

  @media screen and (max-width: 480px) {
    .email-wrapper { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
    .px-body { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-title { font-size: 20px !important; }
    .hero-pad { padding: 30px 20px 34px 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#e9eaec; font-family:'Poppins', Helvetica, Arial, sans-serif;">

  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e9eaec; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-wrapper" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.06);">

          <!-- Brand Logo & Header -->
          <tr>
            <td align="center" style="padding:28px 24px 20px 24px; background-color:#ffffff; border-bottom:1px solid #f3f4f6;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="display:inline-block; font-size:15px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:#141006; font-family:'Poppins', sans-serif;">
                      BECCA&apos;S CROWN <span style="color:#d4af37;">• BEAUTY VAULT</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dark Hero Section -->
          <tr>
            <td class="hero-pad" style="background-color:#141006; padding:36px 32px 40px 32px;" align="center">
              ${
                badge
                  ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td style="padding:4px 14px; border-radius:50px; background-color:rgba(212,175,55,0.18); border:1px solid #d4af37; color:#f0c040; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; font-family:'Poppins', sans-serif;">
                    ${badge}
                  </td>
                </tr>
              </table>
              `
                  : ""
              }
              <p class="hero-title" style="color:#ffffff; font-size:24px; font-weight:800; margin:0 0 10px 0; font-family:'Poppins', sans-serif; line-height:1.3;">
                ${title}
              </p>
              ${
                subtitle
                  ? `
              <p style="color:#a9b0ac; font-size:13px; line-height:1.6; margin:0 auto; max-width:420px; font-family:'Poppins', sans-serif;">
                ${subtitle}
              </p>
              `
                  : ""
              }
            </td>
          </tr>

          <!-- White Body Section -->
          <tr>
            <td class="px-body" style="padding:32px 32px 16px 32px; background-color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:14px; color:#374151; line-height:1.7; font-family:'Poppins', Helvetica, Arial, sans-serif;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
              ${metaHtml}
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 28px 28px; background-color:#f9fafb; border-top:1px solid #eceeef; text-align:center;">
              <p style="font-size:12px; font-weight:700; color:#374151; margin:0 0 4px 0; font-family:'Poppins', sans-serif;">
                Becca&apos;s Crown Beauty Vault • Ghana
              </p>
              <p style="font-size:11px; color:#9ca3af; margin:0 0 6px 0; font-family:'Poppins', sans-serif;">
                Luxury Braids &bull; Frontal Installations &bull; Lash Artistry &bull; Bridal Glam
              </p>
              <p style="font-size:11px; color:#9ca3af; margin:0 0 12px 0; font-family:'Poppins', sans-serif;">
                Web: <a href="https://booking-system-nu-lemon.vercel.app" style="color:#d4af37; text-decoration:none; font-weight:600;">booking-system-nu-lemon.vercel.app</a>
              </p>
              <p style="font-size:10px; color:#c1c5cb; margin:0; font-family:'Poppins', sans-serif;">
                &copy; ${currentYear} Becca&apos;s Crown Beauty Vault Ltd. All rights reserved.
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
