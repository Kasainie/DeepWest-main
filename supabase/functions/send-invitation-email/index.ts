import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*lktech\.life$/i,
  /^http:\/\/localhost:\d+$/,
];

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { invitation_token, origin } = await req.json();

    if (!invitation_token || typeof invitation_token !== "string") {
      return json({ error: "Missing invitation token" }, 400);
    }
    if (typeof origin !== "string" || !isAllowedOrigin(origin)) {
      return json({ error: "Invalid origin" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Everything shown in the email comes from the database, never the client
    const { data: invitation } = await supabaseAdmin
      .from("company_invitations")
      .select("id, company_id, email, role, token, status")
      .eq("token", invitation_token)
      .maybeSingle();

    if (!invitation || invitation.status !== "pending") {
      return json({ error: "Invitation not found" }, 404);
    }

    // Caller must be an owner/admin/manager of the invitation's company
    const { data: callerRole } = await supabaseAdmin.rpc("get_company_role", {
      _user_id: user.id,
      _company_id: invitation.company_id,
    });
    if (!callerRole || !["owner", "admin", "manager"].includes(callerRole)) {
      return json({ error: "Insufficient permissions" }, 403);
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", invitation.company_id)
      .single();

    const companyName = company?.name ?? "Your company";
    const inviteLink = `${origin}/accept-invite?token=${invitation.token}`;
    const escape = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safeCompany = escape(companyName);
    const safeRole = escape(invitation.role);
    const safeLink = escape(inviteLink);

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:24px; margin:0;">
          <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <h1 style="color:#0f1b3d; margin:0 0 16px; font-size:22px;">You're invited to join ${safeCompany}</h1>
            <p style="color:#333; line-height:1.6; font-size:15px; margin:0 0 12px;">
              You've been invited to join <strong>${safeCompany}</strong> as a <strong>${safeRole}</strong>.
            </p>
            <div style="text-align:center; margin:28px 0;">
              <a href="${safeLink}" style="background:#0f1b3d; color:#ffffff; padding:14px 28px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color:#666; font-size:13px; line-height:1.5; margin:24px 0 0;">
              Or copy and paste this link into your browser:<br>
              <a href="${safeLink}" style="color:#0f1b3d; word-break:break-all;">${safeLink}</a>
            </p>
            <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
            <p style="color:#999; font-size:12px; margin:0;">
              This invitation will expire in 7 days. If you weren't expecting this email, you can safely ignore it.
            </p>
          </div>
        </body>
      </html>
    `;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [invitation.email],
        subject: `You're invited to join ${companyName}`,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Resend error:", response.status, data);
      return json({ success: false, error: "Failed to send invitation email" }, 502);
    }

    return json({ success: true });
  } catch (error: unknown) {
    console.error("send-invitation-email error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
