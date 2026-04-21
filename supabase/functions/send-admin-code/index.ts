import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "Missing company_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is the company owner
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, name, owner_id, slug")
      .eq("id", company_id)
      .single();

    if (companyError || !company || company.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch admin staff record
    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from("company_staff")
      .select("staff_code, full_name")
      .eq("company_id", company_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (staffError || !staffRecord?.staff_code) {
      return new Response(
        JSON.stringify({ error: "No admin code found for this company" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientEmail = user.email;
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve user email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminCode = staffRecord.staff_code;
    const fullName = staffRecord.full_name || "Admin";
    const companyName = company.name;

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;margin:0;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <h1 style="color:#0f1b3d;margin:0 0 16px;font-size:22px;">Welcome, ${fullName}! 🎉</h1>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 12px;">
              Your company <strong>${companyName}</strong> has been successfully registered on LKTECH.
            </p>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 16px;">
              Here is your <strong>Admin Access Code</strong>. Use it to sign in via the Staff Code login at any time:
            </p>
            <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
              <p style="font-size:28px;font-family:monospace;font-weight:bold;letter-spacing:4px;color:#0f1b3d;margin:0;">
                ${adminCode}
              </p>
            </div>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
              🔗 Your dashboard: <a href="https://lktech.life/${company.slug}" style="color:#0f1b3d;">lktech.life/${company.slug}</a>
            </p>
            <p style="color:#666;font-size:13px;line-height:1.5;margin:24px 0 0;">
              Keep this code safe and confidential. Anyone with this code can sign in as an administrator.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#999;font-size:12px;margin:0;">
              This is an automated message from LKTECH. If you did not register a company, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `LKTECH <onboarding@resend.dev>`,
        to: [recipientEmail],
        subject: `Your Admin Access Code for ${companyName}`,
        html,
      }),
    });

    const data = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("Resend error:", emailResponse.status, data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-admin-code error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
