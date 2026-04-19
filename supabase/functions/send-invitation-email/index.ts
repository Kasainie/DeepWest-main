import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, role, companyName, inviteLink, inviterName } = body;

    if (!email || !inviteLink || !companyName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:24px; margin:0;">
          <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <h1 style="color:#0f1b3d; margin:0 0 16px; font-size:22px;">You're invited to join ${companyName}</h1>
            <p style="color:#333; line-height:1.6; font-size:15px; margin:0 0 12px;">
              ${inviterName ? `${inviterName} has invited you` : "You've been invited"} to join <strong>${companyName}</strong> as a <strong>${role}</strong>.
            </p>
            <p style="color:#333; line-height:1.6; font-size:15px; margin:0 0 24px;">
              Click the button below to accept your invitation and create your account.
            </p>
            <div style="text-align:center; margin:28px 0;">
              <a href="${inviteLink}" style="background:#0f1b3d; color:#ffffff; padding:14px 28px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color:#666; font-size:13px; line-height:1.5; margin:24px 0 0;">
              Or copy and paste this link into your browser:<br>
              <a href="${inviteLink}" style="color:#0f1b3d; word-break:break-all;">${inviteLink}</a>
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
        to: [email],
        subject: `You're invited to join ${companyName}`,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Resend error:", response.status, data);
      throw new Error(
        `Resend API failed [${response.status}]: ${JSON.stringify(data)}`,
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-invitation-email error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
