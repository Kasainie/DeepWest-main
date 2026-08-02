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
    const { staff_id, new_staff_code } = await req.json();

    if (!staff_id || !new_staff_code || typeof new_staff_code !== "string" || new_staff_code.length < 3) {
      return new Response(
        JSON.stringify({ error: "Invalid parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is authenticated and has admin/owner role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the calling user
    const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the staff record
    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from("company_staff")
      .select("id, company_id, user_id, full_name")
      .eq("id", staff_id)
      .single();

    if (staffError || !staffRecord) {
      return new Response(
        JSON.stringify({ error: "Staff member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller has admin/owner role in the same company
    const { data: callerRole } = await supabaseAdmin.rpc("get_company_role", {
      _user_id: caller.id,
      _company_id: staffRecord.company_id,
    });

    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the staff code in company_staff
    const { error: updateError } = await supabaseAdmin
      .from("company_staff")
      .update({ staff_code: new_staff_code.trim().toUpperCase() })
      .eq("id", staff_id);

    if (updateError) {
      if (updateError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Staff code already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to update staff code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If the staff member has a linked auth user, update their password too
    if (staffRecord.user_id) {
      // Cryptographically random password — never derivable from the staff code
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const newPassword = Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
        staffRecord.user_id,
        { password: newPassword }
      );

      if (pwError) {
        console.error("Failed to update auth password:", pwError);
        // Still return success since the code was updated — they can re-login to recreate
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_staff_code: new_staff_code.trim().toUpperCase(),
        full_name: staffRecord.full_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reset staff access error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
