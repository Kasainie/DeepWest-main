import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "kochjomboz04@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifySuper(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  if (user.email !== SUPER_ADMIN_EMAIL) throw new Error("Forbidden");
  return createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = await verifySuper(req);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Toggle pause
    if (req.method === "POST" && action === "toggle_pause") {
      const { company_id, is_paused } = await req.json();
      const { error } = await admin
        .from("companies")
        .update({ is_paused })
        .eq("id", company_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: list all data
    const [companiesRes, staffRes, membersRes] = await Promise.all([
      admin.from("companies").select("*").order("created_at", { ascending: false }),
      admin.from("company_staff").select("*").order("created_at", { ascending: false }),
      admin.from("company_members").select("*"),
    ]);

    // Fetch owner emails via auth admin API
    const ownerIds = [...new Set((companiesRes.data || []).map((c: any) => c.owner_id))];
    const ownerEmails: Record<string, string> = {};
    for (const ownerId of ownerIds) {
      try {
        const { data } = await admin.auth.admin.getUserById(ownerId);
        if (data?.user?.email) ownerEmails[ownerId] = data.user.email;
      } catch (_) { /* skip */ }
    }

    return new Response(
      JSON.stringify({
        companies: companiesRes.data || [],
        staff: staffRes.data || [],
        members: membersRes.data || [],
        ownerEmails,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
