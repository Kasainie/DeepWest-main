import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, admin_code, company_name, full_name } = await req.json();

    if (!email || !admin_code || !company_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!LOVABLE_API_KEY || !SUPABASE_URL) {
      console.error("Missing LOVABLE_API_KEY or SUPABASE_URL");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Lovable email API
    const projectId = SUPABASE_URL.replace("https://", "").split(".")[0];
    const emailResponse = await fetch(
      `https://api.lovable.dev/api/v1/projects/${projectId}/email/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `Your Admin Access Code for ${company_name}`,
          purpose: "transactional",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a1a; font-size: 24px;">Welcome, ${full_name || "Admin"}!</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Your company <strong>${company_name}</strong> has been successfully registered.
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Here is your admin access code to log in via the Staff Code login:
              </p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 4px; color: #1a1a1a; margin: 0;">
                  ${admin_code}
                </p>
              </div>
              <p style="color: #555; font-size: 14px; line-height: 1.6;">
                Keep this code safe. You can use it to sign in to your admin dashboard at any time.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">
                This is an automated message from LKTECH. If you did not register a company, please ignore this email.
              </p>
            </div>
          `,
        }),
      }
    );

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Email send failed:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send admin code error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
