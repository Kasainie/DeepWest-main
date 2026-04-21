import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
  resendKey: string;
}

async function sendEmail({ to, subject, html, apiKey, resendKey }: SendArgs) {
  const resp = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: `LKTECH <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

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
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { staff_id, staff_email } = body as { staff_id?: string; staff_email?: string };

    if (!staff_id) {
      return new Response(
        JSON.stringify({ error: "Missing staff_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch staff record
    const { data: staff, error: staffErr } = await admin
      .from("company_staff")
      .select("id, company_id, full_name, staff_code, role, department")
      .eq("id", staff_id)
      .single();

    if (staffErr || !staff) {
      return new Response(
        JSON.stringify({ error: "Staff not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is owner/admin/manager of this company
    const { data: callerMember } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", staff.company_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!callerMember || !["owner", "admin", "manager"].includes(callerMember.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("id, name, slug, owner_id")
      .eq("id", staff.company_id)
      .single();

    if (!company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, unknown> = {};

    // 1) Email the staff member their access code (if email provided)
    if (staff_email) {
      const staffHtml = `
        <!DOCTYPE html>
        <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;margin:0;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <h1 style="color:#0f1b3d;margin:0 0 16px;font-size:22px;">Welcome to ${company.name}! 👋</h1>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 12px;">Hi ${staff.full_name},</p>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 16px;">
              You've been added to the team as <strong>${staff.role}</strong>${staff.department?.length ? ` (${(staff.department as string[]).join(", ")})` : ""}.
            </p>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 12px;">
              Here is your <strong>Staff Access Code</strong>. Use it to sign in via the Staff Code login:
            </p>
            <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
              <p style="font-size:28px;font-family:monospace;font-weight:bold;letter-spacing:4px;color:#0f1b3d;margin:0;">
                ${staff.staff_code}
              </p>
            </div>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
              🔗 Sign in at: <a href="https://lktech.life/${company.slug}" style="color:#0f1b3d;">lktech.life/${company.slug}</a>
            </p>
            <p style="color:#666;font-size:13px;line-height:1.5;margin:24px 0 0;">
              Keep this code safe — do not share it with anyone.
            </p>
          </div>
        </body></html>
      `;
      const r = await sendEmail({
        to: staff_email,
        subject: `Your access code for ${company.name}`,
        html: staffHtml,
        apiKey: LOVABLE_API_KEY,
        resendKey: RESEND_API_KEY,
      });
      results.staff_email = r;
      if (!r.ok) console.error("Staff email failed:", r.status, r.data);
    }

    // 2) Notify owner/admins about new staff (include the code so they have a record)
    const { data: ownerAdmins } = await admin
      .from("company_members")
      .select("user_id")
      .eq("company_id", staff.company_id)
      .in("role", ["owner", "admin"]);

    const adminEmails: string[] = [];
    for (const m of ownerAdmins ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      if (u?.user?.email) adminEmails.push(u.user.email);
    }

    const adminResults: { email: string; ok: boolean }[] = [];
    for (const email of adminEmails) {
      const adminHtml = `
        <!DOCTYPE html>
        <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;margin:0;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <h1 style="color:#0f1b3d;margin:0 0 16px;font-size:20px;">New Staff Member Added</h1>
            <p style="color:#333;line-height:1.6;font-size:15px;margin:0 0 12px;">
              A new staff member has been added to <strong>${company.name}</strong>:
            </p>
            <div style="background:#f8f9fb;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0 0 6px;font-size:14px;color:#666;">Name</p>
              <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f1b3d;">${staff.full_name}</p>
              <p style="margin:0 0 6px;font-size:14px;color:#666;">Role</p>
              <p style="margin:0 0 12px;font-size:14px;color:#0f1b3d;">${staff.role}${staff.department?.length ? ` · ${(staff.department as string[]).join(", ")}` : ""}</p>
              ${staff_email ? `<p style="margin:0 0 6px;font-size:14px;color:#666;">Email</p><p style="margin:0 0 12px;font-size:14px;color:#0f1b3d;">${staff_email}</p>` : ""}
              <p style="margin:0 0 6px;font-size:14px;color:#666;">Access Code</p>
              <p style="margin:0;font-size:18px;font-family:monospace;font-weight:bold;letter-spacing:3px;color:#0f1b3d;">${staff.staff_code}</p>
            </div>
            <p style="color:#666;font-size:12px;line-height:1.5;margin:16px 0 0;">
              Keep this code confidential. You can reset it from the Staff Management page at any time.
            </p>
          </div>
        </body></html>
      `;
      const r = await sendEmail({
        to: email,
        subject: `New staff added: ${staff.full_name}`,
        html: adminHtml,
        apiKey: LOVABLE_API_KEY,
        resendKey: RESEND_API_KEY,
      });
      adminResults.push({ email, ok: r.ok });
      if (!r.ok) console.error("Admin notify failed:", email, r.status, r.data);
    }
    results.admin_notifications = adminResults;

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-staff-code error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
