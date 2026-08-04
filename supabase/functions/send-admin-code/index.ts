import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { renderEmail, codeBlock, escapeHtml, sendMail } from "../_shared/email-brand.ts";

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

    const html = renderEmail({
      eyebrow: companyName,
      title: `Welcome aboard, ${fullName}`,
      preheader: `Your admin access code for ${companyName}`,
      content: `
        <p style="margin:0 0 14px;">Your company <strong>${escapeHtml(companyName)}</strong> is now live on LKTECH.</p>
        <p style="margin:0 0 4px;">Use the administrator access code below to sign in from the <strong>Staff Code</strong> tab at any time.</p>
        ${codeBlock(adminCode, "Admin Access Code")}
        <p style="margin:0;">Your workspace: <a href="https://lktech.life/${escapeHtml(company.slug)}" style="color:#8C551F;">lktech.life/${escapeHtml(company.slug)}</a></p>`,
      cta: { label: "Open your dashboard", url: `https://lktech.life/${company.slug}` },
      footerNote:
        "Keep this code confidential — anyone holding it can sign in as an administrator.",
    });

    const result = await sendMail({
      to: recipientEmail,
      subject: `Your admin access code for ${companyName}`,
      html,
      fromName: companyName,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
