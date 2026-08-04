import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, sendMail, escapeHtml, BRAND } from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*lktech\.life$/i,
  /^http:\/\/localhost:\d+$/,
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { email, origin } = await req.json();

    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return json({ error: "A valid email address is required" }, 400);
    }
    const safeOrigin =
      typeof origin === "string" && ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))
        ? origin
        : BRAND.site;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${safeOrigin}/reset-password` },
    });

    // Never reveal whether the account exists.
    if (error || !data?.properties?.action_link) {
      console.log("recovery link not generated:", error?.message);
      return json({ success: true });
    }

    const link = data.properties.action_link;
    const html = renderEmail({
      eyebrow: "Account security",
      title: "Reset your password",
      preheader: "Use the secure link below to choose a new password. It expires in 60 minutes.",
      content: `
        <p style="margin:0 0 14px;">We received a request to reset the password for <strong>${escapeHtml(email)}</strong>.</p>
        <p style="margin:0 0 14px;">Click the button below to choose a new password. For your security this link can only be used once and expires in <strong>60 minutes</strong>.</p>`,
      cta: { label: "Set a new password", url: link },
      footerNote:
        "If you didn't request a password reset, you can safely ignore this email — your password will stay the same.",
    });

    const result = await sendMail({
      to: email.trim(),
      subject: "Reset your LKTECH password",
      html,
      fromName: "LKTECH Security",
    });

    if (!result.ok) {
      return json({ success: false, error: "Could not send the reset email right now" }, 502);
    }
    return json({ success: true });
  } catch (err) {
    console.error("send-password-reset error:", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
