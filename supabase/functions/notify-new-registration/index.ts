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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email keys not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller owns this company
    const { data: company } = await admin
      .from("companies")
      .select("id, name, owner_id, slug, email, phone")
      .eq("id", company_id)
      .single();

    // Fetch admin code for the owner (so we can include it in their email)
    const { data: ownerStaff } = await admin
      .from("company_staff")
      .select("staff_code")
      .eq("company_id", company_id)
      .eq("user_id", company?.owner_id)
      .maybeSingle();
    const adminCode = ownerStaff?.staff_code as string | undefined;

    if (!company || company.owner_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect recipient emails:
    // 1) The new company's owner + admins
    const { data: members } = await admin
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", company_id)
      .in("role", ["owner", "admin"]);

    // 2) Platform super admins (user_roles table)
    const { data: superAdmins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const userIds = new Set<string>();
    members?.forEach((m) => userIds.add(m.user_id));
    superAdmins?.forEach((s) => userIds.add(s.user_id));

    // Resolve emails via auth.admin
    const recipients: { email: string; name: string; userId: string }[] = [];
    for (const uid of userIds) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) {
        recipients.push({
          email: u.user.email,
          name:
            (u.user.user_metadata?.full_name as string) ||
            u.user.email.split("@")[0],
          userId: uid,
        });
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, note: "No recipients" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: { email: string; ok: boolean; error?: string }[] = [];

    const ownerUserId = company.owner_id;

    const messages = recipients.map((r) => {
      const isOwner = r.userId === ownerUserId;
      const showCode = isOwner && adminCode;
      const details: Array<[string, string]> = [["Company", company.name]];
      if (company.email) details.push(["Email", company.email]);
      if (company.phone) details.push(["Phone", company.phone]);
      details.push(["Workspace", `lktech.life/${company.slug}`]);

      const html = renderEmail({
        eyebrow: isOwner ? "Registration complete" : "Platform notification",
        title: isOwner
          ? `${company.name} is live on LKTECH`
          : `New company registered: ${company.name}`,
        preheader: isOwner
          ? "Your workspace is ready — here's everything you need to get started."
          : `${company.name} just joined the platform.`,
        content: `
          <p style="margin:0 0 10px;">Hi ${escapeHtml(r.name)},</p>
          <p style="margin:0 0 6px;">${isOwner ? "Your company has been successfully registered on LKTECH." : "A new company has just been registered on the platform."}</p>
          ${detailRows(details)}
          ${showCode ? `<p style="margin:16px 0 0;">Use the administrator access code below to sign in from the <strong>Staff Code</strong> tab.</p>${codeBlock(adminCode!, "Admin Access Code")}` : ""}`,
        cta: {
          label: isOwner ? "Open your dashboard" : "Review in Super Admin",
          url: isOwner ? `https://lktech.life/${company.slug}` : "https://lktech.life/super-admin",
        },
        footerNote: isOwner
          ? "Keep your admin code confidential — anyone holding it can sign in as an administrator."
          : "You're receiving this because you administer the LKTECH platform.",
      });

      return {
        to: r.email,
        subject: isOwner
          ? `Welcome to LKTECH — ${company.name} is live`
          : `New company registered: ${company.name}`,
        html,
        fromName: isOwner ? company.name : "LKTECH",
      };
    });

    // Send everything concurrently so no recipient waits behind another.
    const sendResults = await Promise.all(messages.map((m) => sendMail(m)));
    const results = sendResults.map((res, i) => ({
      email: messages[i].to,
      ok: res.ok,
    }));


    return new Response(
      JSON.stringify({
        success: true,
        sent: results.filter((r) => r.ok).length,
        total: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("notify-new-registration error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
