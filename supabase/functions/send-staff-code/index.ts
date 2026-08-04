import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  renderEmail,
  codeBlock,
  detailRows,
  escapeHtml,
  sendMail,
} from "../_shared/email-brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Server configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { staff_id, staff_email } = (await req.json()) as {
      staff_id?: string;
      staff_email?: string;
    };
    if (!staff_id) return json({ error: "Missing staff_id" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: staff } = await admin
      .from("company_staff")
      .select("id, company_id, full_name, staff_code, role, department")
      .eq("id", staff_id)
      .single();
    if (!staff) return json({ error: "Staff not found" }, 404);

    // Caller must manage this company
    const { data: callerMember } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", staff.company_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!callerMember || !["owner", "admin", "manager"].includes(callerMember.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: company } = await admin
      .from("companies")
      .select("id, name, slug, owner_id")
      .eq("id", staff.company_id)
      .single();
    if (!company) return json({ error: "Company not found" }, 404);

    const departments = Array.isArray(staff.department)
      ? (staff.department as string[]).join(", ")
      : "";
    const workspaceUrl = `https://lktech.life/${company.slug}`;

    // Resolve owner/admin recipients in parallel with building the staff email
    const { data: ownerAdmins } = await admin
      .from("company_members")
      .select("user_id")
      .eq("company_id", staff.company_id)
      .in("role", ["owner", "admin"]);

    const adminEmails = (
      await Promise.all(
        (ownerAdmins ?? []).map(async (m) => {
          const { data: u } = await admin.auth.admin.getUserById(m.user_id);
          return u?.user?.email ?? null;
        }),
      )
    ).filter((e): e is string => !!e);

    const messages: Parameters<typeof sendMail>[0][] = [];

    if (staff_email) {
      messages.push({
        to: staff_email,
        subject: `Your access code for ${company.name}`,
        fromName: company.name,
        html: renderEmail({
          eyebrow: company.name,
          title: `Welcome to the team, ${staff.full_name}`,
          preheader: `Your staff access code for ${company.name}`,
          content: `
            <p style="margin:0 0 14px;">You've been added to <strong>${escapeHtml(company.name)}</strong> as <strong>${escapeHtml(staff.role)}</strong>${departments ? ` &middot; ${escapeHtml(departments)}` : ""}.</p>
            <p style="margin:0 0 4px;">Sign in from the <strong>Staff Code</strong> tab using the code below.</p>
            ${codeBlock(staff.staff_code, "Staff Access Code")}`,
          cta: { label: "Sign in to your workspace", url: workspaceUrl },
          footerNote: "Keep this code private — it identifies you when signing in.",
        }),
      });
    }

    for (const email of adminEmails) {
      messages.push({
        to: email,
        subject: `New staff member added: ${staff.full_name}`,
        fromName: company.name,
        html: renderEmail({
          eyebrow: company.name,
          title: "A new staff member was added",
          preheader: `${staff.full_name} was added to ${company.name}`,
          content: `
            <p style="margin:0 0 6px;">The following team member now has access to <strong>${escapeHtml(company.name)}</strong>.</p>
            ${detailRows([
              ["Name", staff.full_name],
              ["Role", staff.role + (departments ? ` · ${departments}` : "")],
              ...(staff_email ? ([["Email", staff_email]] as Array<[string, string]>) : []),
              ["Access code", staff.staff_code],
            ])}`,
          cta: { label: "Manage staff", url: `${workspaceUrl}/staff` },
          footerNote:
            "Access codes can be reset at any time from the Staff Management page.",
        }),
      });
    }

    // All emails leave at the same time — no sequential delays.
    const results = await Promise.all(messages.map((m) => sendMail(m)));

    return json({
      success: true,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  } catch (err) {
    console.error("send-staff-code error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
