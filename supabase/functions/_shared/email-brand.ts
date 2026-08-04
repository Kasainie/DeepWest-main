// Shared branded email layout + fast Resend delivery helper.
// Used by every transactional email the platform sends.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const BRAND = {
  name: "LKTECH",
  copper: "#B87333",
  copperDark: "#8C551F",
  ink: "#1A1410",
  body: "#4A423B",
  muted: "#8A7F76",
  line: "#EDE5DC",
  canvas: "#FBF8F4",
  supportPhone: "0795872528",
  site: "https://lktech.life",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutOptions {
  /** Small label above the headline, e.g. company name */
  eyebrow?: string;
  title: string;
  /** Pre-escaped HTML body content */
  content: string;
  cta?: { label: string; url: string };
  footerNote?: string;
  preheader?: string;
}

/** Professional, email-client-safe HTML shell (tables + inline styles). */
export function renderEmail({
  eyebrow,
  title,
  content,
  cta,
  footerNote,
  preheader,
}: LayoutOptions): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader ?? title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.canvas};padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.copper},${BRAND.copperDark});background-color:${BRAND.copper};padding:26px 32px;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">${BRAND.name}</span>
            <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#F7E7D6;display:block;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Hospitality Management Suite</span>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 32px 8px 32px;">
            ${eyebrow ? `<p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.copper};">${escapeHtml(eyebrow)}</p>` : ""}
            <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:${BRAND.ink};font-weight:normal;">${escapeHtml(title)}</h1>
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.body};">${content}</div>
          </td>
        </tr>
        ${
          cta
            ? `<tr><td align="center" style="padding:8px 32px 28px 32px;">
                 <a href="${escapeHtml(cta.url)}" style="background:${BRAND.copper};color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 34px;border-radius:10px;display:inline-block;">${escapeHtml(cta.label)}</a>
                 <p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-all;">If the button doesn't work, paste this link into your browser:<br /><a href="${escapeHtml(cta.url)}" style="color:${BRAND.copperDark};">${escapeHtml(cta.url)}</a></p>
               </td></tr>`
            : ""
        }
        <tr>
          <td style="padding:0 32px 30px 32px;">
            <hr style="border:none;border-top:1px solid ${BRAND.line};margin:0 0 16px;" />
            ${footerNote ? `<p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(footerNote)}</p>` : ""}
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
              ${BRAND.name} &middot; Support ${BRAND.supportPhone} &middot; <a href="${BRAND.site}" style="color:${BRAND.copperDark};text-decoration:none;">lktech.life</a><br />
              &copy; ${year} ${BRAND.name}. This is an automated transactional message.
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

/** Highlighted code block (access codes, OTPs). */
export function codeBlock(code: string, label = "Access Code"): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr><td align="center" style="background:${BRAND.canvas};border:1px dashed ${BRAND.copper};border-radius:12px;padding:20px;">
      <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(label)}</p>
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:${BRAND.ink};">${escapeHtml(code)}</p>
    </td></tr>
  </table>`;
}

/** Simple label/value detail table. */
export function detailRows(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid ${BRAND.line};border-radius:12px;">
    ${rows
      .map(
        ([k, v], i) =>
          `<tr><td style="padding:12px 16px;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};${i ? `border-top:1px solid ${BRAND.line};` : ""}width:40%;">${escapeHtml(k)}</td><td style="padding:12px 16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.ink};font-weight:bold;${i ? `border-top:1px solid ${BRAND.line};` : ""}">${escapeHtml(v)}</td></tr>`,
      )
      .join("")}
  </table>`;
}

/** Plain-text alternative improves deliverability (fewer spam points). */
export function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|tr|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Sender address. Set the RESEND_FROM secret to a verified domain address
 * (e.g. "LKTECH <no-reply@lktech.life>") to keep mail out of spam folders.
 */
export function fromAddress(displayName?: string): string {
  const configured = Deno.env.get("RESEND_FROM");
  if (configured) return configured;
  const name = (displayName || BRAND.name).replace(/[<>"]/g, "").slice(0, 60);
  return `${name} <onboarding@resend.dev>`;
}

export interface SendResult {
  ok: boolean;
  status: number;
  data: unknown;
}

/** Sends immediately through the Resend gateway with a short timeout. */
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, status: 500, data: { error: "Email is not configured" } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: fromAddress(opts.fromName),
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: toPlainText(opts.html),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) console.error(`Resend send failed [${resp.status}]`, data);
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    console.error("Resend send error:", err instanceof Error ? err.message : err);
    return { ok: false, status: 504, data: { error: "Email delivery timed out" } };
  } finally {
    clearTimeout(timer);
  }
}

/** Fire several sends concurrently (no sequential delays). */
export function sendMailBatch(
  messages: Parameters<typeof sendMail>[0][],
): Promise<SendResult[]> {
  return Promise.all(messages.map((m) => sendMail(m)));
}
