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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate the caller
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // 2. Use service role client to look up data server-side
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request - only company_id is needed from client
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "Missing company_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify the caller is the company owner
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, name, owner_id")
      .eq("id", company_id)
      .single();

    if (companyError || !company || company.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch staff record (admin code + email) from the database
    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from("company_staff")
      .select("staff_code, full_name, user_id")
      .eq("company_id", company_id)
      .eq("user_id", userId)
      .single();

    if (staffError || !staffRecord?.staff_code) {
      return new Response(
        JSON.stringify({ error: "No admin code found for this company" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Get user email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve user email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientEmail = userData.user.email;
    const adminCode = staffRecord.staff_code;
    const fullName = staffRecord.full_name || "Admin";
    const companyName = company.name;

    // 6. Send email via Lovable email API
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
          to: recipientEmail,
          subject: `Your Admin Access Code for ${companyName}`,
          purpose: "transactional",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a1a1a; font-size: 24px;">Welcome, ${fullName}!</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Your company <strong>${companyName}</strong> has been successfully registered.
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Here is your admin access code to log in via the Staff Code login:
              </p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 4px; color: #1a1a1a; margin: 0;">
                  ${adminCode}
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
        JSON.stringify({ error: "Failed to send email" }),
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
