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
    const recipients: { email: string; name: string }[] = [];
    for (const uid of userIds) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) {
        recipients.push({
          email: u.user.email,
          name:
            (u.user.user_metadata?.full_name as string) ||
            u.user.email.split("@")[0],
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

    for (const r of recipients) {
      const html = `
        <!DOCTYPE html>
        <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;margin:0;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <h1 style="color:#0f1b3d;margin:0 0 16px;font-size:22px;">New Company Registered 🎉</h1>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 12px;">Hi ${r.name},</p>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 16px;">
              A new company has just been registered on the platform:
            </p>
            <div style="background:#f8f9fb;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0 0 6px;font-size:14px;color:#666;">Company</p>
              <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#0f1b3d;">${company.name}</p>
              ${company.email ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">📧 ${company.email}</p>` : ""}
              ${company.phone ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">📞 ${company.phone}</p>` : ""}
              <p style="margin:8px 0 0;font-size:13px;color:#555;">🔗 lktech.life/${company.slug}</p>
            </div>
            <p style="color:#666;font-size:13px;line-height:1.5;margin:24px 0 0;">
              You're receiving this because you're an administrator on the platform.
            </p>
          </div>
        </body></html>
      `;

      try {
        const resp = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: `LKTECH <onboarding@resend.dev>`,
            to: [r.email],
            subject: `New company registered: ${company.name}`,
            html,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          console.error("Resend failed for", r.email, resp.status, data);
          results.push({
            email: r.email,
            ok: false,
            error: JSON.stringify(data),
          });
        } else {
          results.push({ email: r.email, ok: true });
        }
      } catch (e) {
        results.push({
          email: r.email,
          ok: false,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }

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
