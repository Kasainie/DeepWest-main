import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderEmail, escapeHtml, sendMail } from "../_shared/email-brand.ts";

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

    const html = renderEmail({
      eyebrow: companyName,
      title: `You've been invited to join ${companyName}`,
      preheader: `Accept your ${invitation.role} invitation to ${companyName}.`,
      content: `
        <p style="margin:0 0 14px;">You've been invited to join <strong>${escapeHtml(companyName)}</strong> on LKTECH as a <strong>${escapeHtml(invitation.role)}</strong>.</p>
        <p style="margin:0 0 14px;">Accept the invitation to set up your account and get access to the tools your team uses every day.</p>`,
      cta: { label: "Accept invitation", url: inviteLink },
      footerNote:
        "This invitation expires in 7 days. If you weren't expecting it, you can safely ignore this email.",
    });

    const result = await sendMail({
      to: invitation.email,
      subject: `You're invited to join ${companyName}`,
      html,
      fromName: companyName,
    });

    if (!result.ok) {
      return json({ success: false, error: "Failed to send invitation email" }, 502);
    }


    return json({ success: true });
  } catch (error: unknown) {
    console.error("send-invitation-email error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
